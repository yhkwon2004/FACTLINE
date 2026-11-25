param([switch] $CreateUploadKey)
$ErrorActionPreference='Stop'
$androidRoot=$PSScriptRoot
$keyDir=Join-Path $env:LOCALAPPDATA 'Eumlog\signing'
$keyFile=Join-Path $keyDir 'upload.p12'
$pwFile=Join-Path $keyDir 'password.dpapi'
$previousKey=$env:EUMLOG_KEYSTORE
$previousPassword=$env:EUMLOG_STORE_PASSWORD
Push-Location $androidRoot
try {
    if (!$env:JAVA_HOME) { throw 'Set JAVA_HOME to JDK 17 or 21.' }
    $keytool=Join-Path $env:JAVA_HOME 'bin\keytool.exe'
    if (!$env:EUMLOG_KEYSTORE) {
        if ($CreateUploadKey) {
            if ((Test-Path $keyFile) -or (Test-Path $pwFile)) { throw 'Existing signing material found. Omit -CreateUploadKey to reuse it.' }
            New-Item -Path $keyDir -ItemType Directory -Force | Out-Null
            # DPAPI binds the secret to this Windows user and machine.
            $random=New-Object byte[] 32
            $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
            try { $rng.GetBytes($random) } finally { $rng.Dispose() }
            $env:EUMLOG_STORE_PASSWORD=[Convert]::ToBase64String($random)
            $encrypted=ConvertTo-SecureString $env:EUMLOG_STORE_PASSWORD -AsPlainText -Force | ConvertFrom-SecureString
            [IO.File]::WriteAllText($pwFile,$encrypted)
            & $keytool -genkeypair -keystore $keyFile -storetype PKCS12 -alias upload -storepass:env EUMLOG_STORE_PASSWORD -keypass:env EUMLOG_STORE_PASSWORD -keyalg RSA -keysize 3072 -sigalg SHA256withRSA -validity 10000 -dname 'CN=Eumlog Upload'
            if ($LASTEXITCODE -ne 0) { throw 'Upload key generation failed. Inspect the signing directory before retrying.' }
        } else {
            if (!(Test-Path $keyFile) -or !(Test-Path $pwFile)) { throw 'Provide an upload key or explicitly run -CreateUploadKey on the first build.' }
            $secure=ConvertTo-SecureString ([IO.File]::ReadAllText($pwFile))
            $env:EUMLOG_STORE_PASSWORD=([Net.NetworkCredential]::new('',$secure)).Password
        }
        $env:EUMLOG_KEYSTORE=$keyFile
    }
    if (!$env:EUMLOG_STORE_PASSWORD) { throw 'Missing EUMLOG_STORE_PASSWORD.' }
    & .\gradlew.bat bundleRelease --no-daemon --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'Release bundle build failed.' }
    $bundles=@(Get-ChildItem build/outputs/bundle/release -Filter '*.aab' -File)
    if ($bundles.Count -ne 1) { throw 'Expected a single release bundle.' }
    $bundle=$bundles[0]
    & (Join-Path $env:JAVA_HOME 'bin\jarsigner.exe') -verify $bundle.FullName
    if ($LASTEXITCODE -ne 0) { throw 'AAB signature verification failed.' }
    $alias=if ($env:EUMLOG_KEY_ALIAS) { $env:EUMLOG_KEY_ALIAS } else { 'upload' }
    $expected=(& $keytool -exportcert -rfc -keystore $env:EUMLOG_KEYSTORE -storepass:env EUMLOG_STORE_PASSWORD -alias $alias) -join ''
    if ($LASTEXITCODE -ne 0 -or !$expected.Contains('-----BEGIN CERTIFICATE-----')) { throw 'Cannot read upload certificate.' }
    $actual=(& $keytool -printcert -jarfile $bundle.FullName -rfc) -join ''
    if ($LASTEXITCODE -ne 0 -or !$actual.Contains($expected)) { throw 'AAB signing certificate does not match the upload key.' }
    Write-Output $bundle.FullName
} finally {
    $env:EUMLOG_KEYSTORE=$previousKey
    $env:EUMLOG_STORE_PASSWORD=$previousPassword
    Pop-Location
}
