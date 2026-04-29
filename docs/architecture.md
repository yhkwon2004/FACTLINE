# FACTLINE Architecture

## Folder Structure

```text
src/
  app/                         Next.js App Router UI and route handlers
  application/                 Use cases, DTOs, ports
  domain/                      Pure OOP entities, value objects, domain services
  infrastructure/              Prisma, AI, storage, security, DI
  presentation/                Reusable UI components and client store
prisma/schema.prisma           PostgreSQL persistence schema
```

## UML-Style Class Diagram

```text
User 1 ── * Case 1 ── * IncidentEvent
Case 1 ── * Evidence
IncidentEvent * ── * Evidence
Case 1 ── 0..1 AnalysisResult
Case 1 ── 0..1 Report

CaseService ──> ICaseRepository
InterviewService ──> ICaseRepository, IEventRepository, IAIService
AnalysisService ──> ICaseRepository, IAnalysisRepository
ReportService ──> ICaseRepository, IAnalysisRepository, IReportRepository, IAIService
EvidenceService ──> IEvidenceRepository, IStorageService
LegalReferenceService ──> ILegalReferenceRepository, ILegalSearchService

Prisma*Repository ..|> I*Repository
VercelAIService ..|> IAIService
MockAIService ..|> IAIService
LocalMockStorageService ..|> IStorageService
```

## Safety Boundary

All AI-facing services use the FACTLINE system prompt and must not send evidence file contents to AI. Evidence routes store mock file URLs and SHA-256 hashes only.

