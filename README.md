# FACTLINE

FACTLINE은 평소에는 다이어리처럼 일상과 대화를 기록하고, 문제가 생겼을 때 흩어진 기록과 증거를 시간순 사실관계로 정리하도록 돕는 모바일 우선 웹 애플리케이션입니다.

핵심 원칙은 다음과 같습니다.

> AI does not judge. AI organizes facts.

FACTLINE은 법률 자문, 유무죄 판단, 죄명 결론, 법적 결과 예측을 제공하지 않습니다. 사용자가 제공한 기록, 대화 원문, 증거 메타데이터만 구조화합니다.

## 무엇을 할 수 있나요?

- 매일 다이어리처럼 생활 기록, 일정, 불편했던 일, 기억할 사람과 장소를 남길 수 있습니다.
- 카카오톡 내보내기 텍스트, 이메일, 문자, 인스타그램 등 외부 기록을 동의 기반으로 가져오는 구조를 제공합니다.
- 이름, 사람, 사건, 날짜, 키워드 여러 개로 일상 기록과 증거물을 검색하고 연결할 수 있습니다.
- 사건이 생기면 기존 다이어리와 증거물을 골라 시간순 블록으로 정리합니다.
- AI가 답변 내용에 따라 금액, 반복성, 제3자, 대화 매체, 원본 자료, 시점/장소 등 부족한 부분을 한 번에 하나씩 질문합니다.
- 업로드 증거는 파일 원문을 AI로 보내지 않고 이름, 설명, SHA-256 해시, 연결 이벤트 중심으로 관리합니다.
- 실제 기록과 증거만 사용해 진술서 초안과 상담 준비 보고서를 생성합니다.
- 법령/판례 검색은 참고자료로만 표시하며 판단이나 대응 조언을 하지 않습니다.

## 화면

### 진입 화면

![FACTLINE 진입 화면](docs/screenshots/landing.png)

처음 방문한 사용자는 FACTLINE을 일상 기록 앱으로 이해하고, 로그인 또는 회원가입으로 작업공간에 들어갑니다.

### 기록 허브

![기록 허브](docs/screenshots/dashboard.png)

대시보드는 오늘 다이어리, 대화 가져오기, 문제 정리 시작을 한 화면에서 보여줍니다. 일상 기록 수, 가져온 메시지 수, 증거 연결 수, 최근 사건 정리를 함께 확인합니다.

### 라이프 다이어리

![라이프 다이어리](docs/screenshots/life-diary.png)

일상, 일정, 생활 사건, 불편/갈등 기록을 캘린더 색상으로 구분합니다. 현재 시각 입력, 대략적인 시간, 위치 참조, 관련 사람, 태그를 함께 저장할 수 있습니다.

### 기억 연동

![기억 연동](docs/screenshots/integrations.png)

카카오톡 내보내기 텍스트를 우선 지원하고, Gmail, Outlook, SMS, Instagram, 수동 입력은 동의 기반 커넥터 구조로 확장할 수 있게 설계했습니다. 가져온 메시지는 날짜, 참여자, 방향, 내용 기준으로 검색됩니다.

### 셀프 기록

![셀프 기록](docs/screenshots/self-record.png)

사건 안에서는 다이어리와 증거물을 자료 보드에서 선택해 셀프 기록에 이어 씁니다. AI 연관성순과 날짜순을 전환하며, 선택한 자료를 기반으로 다음 질문을 생성합니다.

## 유스케이스 흐름도

```mermaid
flowchart TD
  A["평소 생활 기록"] --> B["라이프 다이어리 저장"]
  C["카카오톡/이메일/문자/인스타 자료"] --> D["동의 기반 가져오기"]
  D --> E["메시지·자료 검색"]
  B --> E
  E --> F["문제 발생 시 관련 기록 선택"]
  F --> G["새 정리 시작"]
  G --> H["셀프 기록 챗봇"]
  H --> I["시간순 타임라인"]
  H --> J["누락·위험 표현·모순 점검"]
  I --> K["진술서 초안/상담 준비 보고서"]
  J --> K
  K --> L["전문가 상담 준비"]
```

```mermaid
sequenceDiagram
  actor User as 사용자
  participant Diary as 라이프 다이어리
  participant Import as 기억 연동
  participant Case as 사건 정리
  participant AI as AI 질문 엔진
  participant Report as 보고서 생성

  User->>Diary: 일상/일정/불편 기록 저장
  User->>Import: 카카오톡 내보내기 텍스트 가져오기
  Import-->>Case: 날짜·참여자·문구 메타데이터 제공
  User->>Case: 관련 다이어리와 증거 선택
  Case->>AI: 사용자가 제공한 사실만 전달
  AI-->>User: 부족한 정보 한 가지 질문
  User->>Case: 추가 셀프 기록 작성
  Case->>Report: 실제 기록과 증거만 취합
  Report-->>User: 진술서 초안 및 상담 준비 자료
```

