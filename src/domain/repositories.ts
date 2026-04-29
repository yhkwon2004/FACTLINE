import { User, Case, IncidentEvent, Evidence, AnalysisResult, Report } from "./entities";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: any): Promise<User>;
}

export interface ICaseRepository {
  findById(id: string): Promise<Case | null>;
  findAllByUserId(userId: string): Promise<Case[]>;
  save(caseData: Case): Promise<Case>;
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
}

export interface IAnalysisRepository {
  findByCaseId(caseId: string): Promise<AnalysisResult | null>;
  save(analysis: AnalysisResult): Promise<AnalysisResult>;
}

export interface IReportRepository {
  findByCaseId(caseId: string): Promise<Report | null>;
  save(report: Report): Promise<Report>;
}
