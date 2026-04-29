import { generateText, Output } from "ai";
import { z } from "zod";
import type { IAIService } from "../../application/ports";
import type {
  InterviewFollowUpInput,
  InterviewFollowUpOutput,
  StatementDraftInput,
  StructuredInterviewOutput,
} from "../../application/dtos";
import { AI_SYSTEM_PROMPT, LEGAL_SAFETY_NOTICE } from "../../domain/constants";
import { MockAIService } from "./MockAIService";

const InterviewSchema = z.object({
  title: z.string(),
  cleanedStatement: z.string(),
  datetime: z.string().nullable(),
  approximateTimeText: z.string().nullable(),
  location: z.string().nullable(),
  actor: z.string().nullable(),
  action: z.string().nullable(),
  damage: z.string().nullable(),
  followUpQuestions: z.array(z.string()),
});

const FollowUpSchema = z.object({
  question: z.string().nullable(),
  reason: z.string(),
  isComplete: z.boolean(),
});

export class VercelAIService implements IAIService {
  private readonly mock = new MockAIService();
  private readonly model = process.env.AI_MODEL ?? "openai/gpt-5.4";

  async structureInterview(input: { answer: string; context?: string }): Promise<StructuredInterviewOutput> {
    if (!this.isConfigured()) return this.mock.structureInterview(input);

    const result = await generateText({
      model: this.model,
      system: AI_SYSTEM_PROMPT,
      prompt: [
        "다음 사용자의 사건 진술을 구조화하세요.",
        "사용자가 제공하지 않은 사실은 null로 두세요.",
        "법적 판단, 죄명, 승패 예측, 대응 조언은 작성하지 마세요.",
        `사건 맥락: ${input.context ?? "없음"}`,
        `진술: ${input.answer}`,
      ].join("\n"),
      output: Output.object({ schema: InterviewSchema }),
    });

    return {
      title: result.output.title,
      cleanedStatement: result.output.cleanedStatement,
      datetime: result.output.datetime ?? null,
      approximateTimeText: result.output.approximateTimeText ?? null,
      location: result.output.location ?? null,
      actor: result.output.actor ?? null,
      action: result.output.action ?? null,
      damage: result.output.damage ?? null,
      followUpQuestions: result.output.followUpQuestions ?? [],
    };
  }

  async suggestInterviewFollowUp(input: InterviewFollowUpInput): Promise<InterviewFollowUpOutput> {
    if (!this.isConfigured()) return this.mock.suggestInterviewFollowUp(input);

    try {
      const result = await generateText({
        model: this.model,
        system: [
          AI_SYSTEM_PROMPT,
          "당신은 FACTLINE의 셀프 기록 정리 도우미입니다.",
          "목표는 법률 판단 없이 사용자가 제공한 사실을 더 구체화하도록 돕는 것입니다.",
          "이미 물어본 질문을 반복하지 마세요.",
          "질문은 한 번에 하나만, 한국어 존댓말로, 차분하고 짧게 작성하세요.",
          "증거 파일 원문을 요구하지 마세요. 이미 저장된 증거 메타데이터와 해시만 참고하세요.",
          "업로드된 증거가 있으면 그 제출물이 어떤 사실을 뒷받침하는지, 원본/사본 여부, 확보 시점, 편집 여부를 확인하는 질문을 우선하세요.",
          "충분히 확인되었다면 question은 null로 두세요.",
        ].join("\n"),
        prompt: [
          `사건명: ${input.caseTitle}`,
          `직전 답변: ${input.lastAnswer}`,
          `이미 물어본 질문: ${JSON.stringify(input.previousQuestions)}`,
          "업로드된 증거 메타데이터:",
          JSON.stringify(input.evidences, null, 2),
          "저장된 사건 이벤트:",
          JSON.stringify(input.events, null, 2),
          "다음에 물어볼 가장 자연스러운 단일 질문을 정하세요.",
          "우선순위는 시점, 장소/매체, 관련자, 실제 말/행동, 피해, 증거 종류, 마지막 확인입니다.",
        ].join("\n"),
        output: Output.object({ schema: FollowUpSchema }),
      });

      return {
        question: result.output.question,
        reason: result.output.reason,
        isComplete: result.output.isComplete,
      };
    } catch {
      return this.mock.suggestInterviewFollowUp(input);
    }
  }

  async generateStatementDraft(input: StatementDraftInput): Promise<string> {
    if (!this.isConfigured()) return this.mock.generateStatementDraft(input);

    const result = await generateText({
      model: this.model,
      system: `${AI_SYSTEM_PROMPT}\nEvery output must include this Korean notice exactly:\n${LEGAL_SAFETY_NOTICE}`,
      prompt: [
        "아래 실제 사건 데이터를 진술서 초안으로 정리하세요.",
        "셀프 기록과 증거 목록만 사용해 행위 단위로 시간순 정리하고, 감정적 표현은 중립 표현으로 바꾸세요.",
        "제3자 개입 여부, 증거 여부, 누락된 확인사항을 각 행위 옆에 표시하세요.",
        "법적 판단이나 행동 권유는 금지합니다.",
        JSON.stringify(input, null, 2),
      ].join("\n"),
    });

    return result.text.includes(LEGAL_SAFETY_NOTICE) ? result.text : `${result.text}\n\n${LEGAL_SAFETY_NOTICE}`;
  }

  private isConfigured() {
    return Boolean(process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY);
  }
}
