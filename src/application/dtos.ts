import type { IncidentType, LifeRecordType } from "../domain/types";

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateCaseInput {
  userId: string;
  title: string;
  type: IncidentType;
  description?: string | null;
}

export interface InterviewInput {
  caseId: string;
  answer: string;
  previousQuestions?: string[];
  evidenceIds?: string[];
  lifeRecordIds?: string[];
  datetime?: string | null;
  approximateTimeText?: string | null;
  location?: string | null;
  actor?: string | null;
  action?: string | null;
  damage?: string | null;
}

export interface EvidenceInput {
  caseId: string;
  name: string;
  type: string;
  content?: string;
  fileHash?: string | null;
  description?: string | null;
}

export interface LifeRecordInput {
  userId: string;
  caseId?: string | null;
  type?: LifeRecordType;
  title: string;
  content: string;
  occurredAt?: string | null;
  approximateTimeText?: string | null;
  location?: string | null;
  people?: string | null;
  tags?: string[];
}

export interface StatementDraftInput {
  caseTitle: string;
  caseDescription: string | null;
  events: Array<{
    title: string;
    rawStatement: string;
    description: string;
    datetime: string | null;
    approximateTimeText?: string | null;
    location: string | null;
    actor: string | null;
    action: string | null;
    damage: string | null;
    evidenceCount?: number;
    evidenceNames?: string[];
    checklist?: string[];
  }>;
  evidences: Array<{
    name: string;
    type: string;
    description: string | null;
    fileHash: string | null;
  }>;
  lifeRecords: Array<{
    title: string;
    content: string;
    datetime: string | null;
    location: string | null;
    people: string | null;
    tags: string[];
  }>;
}

export interface StructuredInterviewOutput {
  title: string;
  cleanedStatement: string;
  datetime: string | null;
  approximateTimeText: string | null;
  location: string | null;
  actor: string | null;
  action: string | null;
  damage: string | null;
  followUpQuestions: string[];
}

export interface InterviewFollowUpInput {
  caseTitle: string;
  lastAnswer: string;
  previousQuestions: string[];
  events: Array<{
    title: string;
    description: string;
    datetime: string | null;
    approximateTimeText: string | null;
    location: string | null;
    actor: string | null;
    action: string | null;
    damage: string | null;
    evidenceIds: string[];
  }>;
  evidences: Array<{
    id: string;
    name: string;
    type: string;
    description: string | null;
    fileHash: string | null;
    createdAt: string;
  }>;
}

export interface InterviewFollowUpOutput {
  question: string | null;
  reason: string;
  isComplete: boolean;
}