## 데이터 구조

| 데이터 | 용도 | 주요 필드 |
| --- | --- | --- |
| User | 계정 분리와 세션 인증 | email, name, passwordHash |
| Case | 문제 발생 시 묶는 정리 단위 | title, type, description, status, isLocked |
| LifeRecord | 평소 다이어리 기록 | type, title, content, occurredAt, location, people, tags |
| ConnectedSource | 동의한 외부 출처 | provider, displayName, consentScopes, lastSyncedAt |
| MemoryRecord | 가져온 대화/자료 원문 단위 | provider, participantName, direction, content, occurredAt |
| IncidentEvent | 셀프 기록에서 만든 행위 단위 | rawStatement, description, datetime, actor, action, damage |
| Evidence | 업로드/가져온 증거 메타데이터 | name, type, description, fileHash, fileUrl |
| AnalysisResult | 누락·위험 표현·모순 점검 | missingInfo, riskStatements, contradictions |
| LegalReference | 참고 법령/판례 | title, citation, content, sourceUrl |
| Report | 진술서 초안/상담 준비 보고서 | content, generatedAt |
| AuditLog | 보안 감사 기록 | userId, action, entityType, createdAt |

## 주요 기능 상세

### 1. 다이어리 기록

- `NOTE`, `SCHEDULE`, `EVENT`, `ISSUE` 카테고리로 기록을 분류합니다.
- 정확한 시각과 대략적인 시간을 함께 저장할 수 있습니다.
- 현재 위치 참조를 선택하면 브라우저 위치 권한 기반으로 좌표와 정확도를 장소 항목에 남깁니다.
- 캘린더에서 날짜별 기록을 시각적으로 확인합니다.

### 2. 외부 기록 연동

- 카카오톡 내보내기 텍스트의 날짜 헤더와 `[참여자] [오전/오후 시간] 메시지` 형식을 파싱합니다.
- 보낸 메시지와 받은 메시지를 `OUTBOUND`, `INBOUND`로 구분합니다.
- Gmail, Outlook, SMS, Instagram은 커넥터 추상화와 동의 UI를 먼저 구현해 실제 API 또는 사용자가 제공한 내보내기 파일로 확장할 수 있습니다.
- 비공식 API는 사용자의 명시적 동의와 서비스 약관 검토가 전제되어야 하며, 기본 MVP는 사용자가 직접 내보낸 자료를 우선 처리합니다.

### 3. 사건 정리와 셀프 기록

- 로그인하지 않은 사용자가 사건 생성, 다이어리, 연동 기능에 접근하면 로그인 화면으로 안내합니다.
- 사건 안에서는 셀프 기록, 타임라인, 증거, 분석, 참고자료, 보고서 페이지가 분리되어 있습니다.
- 자료 보드에서 다이어리와 증거물을 검색해 기록에 연결합니다.
- 타임라인은 시간, 사건 요약, 제3자 개입 여부, 증거 여부를 행위 단위 블록으로 정리합니다.

### 4. AI 질문 엔진

AI는 다음 시스템 규칙을 따릅니다.

```text
You must only use user-provided facts.
Do not invent or assume anything.
Do not provide legal judgment.
Remove emotional or exaggerated language.
Only structure, clean, and organize.
```

현재 구현은 `IAIService` 인터페이스 아래 세 가지 모드를 지원합니다.

- `MockAIService`: 로컬 개발과 테스트용 규칙 기반 엔진
- `VercelAIService`: Vercel AI SDK / AI Gateway 설정 시 사용
- `LocalLLMService`: `LOCAL_LLM_ENDPOINT`가 있는 온디바이스 또는 로컬 OpenAI 호환 서버용

질문 우선순위는 고정 문항 반복이 아니라 직전 답변의 단서에 따라 달라집니다.

- 시점, 장소/매체, 관련자 같은 기본 누락 정보
- 금액/입금/송금/계좌 등 돈의 흐름
- 반복성, 첫 시점, 최근 시점, 횟수와 간격
- 제3자, 목격자, 직접 본 내용과 전해 들은 내용
- 카카오톡/문자/전화/이메일 등 대화 매체와 원문 보관 여부
- 증거 자료가 어떤 말이나 행동을 뒷받침하는지
- 항상, 계속, 매번, 모두, 분명히, 고의로, 악의적으로 같은 위험 표현

### 5. 분석과 보고서

- 육하원칙 누락: when, where, who, action, damage, evidence
- 위험 표현: 항상, 계속, 매번, 모두, 분명히, 고의로, 악의적으로
- 모순 점검: 시간 겹침, 장소 충돌, 관련자 누락, 순서 오류
- 보고서 구조: 사건 개요, 타임라인, 육하원칙, 피해 내용, 증거 목록, 누락 정보, 위험 표현, 참고 법령/판례, 상담 준비 질문, 법적 고지

