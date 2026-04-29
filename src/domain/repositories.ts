import { User, Case, IncidentEvent, Evidence, AnalysisResult, LegalReference, Report, LifeRecord } from "./entities";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

export interface ICaseRepository {
  findById(id: string): Promise<Case | null>;
  findAllByUserId(userId: string): Promise<Case[]>;
  save(caseData: Case): Promise<Case>;
  lock(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IEventRepository {
  findByCaseId(caseId: string): Promise<IncidentEvent[]>;
  save(event: IncidentEvent): Promise<IncidentEvent>;
  delete(id: string): Promise<void>;
}

export interface IEvidenceRepository {
  findByCaseId(caseId: string): Promise<Evidence[]>;
  save(evidence: Evidence): Promise<Evidence>;
  delete(id: string): Promise<void>;
  linkToEvent(evidenceId: string, eventId: string): Promise<void>;
  unlinkFromEvent(evidenceId: string, eventId: string): Promise<void>;
}

export interface IAnalysisRepository {
  findByCaseId(caseId: string): Promise<AnalysisResult | null>;
  save(analysis: AnalysisResult): Promise<AnalysisResult>;
}

export interface ILegalReferenceRepository {
  search(query: string, incidentType?: string): Promise<LegalReference[]>;
  save(reference: LegalReference): Promise<LegalReference>;
}

export interface IReportRepository {
  findByCaseId(caseId: string): Promise<Report | null>;
  save(report: Report): Promise<Report>;
}

export interface ILifeRecordRepository {
  findById(id: string): Promise<LifeRecord | null>;
  findAllByUserId(userId: string): Promise<LifeRecord[]>;
  findByCaseId(caseId: string): Promise<LifeRecord[]>;
  save(record: LifeRecord): Promise<LifeRecord>;
  delete(id: string): Promise<void>;
}
