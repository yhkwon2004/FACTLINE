import type { InterviewFollowUpInput, InterviewFollowUpOutput, StatementDraftInput, StructuredInterviewOutput } from "./dtos";

export interface IAIService {
  structureInterview(input: { answer: string; context?: string }): Promise<StructuredInterviewOutput>;
  suggestInterviewFollowUp(input: InterviewFollowUpInput): Promise<InterviewFollowUpOutput>;
  generateStatementDraft(input: StatementDraftInput): Promise<string>;
}

export interface ILegalSearchService {
  searchReferences(input: { query: string; incidentType?: string }): Promise<Array<{
    id: string;
    title: string;
    description: string;
    category?: string | null;
    citation?: string | null;
    content: string;
    sourceUrl?: string | null;
  }>>;
}

export interface IStorageService {
  save(input: { name: string; type: string; content: string }): Promise<{ fileUrl: string; fileHash: string }>;
  hash(content: string): string;
}
