# FACTLINE

FACTLINE은 사용자가 제공한 사건 사실을 구조화하고, 진술서 및 법률 상담 준비 보고서 생성을 돕는 모바일 우선 웹 애플리케이션입니다.

핵심 원칙은 간단합니다.

> AI does not judge. AI organizes facts.

FACTLINE은 법률 자문, 유무죄 판단, 죄명 결론, 법적 결과 예측을 제공하지 않습니다.

## Stack

- Next.js App Router, TypeScript, TailwindCSS
- Zustand
- Prisma ORM, PostgreSQL
- Vercel AI SDK with AI Gateway when configured
- Mock AI, mock legal reference, mock local storage fallback
- JWT cookie session, AES utility, audit logs

## Architecture

```text
src/domain          Pure OOP entities, value objects, domain services
src/application     Use cases, DTOs, interfaces, orchestration
src/infrastructure  Prisma, AI, storage, security, dependency injection
src/presentation    Reusable Korean UI components and client store
src/app             Next.js pages and API route handlers
```

See `docs/architecture.md` for the folder structure and UML-style class diagram.

## Local Setup

```bash
npm install
copy .env.example .env.local
npx prisma db push
npm run dev
```

Open `http://localhost:3000`.

If PostgreSQL is not available on a local machine, set `FACTLINE_STORAGE_MODE="local"` in `.env.local` for development-only JSON persistence. Production keeps using Prisma/PostgreSQL.

For build verification without a local database connection, set a syntactically valid `DATABASE_URL` before running the build:

```bash
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/factline?schema=public"
npm run build
```

## AI Configuration

If `VERCEL_OIDC_TOKEN` or `AI_GATEWAY_API_KEY` is present, `VercelAIService` uses the configured `AI_MODEL`.

If AI Gateway credentials are absent, the app uses `MockAIService` through the same `IAIService` interface.

The system prompt is fixed in `src/domain/constants.ts`:

```text
You must only use user-provided facts.
Do not invent or assume anything.
Do not provide legal judgment.
Remove emotional or exaggerated language.
Only structure, clean, and organize.
```

## Verification

```bash
npm test
npm run lint
npm run build
npm audit --json
```

All generated outputs must include:

```text
본 자료는 법률 자문이 아닙니다.
참고용으로 제공되며 최종 판단은 전문가 상담이 필요합니다.
```
