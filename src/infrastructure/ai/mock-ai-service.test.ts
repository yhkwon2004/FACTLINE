import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockAIService } from "./MockAIService";

function baseInput(overrides: Partial<Parameters<MockAIService["suggestInterviewFollowUp"]>[0]> = {}) {
  const lastAnswer = overrides.lastAnswer ?? "2026년 4월 30일 오후 상대방이 카카오톡으로 계약금을 입금해 달라고 했습니다.";

  return {
    caseTitle: "셀프 기록",
    lastAnswer,
    previousQuestions: ["시점은 어느 정도까지 확인되나요?", "관여한 사람을 역할 중심으로 정리해 볼게요."],
    events: [
      {
        title: "기록",
        description: lastAnswer,
        datetime: null,
        approximateTimeText: "2026년 4월 30일 오후",
        location: "카카오톡",
        actor: "상대방",
        action: lastAnswer,
        damage: null,
        evidenceIds: [],
      },
    ],
    evidences: [],
    ...overrides,
  };
}

describe("MockAIService follow-up selection", () => {
  it("asks about money flow when a payment request appears in the answer", async () => {
    const service = new MockAIService();
    const output = await service.suggestInterviewFollowUp(baseInput());

    assert.equal(output.reason, "money-flow");
    assert.match(output.question ?? "", /금액|입금|송금|계좌/);
  });

  it("asks about repeat pattern when the user describes repeated behavior", async () => {
    const service = new MockAIService();
    const answer = "오늘 회사에서 같은 요청이 계속 반복됐고 여러 번 다시 연락이 왔습니다.";
    const output = await service.suggestInterviewFollowUp(baseInput({
      lastAnswer: answer,
      previousQuestions: ["시점은 어느 정도까지 확인되나요?", "그 일이 발생한 장소나 매체는 무엇인가요?", "관여한 사람을 역할 중심으로 정리해 볼게요."],
      events: [
        {
          title: "반복 기록",
          description: answer,
          datetime: null,
          approximateTimeText: "오늘",
          location: "회사",
          actor: "상대방",
          action: answer,
          damage: null,
          evidenceIds: [],
        },
      ],
    }));

    assert.equal(output.reason, "repeat-pattern");
    assert.match(output.question ?? "", /첫 시점|최근 시점|횟수|간격/);
  });

  it("asks users to connect mentioned evidence to a specific fact", async () => {
    const service = new MockAIService();
    const answer = "카톡 캡처 자료가 있고 상대방이 보낸 문구가 남아 있습니다.";
    const output = await service.suggestInterviewFollowUp(baseInput({
      lastAnswer: answer,
      previousQuestions: ["시점은 어느 정도까지 확인되나요?", "그 일이 발생한 장소나 매체는 무엇인가요?", "관여한 사람을 역할 중심으로 정리해 볼게요."],
      events: [
        {
          title: "자료 언급",
          description: answer,
          datetime: null,
          approximateTimeText: "오늘",
          location: "카카오톡",
          actor: "상대방",
          action: answer,
          damage: null,
          evidenceIds: [],
        },
      ],
    }));

    assert.equal(output.reason, "evidence-link");
    assert.match(output.question ?? "", /자료|뒷받침|파일명|원본/);
  });
});
