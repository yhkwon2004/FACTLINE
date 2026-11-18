# 설치·학습·운영

[제품·화면·구조](README.md) · [데이터](ai/data/README.md) · [학습 기록](ai/training/README.md)

## 이 PC

Start-EUMLOG.cmd는 로컬 앱, Start-EUMLOG-Cloud.cmd는 공개 Vercel 웹의 분석기를 실행합니다. 분석 PC가 켜져 있어야 새 자료를 처리합니다. .env.local과 .data에는 비밀키·개인 자료가 있으므로 공개하지 마세요.

## 새 Windows PC

Node 22 이상, Python 3.12와 충분한 디스크가 필요합니다. 검증 장비는 RTX 3080 10GB입니다. CPU도 가능하지만 처리 제한 시간 내 완료 여부는 별도 확인해야 합니다.

~~~powershell
npm ci
python -m venv .venv
.venv\Scripts\python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
.venv\Scripts\python.exe -m pip install -r ai/requirements.txt
node scripts/init-local.mjs
.venv\Scripts\python.exe -c "from transformers import AutoTokenizer,AutoModelForCausalLM; AutoTokenizer.from_pretrained('Qwen/Qwen3-0.6B',cache_dir='ai/models/cache'); AutoModelForCausalLM.from_pretrained('Qwen/Qwen3-0.6B',cache_dir='ai/models/cache')"
.venv\Scripts\python.exe -c "from transformers import AutoTokenizer,AutoModel; AutoTokenizer.from_pretrained('intfloat/multilingual-e5-small',cache_dir='ai/models/cache'); AutoModel.from_pretrained('intfloat/multilingual-e5-small',cache_dir='ai/models/cache')"
.venv\Scripts\python.exe -c "import easyocr; easyocr.Reader(['ko','en'],gpu=False,model_storage_directory='ai/models/ocr')"
.venv\Scripts\python.exe ai/install_speech.py
npm run build
npm run start
~~~

작은 자체 가중치와 인덱스는 저장소의 것을 사용할 수 있습니다. 큰 기본 모델 캐시는 처음 내려받아야 합니다. model-revisions.json과 requirements-lock.txt는 검증 환경의 버전 기록이며 다른 장비의 재학습 결과·해시는 달라질 수 있습니다.

## 직접 재학습

공개 원문 스냅샷과 합성 감독 데이터는 ai/data에 있습니다. prepare.py는 초기 코퍼스를 교체하므로 전체 재구축 때만 순서대로 사용합니다.

~~~powershell
.venv\Scripts\python.exe ai/prepare.py
.venv\Scripts\python.exe ai/update_knowledge.py
npm run ai:train
npm run ai:semantic
npm run ai:relations
npm run ai:index
~~~

LoRA만 갱신하려면 **node scripts/python.mjs train.py --llm-only**를 실행합니다. 정확한 152개 prompt/answer와 실제 step loss·설정·해시를 ai/training에 저장합니다. 관계 유형은 **npm run ai:relations**로 학습합니다. 학습 후 ai/models/metrics.json을 ai/training/baseline-metrics.json에 복사하고 웹을 재빌드하세요. Python 분석기도 재시작해야 새 가중치를 읽습니다.

ai:index는 추가 공식 판결을 다운로드하고 법령의 조문 단위 인덱스를 만듭니다. 검색 인덱스 구축은 LLM 가중치 학습이 아닙니다. 법령 갱신 후 인덱스도 재구축하고 시행일·부칙을 검토하세요.

## 환경 변수

| 이름 | 용도 |
|---|---|
| FACTLINE_STORAGE_MODE | local 또는 blob |
| JWT_SECRET | 예측 불가능한 32자 이상 세션 서명 키 |
| ENCRYPTION_KEY | 암호화 키, 기존 자료와 함께 안전하게 별도 백업 |
| BLOB_READ_WRITE_TOKEN | 서버 전용 비공개 Blob 자격 증명 |
| AI_WORKER_TOKEN | 웹·PC 브리지 공유 인증, 서버 전용 |
| GOOGLE_CLIENT_ID | 나중에 추가할 Google 웹 Client ID |
| PASSWORD_LOGIN_ENABLED | 기본 true, Google 연결 확인 후에만 false |
| LOCAL_PYTHON | 선택적인 Python 실행 경로 |

키를 잃으면 암호화 자료를 복구할 수 없습니다. 기존 키를 새 값으로 덮어쓰지 마세요. Vercel 환경을 내려받을 때도 기존 .env.local과 다른 경로를 사용하세요.

## Vercel

Python 모델은 Vercel 함수에 포함하지 않습니다. 웹 빌드에는 공개 학습 지표 JSON만 포함합니다. 원본과 상태는 비공개 Blob에 암호화됩니다. 브라우저 대용량 업로드는 사용자·사건 소유권으로 제한한 임시 경로를 거쳐 암호화됩니다.

~~~powershell
vercel link
vercel env ls
vercel --prod
~~~

새 프로젝트는 비공개 Blob과 서버 변수를 먼저 준비합니다. PC 분석기는 Cloudflare 공식 실행 파일과 인증된 브리지를 사용합니다. configure-cloud.mjs는 이 PC의 무시된 설정과 특정 Vercel 범위를 사용하므로 새 계정에서 그대로 실행하지 마세요.

## 검증

~~~powershell
npm run lint
npm test
npm run ai:check-relations
npm run ai:check-audio
.venv\Scripts\python.exe ai/legal_review.py
npm run ai:check
npm run check:local
node scripts/check-voice.mjs
~~~

공개 웹은 APP_URL을 배포 주소로 지정하고 CHECK_CLOUD=1로 검사합니다. HTTP 검사는 합성 example.test 임시 계정을 만들고 finally에서 삭제합니다.

## 현재 한계

- 20MB / 녹음 20분. PDF 본문 80쪽·스캔 12쪽. 추출 본문 6만 자·최대 90개 후보·화면 형태소 600개.
- 화자 분리·실시간 통화 수집 없음. 녹음 상대 시간은 재생 위치이며 발생 시각이 아닙니다. 기준일은 사용자가 선택합니다.
- 관계도는 최근 12개 원본·최대 36개 연결을 구성합니다. 모바일은 한 번에 8개를 표시하고 인물 필터·목록으로 나머지를 봅니다.
- 관계 유형·방향·이름 추출은 오류가 가능합니다. 이름 일치가 동일 인물의 증명이 아닙니다.
- 법률 확인 목록은 금전·신체·위협에 한정한 규칙입니다. 판례는 선별 4건입니다.
- 작업 상태·lease를 저장하고 열린 화면의 polling으로 재개합니다. 상시 큐·24시간 GPU가 아닙니다.
- 로컬 JSON은 단일 웹 프로세스용입니다. Blob JSON은 ETag 조건부 갱신으로 충돌을 재시도하지만 전체 상태를 읽고 쓰는 소규모 구성입니다. 상용 다중 사용자 운영에는 DB·큐가 필요합니다.
- 별도 침투·대규모 부하·실제 사건·미성년자 상담 평가는 수행하지 않았습니다. Google 실제 로그인은 Client ID 추가 후 확인해야 합니다.
