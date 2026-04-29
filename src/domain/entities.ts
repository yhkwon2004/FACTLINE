/**
 * Domain Entities (OOP)
 */

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly createdAt: Date
  ) {}
}

export class Case {
  constructor(
    public readonly id: string,
    public title: string,
    public type: string,
    public status: string,
    public userId: string,
    public events: IncidentEvent[] = [],
    public evidences: Evidence[] = [],
    public isLocked: boolean = false,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  addEvent(event: IncidentEvent) {
    this.events.push(event);
    this.updatedAt = new Date();
  }

  addEvidence(evidence: Evidence) {
    this.evidences.push(evidence);
    this.updatedAt = new Date();
  }

  lock() {
    this.isLocked = true;
    this.updatedAt = new Date();
  }
}

export class IncidentEvent {
  constructor(
    public readonly id: string,
    public readonly caseId: string,
    public title: string,
    public description: string,
    public datetime: Date,
    public location: string | null = null,
    public actor: string | null = null,
    public action: string | null = null,
    public damage: string | null = null,
    public source: "INTERVIEW" | "EVIDENCE" = "INTERVIEW",
    public evidenceIds: string[] = []
  ) {}
}

export class Evidence {
  constructor(
    public readonly id: string,
    public readonly caseId: string,
    public name: string,
    public type: string,
    public fileUrl: string | null = null,
    public fileHash: string | null = null,
    public description: string | null = null
  ) {}
}

export class AnalysisResult {
  constructor(
    public readonly id: string,
    public readonly caseId: string,
    public riskLevel: "LOW" | "MEDIUM" | "HIGH" | null = null,
    public risks: RiskItem[] = [],
    public missingInfo: string[] = [],
    public contradictions: ContradictionItem[] = [],
    public suggestions: string[] = [],
    public content: string | null = null
  ) {}
}

export interface RiskItem {
  phrase: string;
  reason: string;
  suggestion: string;
}

export interface ContradictionItem {
  type: "TIME" | "LOCATION" | "ACTOR" | "SEQUENCE";
  description: string;
}

export class Report {
  constructor(
    public readonly id: string,
    public readonly caseId: string,
    public content: string,
    public status: "DRAFT" | "FINAL" = "DRAFT",
    public createdAt: Date = new Date()
  ) {}
}
