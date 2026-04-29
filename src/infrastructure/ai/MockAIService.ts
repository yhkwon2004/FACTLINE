import type { IAIService } from "../../application/ports";
import type {
  InterviewFollowUpInput,
  InterviewFollowUpOutput,
  StatementDraftInput,
  StructuredInterviewOutput,
} from "../../application/dtos";
import { AI_SYSTEM_PROMPT, LEGAL_SAFETY_NOTICE } from "../../domain/constants";

const EVIDENCE_WORDS = ["증거", "자료", "캡처", "녹음", "사진", "영상", "문자", "카톡", "메일", "계약서", "영수증", "계좌", "이체"];
const TIME_PATTERN = /(20\d{2}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일|20\d{2}\s*년\s*\d{1,2}\s*월|지난\s*[^\s,.]+|어제|오늘|오전\s*\d{1,2}\s*시|오후\s*\d{1,2}\s*시|\d{1,2}\s*월\s*\d{1,2}\s*일)/;
const MEDIA_WORDS = ["카카오톡", "카톡", "문자", "전화", "이메일", "메일", "대면", "사무실", "회사", "현장", "집", "계좌"];
const ACTOR_WORDS = ["상대방", "본인", "회사", "직장상사", "동료", "친구", "가족", "A씨", "B씨"];
const DAMAGE_WORDS = ["피해", "손해", "손실", "치료", "진단", "환불", "반환", "금액", "지연", "차질", "불이익"];

export class MockAIService implements IAIService {
  async structureInterview(input: { answer: string }): Promise<StructuredInterviewOutput> {
    const cleaned = input.answer.replace(/[!]{2,}/g, ".").trim();
    const approximateTimeText = cleaned.match(TIME_PATTERN)?.[0] ?? null;
    const location = MEDIA_WORDS.find((word) => cleaned.includes(word)) ?? null;
    const actor = ACTOR_WORDS.find((word) => cleaned.includes(word)) ?? null;
    const damage = DAMAGE_WORDS.some((word) => cleaned.includes(word)) ? cleaned : null;

    return {
      title: cleaned.slice(0, 28) || "진술 항목",
      cleanedStatement: cleaned,
      datetime: null,
      approximateTimeText,
      location,
      actor,
      action: cleaned || null,
      damage,
      followUpQuestions: [],
    };
  }

