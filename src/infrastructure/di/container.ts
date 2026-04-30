import {
  AnalysisService,
  AuthService,
  CaseService,
  EvidenceService,
  InterviewService,
  LegalReferenceService,
  LifeRecordService,
  MemoryIntegrationService,
  ReportService,
  SecurityAuditService,
  TimelineApplicationService,
} from "../../application/services";
import {
  ConsistencyCheckService,
  MissingInfoService,
  RiskDetectionService,
  TimelineService,
} from "../../domain/services";
import { VercelAIService } from "../ai/VercelAIService";
import { LocalLLMService } from "../ai/LocalLLMService";
import { KoreanLawOpenApiSearchService } from "../legal/KoreanLawOpenApiSearchService";
import { LocalMockStorageService } from "../storage/LocalMockStorageService";
import {
  PrismaAnalysisRepository,
  PrismaCaseRepository,
  PrismaConnectedSourceRepository,
  PrismaEvidenceRepository,
  PrismaEventRepository,
  PrismaLegalReferenceRepository,
  PrismaLifeRecordRepository,
  PrismaMemoryRecordRepository,
  PrismaReportRepository,
  PrismaUserRepository,
} from "../repositories/prisma-repositories";
import {
  LocalJsonAnalysisRepository,
  LocalJsonCaseRepository,
  LocalJsonConnectedSourceRepository,
  LocalJsonEvidenceRepository,
  LocalJsonEventRepository,
  LocalJsonLegalReferenceRepository,
  LocalJsonLifeRecordRepository,
  LocalJsonMemoryRecordRepository,
  LocalJsonReportRepository,
  LocalJsonUserRepository,
} from "../repositories/local-json-repositories";
import { HashService } from "../security/HashService";
import { JwtSessionService } from "../security/JwtSessionService";
import { SecurityAuditWriter } from "../security/SecurityAuditWriter";

function createRepositories() {
  const shouldUseLocalStore = process.env.FACTLINE_STORAGE_MODE === "local" || !process.env.DATABASE_URL;

  if (shouldUseLocalStore) {
    return {
      users: new LocalJsonUserRepository(),
      cases: new LocalJsonCaseRepository(),
      events: new LocalJsonEventRepository(),
      evidences: new LocalJsonEvidenceRepository(),
      analyses: new LocalJsonAnalysisRepository(),
      legalReferences: new LocalJsonLegalReferenceRepository(),
      reports: new LocalJsonReportRepository(),
      lifeRecords: new LocalJsonLifeRecordRepository(),
      connectedSources: new LocalJsonConnectedSourceRepository(),
      memoryRecords: new LocalJsonMemoryRecordRepository(),
    };
  }

  return {
    users: new PrismaUserRepository(),
    cases: new PrismaCaseRepository(),
    events: new PrismaEventRepository(),
    evidences: new PrismaEvidenceRepository(),
    analyses: new PrismaAnalysisRepository(),
    legalReferences: new PrismaLegalReferenceRepository(),
    reports: new PrismaReportRepository(),
    lifeRecords: new PrismaLifeRecordRepository(),
    connectedSources: new PrismaConnectedSourceRepository(),
    memoryRecords: new PrismaMemoryRecordRepository(),
  };
}

export function createContainer() {
  const { users, cases, events, evidences, analyses, legalReferences, reports, lifeRecords, connectedSources, memoryRecords } =
    createRepositories();

  const ai = process.env.AI_PROVIDER === "local" || process.env.LOCAL_LLM_ENDPOINT
    ? new LocalLLMService()
    : new VercelAIService();
  const legalSearch = new KoreanLawOpenApiSearchService();
  const storage = new LocalMockStorageService();
  const legalReferenceService = new LegalReferenceService(legalReferences, legalSearch);

  return {
    authService: new AuthService(users, new HashService(), new JwtSessionService()),
    caseService: new CaseService(cases),
    interviewService: new InterviewService(cases, events, ai),
    timelineService: new TimelineApplicationService(events, new TimelineService()),
    evidenceService: new EvidenceService(evidences, storage),
    analysisService: new AnalysisService(
      cases,
      analyses,
      new RiskDetectionService(),
      new MissingInfoService(),
      new ConsistencyCheckService(),
    ),
    legalReferenceService,
    lifeRecordService: new LifeRecordService(lifeRecords, cases),
    memoryIntegrationService: new MemoryIntegrationService(connectedSources, memoryRecords),
    reportService: new ReportService(cases, analyses, reports, lifeRecords, ai, legalReferenceService),
    securityAuditService: new SecurityAuditService(users, cases, new SecurityAuditWriter()),
    sessionService: new JwtSessionService(),
  };
}
