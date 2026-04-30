export type CaseStatus = "OPEN" | "IN_PROGRESS" | "CLOSED" | "ARCHIVED";
export type IncidentType = "FRAUD" | "VIOLENCE" | "DEFAMATION" | "WORK" | "OTHER";
export type EventSource = "INTERVIEW" | "EVIDENCE" | "MANUAL";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type ReportStatus = "DRAFT" | "FINAL";
export type LifeRecordType = "NOTE" | "SCHEDULE" | "EVENT" | "ISSUE";
export type IntegrationProvider = "KAKAOTALK" | "GMAIL" | "OUTLOOK" | "SMS" | "INSTAGRAM" | "MANUAL";
export type ConnectedSourceStatus = "ACTIVE" | "IMPORT_ONLY" | "NEEDS_OAUTH" | "DISCONNECTED";
export type MemoryRecordKind = "MESSAGE" | "EMAIL" | "SMS" | "SOCIAL_DM" | "CALL" | "LOCATION" | "PHOTO" | "NOTE";
export type MemoryRecordDirection = "INBOUND" | "OUTBOUND" | "UNKNOWN";

export type MissingField = "when" | "where" | "who" | "action" | "damage" | "evidence";
export type ContradictionType = "TIME" | "LOCATION" | "ACTOR" | "SEQUENCE";

export interface RiskItem {
  phrase: string;
  riskReason: string;
  safeRewriteSuggestion: string;
}

export interface MissingInfoItem {
  field: MissingField;
  label: string;
  reason: string;
  eventId?: string;
}

export interface ContradictionItem {
  type: ContradictionType;
  description: string;
  eventIds: string[];
}

export interface SixW {
  when: string | null;
  where: string | null;
  who: string | null;
  what: string | null;
  how: string | null;
  why: string | null;
}