  async suggestInterviewFollowUp(input: InterviewFollowUpInput): Promise<InterviewFollowUpOutput> {
    const allText = [input.lastAnswer, ...input.events.map((event) => event.description)].join(" ");
    const previous = input.previousQuestions.join(" ");
    const hasAsked = (keywords: string[]) => keywords.some((keyword) => previous.includes(keyword));
    const hasEvidence = input.events.some((event) => event.evidenceIds.length > 0) || EVIDENCE_WORDS.some((word) => allText.includes(word));
    const uploadedEvidence = input.evidences[0];

    if (uploadedEvidence && !hasAsked(["업로드된 제출물", "제출물", "원본", "사본", "어느 사실"])) {
      return {
        question: [
          `업로드된 제출물 "${uploadedEvidence.name}"를 확인했습니다.`,
          "이 자료가 어떤 사실을 뒷받침하는지, 원본인지 사본인지, 확보한 시점과 경위를 차분히 적어 주세요.",
        ].join(" "),
        reason: "evidence-review",
        isComplete: false,
      };
    }

    const missingFields = [
      {
        isMissing: !input.events.some((event) => event.datetime || event.approximateTimeText),
        asked: hasAsked(["시점", "언제", "날짜", "시간", "기간"]),
        question: "시점은 어느 정도까지 확인되나요? 정확한 날짜가 아니어도, 월/주/오전처럼 기억나는 범위로 적어 주세요.",
        reason: "when",
      },
      {
        isMissing: !input.events.some((event) => event.location),
        asked: hasAsked(["어디", "장소", "매체", "카카오톡", "전화", "문자"]),
        question: "그 일이 발생한 장소나 매체는 무엇인가요? 예를 들어 대면, 전화, 문자, 카카오톡, 이메일처럼 구분해 주세요.",
        reason: "where",
      },
      {
        isMissing: !input.events.some((event) => event.actor),
        asked: hasAsked(["누가", "상대방", "관련자", "관여"]),
        question: "관여한 사람을 역할 중심으로 정리해 볼게요. 본인, 상대방, 목격자처럼 누가 등장했나요?",
        reason: "who",
      },
      {
        isMissing: !input.events.some((event) => event.action && event.action.length > 8),
        asked: hasAsked(["행동", "발언", "말", "무엇을", "어떻게"]),
        question: "상대방의 말이나 행동 중 직접 확인한 부분만 적어 주세요. 해석보다 실제 표현이나 행동을 우선해서요.",
        reason: "action",
      },
      {
        isMissing: !input.events.some((event) => event.damage),
        asked: hasAsked(["피해", "손해", "영향", "금액"]),
        question: "그 결과 생긴 피해나 영향은 무엇인가요? 금액, 업무 차질, 치료, 평판 영향처럼 확인 가능한 범위로 적어 주세요.",
        reason: "damage",
      },
      {
        isMissing: !hasEvidence,
        asked: hasAsked(["증거", "자료", "입증", "확인할 수"]),
        question: "이 내용을 뒷받침할 자료가 있다면 종류만 알려 주세요. 파일은 올리지 않아도 되고, 캡처/문자/계좌내역처럼 이름만 적어도 됩니다.",
        reason: "evidence",
      },
    ];

    const next = missingFields.find((field) => field.isMissing && !field.asked);
    if (next) return { question: next.question, reason: next.reason, isComplete: false };

    if (!hasAsked(["추가로", "빠뜨린", "마지막"])) {
      return {
        question: "추가로 빠뜨린 사실이 있나요? 없다면 다음 단계에서 타임라인과 누락 정보를 확인하면 됩니다.",
        reason: "final-check",
        isComplete: false,
      };
    }

    return {
      question: null,
      reason: "completed",
      isComplete: true,
    };
  }

  async generateStatementDraft(input: StatementDraftInput): Promise<string> {
    const lines = input.events.map((event, index) => {
      const checks = event.checklist?.length ? `\n  - 셀프 점검: ${event.checklist.join(", ")}` : "";
      const evidences = event.evidenceNames?.length ? event.evidenceNames.join(", ") : event.evidenceCount ? `${event.evidenceCount}건` : "연결 필요";
      return [
        `${index + 1}. ${event.datetime ?? event.approximateTimeText ?? "시점 확인 필요"}`,
        `   - 요약: ${event.description}`,
        `   - 관련자/제3자: ${event.actor ?? "확인 필요"}`,
        `   - 장소/매체: ${event.location ?? "확인 필요"}`,
        `   - 증거: ${evidences}`,
        checks,
      ].filter(Boolean).join("\n");
    });

    return [
      `# 진술서 초안 - ${input.caseTitle}`,
      "",
      input.caseDescription ? `사건 개요: ${input.caseDescription}` : "사건 개요: 확인 필요",
      "",
      "## 행위 단위 진술",
      ...lines,
      "",
      "## 증거 목록",
      ...(input.evidences.length > 0
        ? input.evidences.map((evidence) => `- ${evidence.name}: ${evidence.description ?? "설명 확인 필요"} / sha256 ${evidence.fileHash ?? "해시 없음"}`)
        : ["- 등록된 증거 없음"]),
      "",
      "## 연결된 생활 기록",
      ...(input.lifeRecords.length > 0
        ? input.lifeRecords.map((record) => `- ${record.datetime ?? "시점 확인 필요"} ${record.title}: ${record.content}`)
        : ["- 연결된 생활 기록 없음"]),
      "",
      LEGAL_SAFETY_NOTICE,
      "",
      `AI 지침: ${AI_SYSTEM_PROMPT}`,
    ].join("\n");
  }
}
