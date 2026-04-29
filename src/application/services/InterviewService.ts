import { IncidentEvent } from "../../domain/entities";
import type { ICaseRepository, IEventRepository } from "../../domain/repositories";
import type { InterviewInput } from "../dtos";
import type { IAIService } from "../ports";

export class InterviewService {
  constructor(
    private readonly cases: ICaseRepository,
    private readonly events: IEventRepository,
    private readonly ai: IAIService,
  ) {}

  async getQuestionTree() {
    return [
      "먼저 정리할 일을 한 문장으로 적어 주세요. 판단이나 감정보다 직접 확인한 사실 위주면 충분합니다.",
      "시점은 어느 정도까지 확인되나요? 정확한 날짜가 아니어도 괜찮습니다.",
      "장소나 매체는 무엇인가요?",
      "관여한 사람은 누구인가요?",
      "직접 확인한 말이나 행동은 무엇인가요?",
      "피해나 영향은 무엇인가요?",
      "뒷받침할 자료의 종류가 있나요?",
    ];
  }

  async saveAnswer(input: InterviewInput) {
    const caseData = await this.cases.findById(input.caseId);
    if (!caseData) throw new Error("사건을 찾을 수 없습니다.");
    if (caseData.isLocked) throw new Error("잠긴 사건은 수정할 수 없습니다.");

    const structured = await this.ai.structureInterview({ answer: input.answer, context: caseData.title });
    const datetime = input.datetime ?? structured.datetime;
    const validEvidenceIds = (input.evidenceIds ?? []).filter((id) =>
      caseData.evidences.some((evidence) => evidence.id === id),
    );

    const event = new IncidentEvent({
      id: crypto.randomUUID(),
      caseId: input.caseId,
      title: structured.title,
      rawStatement: input.answer,
      description: structured.cleanedStatement,
      datetime: datetime ? new Date(datetime) : null,
      isApproximateTime: !datetime && Boolean(input.approximateTimeText ?? structured.approximateTimeText),
      approximateTimeText: input.approximateTimeText ?? structured.approximateTimeText,
      location: input.location ?? structured.location,
      actor: input.actor ?? structured.actor,
      action: input.action ?? structured.action,
      damage: input.damage ?? structured.damage,
      source: "INTERVIEW",
      evidenceIds: validEvidenceIds,
    });

    const savedEvent = await this.events.save(event);
    const interviewEvents = [...caseData.events, savedEvent];
    const followUp = await this.ai.suggestInterviewFollowUp({
      caseTitle: caseData.title,
      lastAnswer: input.answer,
      previousQuestions: input.previousQuestions ?? [],
      events: interviewEvents.map((item) => ({
        title: item.title,
        description: item.description,
        datetime: item.datetime?.toISOString() ?? null,
        approximateTimeText: item.approximateTimeText,
        location: item.location,
        actor: item.actor,
        action: item.action,
        damage: item.damage,
        evidenceIds: item.evidenceIds,
      })),
      evidences: caseData.evidences.map((evidence) => ({
        id: evidence.id,
        name: evidence.name,
        type: evidence.type,
        description: evidence.description,
        fileHash: evidence.fileHash,
        createdAt: evidence.createdAt.toISOString(),
      })),
    });

    return {
      event: savedEvent,
      nextQuestion: followUp.question,
      isComplete: followUp.isComplete,
      followUpReason: followUp.reason,
      followUpQuestions: followUp.question ? [followUp.question] : structured.followUpQuestions,
    };
  }
}
