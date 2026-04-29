# FACTLINE: AI-Assisted Legal Fact Structuring System

**FACTLINE**은 복잡한 사건의 사실관계를 객관적인 지표로 구조화하고, AI를 통해 리스크 분석 및 진술서 초안 생성을 지원하는 법률 상담 준비 플랫폼입니다.

---

## 1. 프로젝트 설계 철학 (Architecture & Design)

### 🚀 계층화 아키텍처 (Layered Architecture)
관심사의 분리를 위해 프로젝트를 3개의 핵심 계층으로 분리하여 설계하였습니다.
- **Domain Layer**: 비즈니스의 핵심 규칙과 데이터 모델(Entities)이 정의된 순수 TypeScript 영역입니다. 외부 라이브러리 의존성을 최소화하여 핵심 로직을 보호합니다.
- **Infrastructure Layer**: DB(Prisma), AI(Gemini), 보안(CryptoJS) 등 외부 시스템과의 인터페이스를 구현합니다.
- **Presentation Layer**: React, Zustand, Tailwind CSS를 활용한 사용자 인터페이스 계층입니다.

### 🧩 객체 지향 프로그래밍 (OOP)
단순한 데이터 구조체(DTA)가 아닌 의미 있는 행동을 가진 **Rich Domain Model**을 지향합니다.
- **Encapsulation**: `Case` 클래스는 내부의 `events`와 `evidences`를 직접 조작하는 대신 `addEvent()`, `lock()` 등의 메서드를 통해 상태 변경을 관리합니다.
- **Identity Integrity**: 모든 엔티티는 고유 ID를 가지며 생성 시점의 불변성을 유지합니다.

---

## 2. 주요 기능 및 구현 로직

### 🧠 AI 분석 서비스 (`GeminiService`)
- **JSON Schema Enforcement**: Gemini 1.5 Flash 모델을 사용하여 비정형 진술 데이터를 정형화된 JSON 데이터로 변환합니다.
- **6W 분석**: 누가(Who), 언제(When) 등 6하원칙에 따른 데이터 파싱 알고리즘을 적용했습니다.
- **리스크 탐지**: "반드시", "절대"와 같은 감정적/과장된 표현을 정규식 및 LLM 논리 분석으로 식별하여 수정 제안을 제공합니다.

### 🔐 보안 및 데이터 보호 (`EncryptionService`)
- **AES-256 Encryption**: 민감한 사건 제목 및 설명은 `CryptoJS`를 통해 암호화되어 저장됩니다.
- **File Integrity**: 증거 자료의 원본 보장을 위해 SHA-256 해시를 생성하여 파일의 변조 여부를 추적할 수 있습니다.

### 📊 데이터 영속성 (`Prisma & Repository Pattern`)
- **Persistence Ignorance**: 도메인 계층은 DB가 무엇인지 알 필요가 없습니다. `ICaseRepository` 인터페이스를 통해 인프라의 구체적인 구현(Prisma)과 분리되어 유연한 교체가 가능합니다.

---

## 3. 핵심 모듈 및 함수 호출 관계

### 주요 엔티티 (`src/domain/entities.ts`)
- `Case`: 사건의 전체 맥락을 담는 최상위 객체
- `IncidentEvent`: 특정 시점에 발생한 개별 사실 (타임라인의 구성 요소)
- `AnalysisResult`: AI가 도출한 리스크 점수 및 제안 사항

### 상태 관리 로직 (`src/presentation/store/app-store.ts`)
- **Zustand**를 사용하여 전역 상태를 가볍고 반응성 있게 관리합니다.
- `currentCase`: 현재 작업 중인 사건의 도메인 객체를 메모리에 유지하여 페이지 간 데이터 일관성을 보장합니다.

### 진술서 생성 파이프라인
1. `CaseDetail` 페이지에서 **"상담 보고서 생성"** 호출
2. `GeminiService`가 도메인의 `events` 데이터를 읽어 서술형 문장 구조로 변환
3. `StatementDraft` 페이지에서 줄글 형태의 고정된 서식으로 렌더링

---

## 4. 사용 및 확장 방법

### 설치 및 시작
```bash
# 의존성 설치
npm install

# DB 마이그레이션 (SQLite)
npx prisma db push

# 서버 실행
npm run dev
```

### 변수 설정 (`.env`)
- `GEMINI_API_KEY`: Google AI Studio에서 발급받은 API 키
- `VITE_ENCRYPTION_KEY`: 데이터 암호화에 사용될 고정 비밀키

---

## 5. 법적 고지
본 애플리케이션은 법률 자문이 아니며, AI가 생성한 결과물은 반드시 전문 변호사의 검토를 거쳐야 합니다. 데이터는 사용자 브라우저와 지정된 서버 보안 영역 내에서만 안전하게 처리됩니다.
