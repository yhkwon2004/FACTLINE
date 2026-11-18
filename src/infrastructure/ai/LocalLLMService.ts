import type { IAIService } from "../../application/ports";
import type {
  InterviewFollowUpInput,
  InterviewFollowUpOutput,
  StatementDraftInput,
  StructuredInterviewOutput,
} from "../../application/dtos";
import { localAI } from "./local-worker";
export class LocalLLMService implements IAIService {
  structureInterview(input: { answer: string; context?: string }) {
    return localAI<StructuredInterviewOutput>("structure", input);
  }
  async suggestInterviewFollowUp(
    input: InterviewFollowUpInput,
  ): Promise<InterviewFollowUpOutput> {
    const last = input.events.at(-1);
    const options = [
      !last?.datetime && !last?.approximateTimeText
        ? "언제 있었던 일인가요? 대략적인 시점도 괜찮아요."
        : null,
      !last?.location ? "어디에서 있었나요?" : null,
      !last?.actor ? "누가 관련되어 있나요?" : null,
      !last?.evidenceIds.length ? "관련 원본 자료나 목격자가 있나요?" : null,
    ].filter((x): x is string => Boolean(x));
    const question =
      options.find((q) => !input.previousQuestions.includes(q)) ?? null;
    return {
      question,
      reason: question
        ? "원문에서 확인되지 않은 정보입니다."
        : "추가 내용은 언제든 이어서 적어 주세요.",
      isComplete: !question,
    };
  }
  generateStatementDraft(input: StatementDraftInput) {
    return localAI<string>("draft", input);
  }
}
