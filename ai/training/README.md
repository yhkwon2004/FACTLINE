# 실제 학습 실행 자료

앱의 **내 AI** 화면과 루트 README는 실제 실행 로그를 사용합니다. 예시로 그린 가짜 학습 화면이나 생성된 성능 그래프가 아닙니다.

| 파일 | 담긴 증거 |
|---|---|
| latest-run.json | 관계 분류 실제 시작 시각·처리 단계·학습/평가 개수·혼동행렬·데이터/가중치 SHA-256 |
| lora-run.json | Qwen LoRA 실제 152 step loss·소요 시간·설정·샘플/어댑터 SHA-256 |
| lora-samples.json | 이번 LoRA 실행의 정확한 prompt/answer 152쌍 |
| baseline-metrics.json | 사건 유형 학습 360 / 평가 120, LoRA 최종 측정치, 검색 구간 수 |
| audio-check.json | 합성 한국어 녹음의 실제 Whisper 전사·구간 위치, M4A/WebM/WAV 검사 |
| ../../docs/screenshots/training-current.jpg | 앱에서 촬영한 학습 정보 화면 |

## 관계 분류

2026-11-18 실행. 973개 합성 문장을 중복 제거하고 816개 학습·157개 평가로 나눴습니다. E5 인코더는 고정하고 Ridge 헤드를 학습했습니다. 일치율 88.54%, Macro F1 0.883. **신체 유형 재현율 50%, 금전 유형 정밀도 66.7%**의 오류를 혼동행렬에 그대로 공개합니다.

Ridge는 반복 epoch 학습 곡선을 생성하지 않습니다. 데이터 준비·fit·평가의 실제 단계 시간을 보여줍니다. 분류 상대 점수는 보정된 신뢰 확률이 아닙니다.

## LoRA

Qwen3-0.6B, rank 8, alpha 16, dropout 0.05, q_proj/v_proj, AdamW 3e-5, seed 42, 입력 최대 512 tokens. 72개 구조화 + 48개 질문 + 32개 공식 원문 맥락을 한 번씩 최적화합니다. 기본 모델 전체를 처음부터 학습하지 않습니다.

실제 step loss는 입력 난도에 따라 오르내립니다. 최종 지표의 finalMeanTrainingLoss는 **마지막 20 step 평균**입니다. 학습 loss 감소는 생성 답변·법적 판단 정확도를 입증하지 않습니다. 별도의 실제 사건 LLM 정확도 평가를 수행하지 않았습니다.

## 재실행과 비교

~~~powershell
npm run ai:relations
node scripts/python.mjs train.py --llm-only
npm run ai:check-relations
npm run ai:check-audio
~~~

재실행은 해당 로그와 학습 가중치를 갱신합니다. 비교가 필요하면 실행 전 이전 로그를 별도 버전으로 보관하세요. 장비·라이브러리·원문 코퍼스가 바뀌면 수치와 해시도 달라집니다. 첨부 샘플·설정·버전과 함께 검토해야 합니다.
