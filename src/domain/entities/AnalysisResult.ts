import type { ContradictionItem, MissingInfoItem, RiskItem, RiskLevel } from "../types";

export interface AnalysisResultProps {
  id: string;
  caseId: string;
  riskLevel?: RiskLevel | null;
  risks?: RiskItem[];
  missingInfo?: MissingInfoItem[];
  contradictions?: ContradictionItem[];
  suggestions?: string[];
  content?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AnalysisResult {
  public readonly id: string;
  public readonly caseId: string;
  public riskLevel: RiskLevel | null;
  public risks: RiskItem[];
  public missingInfo: MissingInfoItem[];
  public contradictions: ContradictionItem[];
  public suggestions: string[];
  public content: string | null;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: AnalysisResultProps) {
    this.id = props.id;
    this.caseId = props.caseId;
    this.riskLevel = props.riskLevel ?? null;
    this.risks = props.risks ?? [];
    this.missingInfo = props.missingInfo ?? [];
    this.contradictions = props.contradictions ?? [];
    this.suggestions = props.suggestions ?? [];
    this.content = props.content ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}

