import type { IAIService } from "../../application/ports";
import type {
  InterviewFollowUpInput,
  InterviewFollowUpOutput,
  StatementDraftInput,
  StructuredInterviewOutput,
} from "../../application/dtos";
import { AI_SYSTEM_PROMPT, LEGAL_SAFETY_NOTICE } from "../../domain/constants";
import { MockAIService } from "./MockAIService";

type ChatMessage = { role: "system" | "user"; content: string };

export class LocalLLMService implements IAIService {
  private readonly mock = new MockAIService();
  private readonly endpoint = process.env.LOCAL_LLM_ENDPOINT ?? "http://localhost:11434/v1/chat/completions";
  private readonly model = process.env.LOCAL_LLM_MODEL ?? "qwen2.5:7b";

  async structureInterview(input: { answer: string; context?: string }): Promise<StructuredInterviewOutput> {
    try {
      const parsed = await this.generateJson<StructuredInterviewOutput>([
        { role: "system", content: `${AI_SYSTEM_PROMPT}\nReturn only valid JSON.` },
        {
          role: "user",
          content: [
            "다음 사용자의 셀프 기록을 구조화하세요.",
            "사용자가 제공하지 않은 사실은 null로 두세요.",
            "필드는 title, cleanedStatement, datetime, approximateTimeText, location, actor, action, damage, followUpQuestions 입니다.",
            `사건 맥락: ${input.context ?? "없음"}`,
            `셀프 기록: ${input.answer}`,
          ].join("\n"),
        },
      ]);

      return {
        title: parsed.title ?? input.answer.slice(0, 28) ?? "셀프 기록",
        cleanedStatement: parsed.cleanedStatement ?? input.answer,
        datetime: parsed.datetime ?? null,
        approximateTimeText: parsed.approximateTimeText ?? null,
        location: parsed.location ?? null,
        actor: parsed.actor ?? null,
        action: parsed.action ?? null,
        damage: parsed.damage ?? null,
        followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
      };
    } catch {
      return this.mock.structureInterview(input);
    }
  }

  async suggestInterviewFollowUp(input: InterviewFollowUpInput): Promise<InterviewFollowUpOutput> {
    try {
      const parsed = await this.generateJson<InterviewFollowUpOutput>([
        {
          role: "system",
          content: [
            AI_SYSTEM_PROMPT,
            "당신은 FACTLINE의 셀프 기록 정리 도우미입니다.",
            "법률 판단 없이, 사용자의 행위 단위 기록을 더 구체화하는 질문 하나만 만드세요.",
            "이미 물어본 질문은 반복하지 마세요.",
            "Return only valid JSON with question, reason, isComplete.",
          ].join("\n"),
        },
        { role: "user", content: JSON.stringify(input, null, 2) },
      ]);

      return {
        question: parsed.question ?? null,
        reason: parsed.reason ?? "local-llm",
        isComplete: Boolean(parsed.isComplete),
      };
    } catch {
      return this.mock.suggestInterviewFollowUp(input);
    }
  }

  async generateStatementDraft(input: StatementDraftInput): Promise<string> {
    try {
      const text = await this.generateText([
        {
          role: "system",
          content: `${AI_SYSTEM_PROMPT}\n${LEGAL_SAFETY_NOTICE}`,
        },
        {
          role: "user",
          content: [
            "아래 실제 셀프 기록, 증거 목록, 생활 기록만 사용해 진술서 초안을 작성하세요.",
            "각 행위는 시간순으로 풀어 쓰고, 증거와 셀프 점검 누락 항목을 함께 표시하세요.",
            "제공되지 않은 사실은 확인 필요로 표시하고, 법적 판단이나 죄명 판단은 하지 마세요.",
            JSON.stringify(input, null, 2),
          ].join("\n"),
        },
      ]);

      return text.includes(LEGAL_SAFETY_NOTICE) ? text : `${text}\n\n${LEGAL_SAFETY_NOTICE}`;
    } catch {
      return this.mock.generateStatementDraft(input);
    }
  }

  private async generateJson<T>(messages: ChatMessage[]): Promise<Partial<T>> {
    const text = await this.generateText(messages, true);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Local LLM did not return JSON.");
    return JSON.parse(match[0]) as Partial<T>;
  }

  private async generateText(messages: ChatMessage[], jsonMode = false): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.2,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!response.ok) throw new Error(`Local LLM request failed: ${response.status}`);
    const payload = await response.json();
    return String(payload.choices?.[0]?.message?.content ?? payload.message?.content ?? "");
  }
}
