param(
    [Parameter(Mandatory=$true)][string] $Bundletool,
    [string] $Bundle = (Join-Path $PSScriptRoot 'build\outputs\bundle\release\Eumlog-release.aab'),
    [switch] $VerifySite
)
$ErrorActionPreference='Stop'
if (!(Test-Path $Bundle) -or !(Test-Path $Bundletool) -or !$env:JAVA_HOME) { throw 'Provide JAVA_HOME, a release AAB and bundletool-all-1.18.3.jar.' }
if ((Get-FileHash $Bundletool).Hash -ne 'A099CFA1543F55593BC2ED16A70A7C67FE54B1747BB7301F37FDFD6D91028E29') { throw 'Unexpected bundletool digest.' }
$java=Join-Path $env:JAVA_HOME 'bin\java.exe'
& $java -jar $Bundletool validate "--bundle=$Bundle" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Invalid bundle.' }
[xml]$manifest=(& $java -jar $Bundletool dump manifest "--bundle=$Bundle") -join [Environment]::NewLine
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect the manifest.' }
$namespace='http://schemas.android.com/apk/res/android'
$manageSpace=$manifest.manifest.application.GetAttribute('manageSpaceActivity',$namespace)
if (!$manageSpace -or $manageSpace -notin @($manifest.manifest.application.activity | ForEach-Object { $_.GetAttribute('name',$namespace) })) { throw 'Missing browser site-settings activity. The launcher would exit at startup.' }
$package='io.github.yhkwon2004.eumlog'
$sdk=$manifest.manifest.'uses-sdk'
if ($manifest.manifest.package -ne $package -or [int]$sdk.GetAttribute('targetSdkVersion',$namespace) -lt 36) { throw 'Wrong application id or target SDK.' }
$permissions=@($manifest.manifest.'uses-permission' | ForEach-Object { $_.GetAttribute('name',$namespace) })
foreach ($permission in $permissions) {
    if ($permission -notin @('android.permission.INTERNET',"$package.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION")) { throw "Unexpected native permission: $permission" }
}
$keytool=Join-Path $env:JAVA_HOME 'bin\keytool.exe'
$pem=(& $keytool -printcert -jarfile $Bundle -rfc) -join ''
if ($LASTEXITCODE -ne 0 -or $pem -notmatch '-----BEGIN CERTIFICATE-----(?<der>[A-Za-z0-9+/=\s]+)-----END CERTIFICATE-----') { throw 'Missing signing certificate.' }
$sha=[Security.Cryptography.SHA256]::Create()
try { $fingerprint=([BitConverter]::ToString($sha.ComputeHash([Convert]::FromBase64String($Matches.der)))).Replace('-',':') } finally { $sha.Dispose() }
$linksPath=Join-Path $PSScriptRoot '..\public\.well-known\assetlinks.json'
$links=(Get-Content -LiteralPath $linksPath -Raw | ConvertFrom-Json)
function Confirm-Links($entries) {
    $matching=@($entries | Where-Object { $_.target.package_name -eq $package -and $_.target.namespace -eq 'android_app' -and $_.relation -contains 'delegate_permission/common.handle_all_urls' -and $_.target.sha256_cert_fingerprints -contains $fingerprint })
    if (!$matching.Count) { throw 'Asset Links do not identify this signed bundle.' }
}
Confirm-Links $links
if ($VerifySite) {
    $origin='https://eumlog-evidence.vercel.app'
    $response=Invoke-WebRequest "$origin/.well-known/assetlinks.json" -MaximumRedirection 0 -UseBasicParsing
    if ($response.StatusCode -ne 200 -or ($response.Headers['Content-Type'] -join '') -notmatch 'application/json') { throw 'Digital Asset Links response is not JSON.' }
    Confirm-Links ($response.Content | ConvertFrom-Json)
    foreach ($route in '/privacy','/account-deletion') {
        $response=Invoke-WebRequest ($origin+$route) -MaximumRedirection 0 -UseBasicParsing
        if ($response.StatusCode -ne 200) { throw "Unavailable public page: $route" }
    }
}
[PSCustomObject]@{package=$package;version=$manifest.manifest.GetAttribute('versionName',$namespace);minSdk=$sdk.GetAttribute('minSdkVersion',$namespace);targetSdk=$sdk.GetAttribute('targetSdkVersion',$namespace);aabSha256=(Get-FileHash $Bundle).Hash;certificate=$fingerprint;siteChecked=[bool]$VerifySite}