모든 출력에는 다음 안내가 포함됩니다.

```text
본 자료는 법률 자문이 아닙니다.
참고용으로 제공되며 최종 판단은 전문가 상담이 필요합니다.
```

## 시스템 아키텍처

```text
src/domain          순수 OOP 엔티티, 값 객체, 도메인 서비스
src/application     유스케이스, DTO, 포트 인터페이스, 서비스 오케스트레이션
src/infrastructure  Prisma, AI, 저장소, 보안, DI 컨테이너
src/presentation    재사용 가능한 한국어 UI 컴포넌트와 클라이언트 상태
src/app             Next.js App Router 페이지와 Route Handler
```

```mermaid
classDiagram
  class User
  class Case
  class LifeRecord
  class MemoryRecord
  class IncidentEvent
  class Evidence
  class AnalysisResult
  class Report
  class IAIService
  class ICaseRepository
  class IEvidenceRepository
  class CaseService
  class InterviewService
  class EvidenceService
  class AnalysisService
  class ReportService

  User "1" --> "*" Case
  User "1" --> "*" LifeRecord
  Case "1" --> "*" IncidentEvent
  Case "1" --> "*" Evidence
  Case "1" --> "*" AnalysisResult
  Case "1" --> "*" Report
  InterviewService --> IAIService
  CaseService --> ICaseRepository
  EvidenceService --> IEvidenceRepository
  AnalysisService --> AnalysisResult
  ReportService --> Report
```

자세한 폴더 구조와 UML 스타일 설계는 `docs/architecture.md`를 참고하세요.

## 보안과 개인정보

- JWT 기반 HTTP-only 세션 쿠키를 사용합니다.
- 민감 필드 암호화 유틸리티와 감사 로그 구조를 포함합니다.
- 사용자 데이터와 사건 데이터는 사용자 ID 기준으로 분리됩니다.
- 증거 파일 원문은 AI에 전달하지 않고, 파일명·설명·해시·연결 이벤트만 사용합니다.
- 계정 삭제, 사건 잠금, 보안 안내 페이지를 제공합니다.
- 배포 환경에서는 HTTPS를 전제로 합니다.

## 기술 스택

- Next.js App Router, React, TypeScript
- TailwindCSS, lucide-react
- Zustand
- Prisma ORM, PostgreSQL
- Supabase PostgreSQL 연결 가능
- Vercel AI SDK / AI Gateway, Mock AI, Local LLM fallback
- Local mock storage, S3-compatible storage abstraction
- JWT cookie session, bcrypt, jose, crypto-js

## 로컬 실행

```bash
npm install
copy .env.example .env.local
npx prisma db push
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

PostgreSQL이 없는 개발 환경에서는 `.env.local`에 아래 값을 설정해 JSON 기반 로컬 저장소를 사용할 수 있습니다.

```bash
FACTLINE_STORAGE_MODE="local"
```

빌드 검증만 수행하려면 문법상 유효한 `DATABASE_URL`이 필요합니다.

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/factline?schema=public"
npm run build
```

## 환경 변수

| 변수 | 설명 |
| --- | --- |
| DATABASE_URL | Prisma/PostgreSQL 연결 문자열 |
| DIRECT_URL | Supabase 등 직접 연결 URL이 필요한 경우 사용 |
| JWT_SECRET | 세션 토큰 서명 키 |
| ENCRYPTION_KEY | 민감 데이터 암호화 키 |
| FACTLINE_STORAGE_MODE | `local`이면 개발용 JSON 저장소 사용 |
| AI_GATEWAY_API_KEY | Vercel AI Gateway 사용 시 API 키 |
| VERCEL_OIDC_TOKEN | Vercel AI Gateway OIDC 사용 시 토큰 |
| AI_MODEL | 사용할 AI Gateway 모델 |
| LOCAL_LLM_ENDPOINT | 로컬 OpenAI 호환 LLM 엔드포인트 |
| LOCAL_LLM_MODEL | 로컬 LLM 모델명 |
| LAW_API_OC | 국가법령정보 API OC 키 |
| LAW_API_TARGET | 법령 API target 값 |

## 검증

```bash
npm test
npm run lint
npm run build
```

이번 README에 포함된 화면은 `agent-browser`로 로컬 서버를 실제로 열어 캡처했습니다.

## 라이선스

이 저장소는 오픈소스가 아닙니다. `LICENSE` 파일에 명시된 대로 무단 복제, 수정, 배포, 상업적 이용, 재라이선스, 역설계, 파생 서비스 제작을 금지합니다.
