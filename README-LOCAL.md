# 설치·운영

[시연](https://eumlog-evidence.vercel.app/demo) · [제품과 개인정보 흐름](README.md) · [재학습](ai/training/README.md)

## 새 PC에서 시연 화면 열기

Node 22 이상을 설치한 뒤 저장소 루트에서 실행합니다. 빌드는 브라우저 음성·OCR·PDF용 Worker와 WebAssembly 파일을 준비합니다. 공개 시연은 버전 관리된 합성 원문을 읽으므로 Python이나 Google 계정 없이 관계도와 타임라인을 열 수 있습니다.

```powershell
npm ci
node scripts/init-local.mjs
npm run build
npm run start
```

브라우저에서 [로컬 시연](http://localhost:3000/demo)을 엽니다. 암호화 보관함은 HTTPS 또는 localhost가 필요합니다. 브라우저 데이터를 지우거나 암호를 잃으면 복원하기 어려우므로 원본과 암호화 백업을 별도 보관하세요.

## 익명 본문을 분석할 PC 준비하기

구성된 Windows PC에서는 `Start-EUMLOG.cmd`로 로컬 앱을, `Start-EUMLOG-Cloud.cmd`로 공개 웹의 분석기를 시작합니다. 새 PC에서는 Python 3.12, 환경과 호환되는 PyTorch, 공개 기본 모델 파일이 필요합니다. 아래 CUDA 설치 예시는 기존 RTX 3080 10GB 환경 기준입니다.

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
.venv\Scripts\python.exe -m pip install -r ai/requirements.txt
.venv\Scripts\python.exe -c "from transformers import AutoTokenizer,AutoModelForCausalLM; m='Qwen/Qwen3-0.6B'; o={'cache_dir':'ai/models/cache'}; AutoTokenizer.from_pretrained(m,**o); AutoModelForCausalLM.from_pretrained(m,**o)"
.venv\Scripts\python.exe -c "from transformers import AutoTokenizer,AutoModel; m='intfloat/multilingual-e5-small'; o={'cache_dir':'ai/models/cache'}; AutoTokenizer.from_pretrained(m,**o); AutoModel.from_pretrained(m,**o)"
node scripts/python.mjs download_dialogue.py
```

비공개 원본의 음성 인식과 OCR은 브라우저가 실행합니다. 최초 모델 다운로드에는 인터넷과 기기의 여유 공간이 필요합니다. 음성 모델 용량은 tiny 약 50MB, small 약 250MB이고 실행용 파일이 추가됩니다. Python 과거 음성 검사까지 재현할 경우 `node scripts/python.mjs install_speech.py`로 별도의 Whisper 캐시를 준비하세요.

## 계정·Vercel 설정

| 변수 | 사용처 |
|---|---|
| `GOOGLE_CLIENT_ID` | Google 웹 OAuth 클라이언트의 공개 Client ID. JavaScript 원본에 로컬·배포 주소를 각각 등록합니다. GIS ID 토큰 방식에는 Client Secret이 필요하지 않습니다. |
| `PASSWORD_LOGIN_ENABLED` | 기본 true. 기존 비밀번호 계정을 연결하고 Google 로그인을 확인한 뒤 false로 바꿀 수 있습니다. |
| `JWT_SECRET`, `ENCRYPTION_KEY` | 서버 전용 32자 이상의 장기 키. 기존 값이 있는 배포에서는 보존하고 별도 백업합니다. |
| `ACCOUNT_HASH_KEY` | 선택적 계정 검색용 장기 키. 없으면 ENCRYPTION_KEY, 다음으로 JWT_SECRET을 사용합니다. 프로필 생성 후 이 값을 임의 교체하면 가명 계정과의 대응을 잃습니다. |
| `FACTLINE_STORAGE_MODE`, `BLOB_READ_WRITE_TOKEN` | 계정·운영 상태 및 구버전 사본용 local 또는 private Blob. 토큰은 서버에서만 사용합니다. |
| `AI_WORKER_TOKEN`, `LOCAL_PYTHON` | 웹·분석 PC의 브리지 자격 증명, 로컬 가상환경 경로 재지정. |
| `PRIVACY_MODE` | 기본값은 기기 보관. 이전 동작을 활성화하는 `legacy`는 원본을 기기에만 보관해야 하는 배포에 설정하지 않습니다. |

```powershell
vercel link
vercel env ls
vercel --prod
```

Vercel 함수에는 Python 가중치를 넣지 않습니다. 새 익명 본문 분석에는 접근 제한된 연결 PC가 필요합니다. 기존 환경의 `.env.local`이나 운영 키는 덮어쓰지 마세요. 제공된 인증 설정 예시에는 실키가 없습니다. [Google ID 토큰 검증](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)

## 검사

웹 서버를 실행한 상태에서 같은 로컬 환경 설정으로 아래 명령을 실행합니다. HTTP 검사는 자체 생성한 임시 합성 계정만 사용합니다. 신규 익명 자료 처리와 구버전 원본 업로드 검사는 서로 다른 저장 정책을 전제로 합니다. 구버전의 `check:local`, `check-voice`, `check-diagram` HTTP 업로드 경로는 기본 기기 보관 모드에서 차단됩니다.

```powershell
npm run lint
npm test
npm run ai:check-relations
npm run ai:check-training
node scripts/python.mjs timeline.py
node --env-file=.env.local --import tsx scripts/check-private.mjs
```

공개 환경에서는 `APP_URL`에 배포 주소를 주고 `node --import tsx scripts/check-private.mjs`를 실행합니다. 이 옵션은 구버전 로컬 파일을 직접 만드는 검사를 건너뜁니다. 실제 개인 Google 계정 선택과 동의는 별도로 확인해야 합니다.

## 저장·분석 한도

파일당 20MB, 녹음 20분, PDF 80쪽·스캔 12쪽입니다. 추출 본문은 대략 6만 자까지이며 익명 분석 요청은 본문 2만 자, 질문 1천 자까지 받습니다. 관계 후보는 첫 90문장 범위에서 추출합니다. 자동 관계도는 최근 자료 12개·관계 36개를 대상으로 그립니다. 기기 전체 백업은 암호화 JSON 100MB까지입니다. 브라우저 공간·코덱·성능은 기기마다 다릅니다. 워커가 중단되면 모델 분석을 다시 요청해야 합니다. 서버 지속 큐, 상시 GPU, 여러 기기 간 자동 원본 복제는 제공하지 않습니다.
