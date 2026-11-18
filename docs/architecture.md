# 현재 아키텍처

제품 흐름·배포 구성·ER 도식은 [루트 README](../README.md#시스템과-데이터-흐름)를 기준으로 확인합니다.

- src/app: 인증된 웹 화면·API, Next.js after 기반 작업 실행과 화면 polling.
- src/application: 원본·사건·일상 기록·보고서의 사용 흐름.
- src/domain: 엔티티·근거 관계 구성·모바일 그래프 배치.
- src/infrastructure: 로컬/Blob 암호화 보관, 로컬/원격 Python 작업자, Google/JWT 검증.
- src/presentation: 모바일 입력, 인물 관계도, 원문 재생, 실제 학습 화면.
- ai: 공개 감독 데이터·공식 원문·Kiwi/E5/Ridge/Whisper/Qwen LoRA·학습/검사 스크립트.

현재 배포는 PostgreSQL이 아닌 암호화 Blob JSON 상태를 사용합니다. Prisma 어댑터와 스키마는 별도 DB 전환용이며 이번 배포의 검증 대상은 아닙니다. 원본 전체를 암호화해 보관하고 실제 추출·분석합니다. 단순 mock URL이나 메타데이터 전용 분석이 아닙니다.
