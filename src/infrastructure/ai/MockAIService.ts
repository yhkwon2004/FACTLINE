import type { IAIService } from "../../application/ports";
import type {
  InterviewFollowUpInput,
  InterviewFollowUpOutput,
  StatementDraftInput,
  StructuredInterviewOutput,
} from "../../application/dtos";
import { AI_SYSTEM_PROMPT, LEGAL_SAFETY_NOTICE } from "../../domain/constants";

const EVIDENCE_WORDS = ["증거", "자료", "캡처", "녹음", "사진", "영상", "문자", "카톡", "메일", "계약서", "영수증", "계좌", "이체"];
const MONEY_WORDS = ["입금", "계좌", "송금", "이체", "계약금", "잔금", "수수료", "금액", "돈", "환불", "반환", "결제"];
const PROMISE_WORDS = ["약속", "보장", "확정", "해준다", "해주겠다", "반드시", "계약", "합의", "요청", "권유"];
const REPEAT_WORDS = ["반복", "계속", "매번", "여러 번", "자주", "지속", "항상", "다시", "또"];
const THIRD_PARTY_WORDS = ["목격", "증인", "제3자", "동료", "친구", "가족", "담당자", "관리자", "같이"];
const CONTACT_WORDS = ["카카오톡", "카톡", "문자", "전화", "통화", "이메일", "메일", "인스타", "DM", "디엠", "메신저"];
const RISKY_WORDS = ["항상", "계속", "매번", "모두", "분명히", "고의로", "악의적으로"];
const TIME_PATTERN = /(20\d{2}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일|20\d{2}\s*년\s*\d{1,2}\s*월|지난\s*[^\s,.]+|어제|오늘|오전\s*\d{1,2}\s*시|오후\s*\d{1,2}\s*시|\d{1,2}\s*월\s*\d{1,2}\s*일)/;
const MEDIA_WORDS = ["카카오톡", "카톡", "문자", "전화", "이메일", "메일", "대면", "사무실", "회사", "현장", "집", "계좌"];
const ACTOR_WORDS = ["상대방", "본인", "회사", "직장상사", "동료", "친구", "가족", "A씨", "B씨"];
const DAMAGE_WORDS = ["피해", "손해", "손실", "치료", "진단", "환불", "반환", "금액", "지연", "차질", "불이익"];

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

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
    const allText = [
      input.lastAnswer,
      ...input.events.flatMap((event) => [event.description, event.action, event.location, event.actor, event.damage].filter(Boolean)),
    ].join(" ");
    const previous = input.previousQuestions.join(" ");
    const hasAsked = (keywords: string[]) => keywords.some((keyword) => previous.includes(keyword));
    const hasLinkedEvidence = input.events.some((event) => event.evidenceIds.length > 0) || input.evidences.length > 0;
    const mentionsEvidence = includesAny(allText, EVIDENCE_WORDS);
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

    const basicMissingFields = [
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
    ];

    const basicNext = basicMissingFields.find((field) => field.isMissing && !field.asked);
    if (basicNext) return { question: basicNext.question, reason: basicNext.reason, isComplete: false };

    const contextualQuestions = [
      {
        applies: includesAny(allText, MONEY_WORDS),
        asked: hasAsked(["금액", "입금", "송금", "이체", "계좌", "반환"]),
        question: "금액과 돈의 흐름을 나눠 적어 주세요. 누가 누구에게 얼마를 요청했는지, 실제 입금/송금이 있었는지, 확인 가능한 계좌나 영수증이 있는지 구분하면 됩니다.",
        reason: "money-flow",
      },
      {
        applies: includesAny(allText, REPEAT_WORDS),
        asked: hasAsked(["반복", "첫 시점", "최근 시점", "횟수", "간격"]),
        question: "비슷한 일이 반복되었다면 첫 시점, 최근 시점, 대략적인 횟수나 간격을 나눠 적어 주세요. 확인되는 날짜가 일부만 있어도 괜찮습니다.",
        reason: "repeat-pattern",
      },
      {
        applies: includesAny(allText, PROMISE_WORDS),
        asked: hasAsked(["약속", "보장", "요청", "권유", "실제 표현", "전달 매체"]),
        question: "약속이나 요청이 있었다면 실제 표현에 가깝게 적어 주세요. 누가 어떤 매체로 말했는지, 답변이나 확인 메시지가 있었는지도 함께 알려 주세요.",
        reason: "promise-expression",
      },
      {
        applies: includesAny(allText, THIRD_PARTY_WORDS),
        asked: hasAsked(["제3자", "목격", "증인", "같이 있던", "역할"]),
        question: "제3자가 보거나 들은 부분이 있다면 이름보다 역할 중심으로 정리해 주세요. 그 사람이 직접 본 내용과 전해 들은 내용을 구분하면 좋습니다.",
        reason: "third-party",
      },
      {
        applies: mentionsEvidence && !hasLinkedEvidence,
        asked: hasAsked(["자료가 어느 사실", "뒷받침", "파일명", "캡처", "원본"]),
        question: "방금 언급한 자료가 어느 말이나 행동을 뒷받침하는지 연결해 주세요. 파일명, 캡처 시점, 원본/사본 여부처럼 확인 가능한 정보만 적으면 됩니다.",
        reason: "evidence-link",
      },
      {
        applies: includesAny(allText, CONTACT_WORDS),
        asked: hasAsked(["대화", "매체", "보낸", "받은", "저장 위치", "원문"]),
        question: "대화나 연락이 핵심이라면 보낸 사람, 받은 사람, 날짜/시간, 저장 위치를 확인해 주세요. 원문을 그대로 보관한 자료가 있는지도 함께 적어 주세요.",
        reason: "message-context",
      },
      {
        applies: includesAny(allText, RISKY_WORDS),
        asked: hasAsked(["강한 표현", "직접 본", "추정", "사실 표현"]),
        question: "강한 표현은 사실 표현으로 나눠 볼게요. 직접 본 행동이나 들은 말과, 추정하거나 느낀 부분을 따로 적어 주세요.",
        reason: "risky-language",
      },
      {
        applies: input.events.length >= 2,
        asked: hasAsked(["전후관계", "순서", "이전 기록", "다음 기록"]),
        question: "앞서 적은 일과 이번 일의 전후관계를 확인해 주세요. 어느 일이 먼저였고, 그 다음 어떤 변화가 있었나요?",
        reason: "sequence",
      },
    ];

    const contextualNext = contextualQuestions.find((field) => field.applies && !field.asked);
    if (contextualNext) return { question: contextualNext.question, reason: contextualNext.reason, isComplete: false };

    const missingFields = [
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
        isMissing: !hasLinkedEvidence && !mentionsEvidence,
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
