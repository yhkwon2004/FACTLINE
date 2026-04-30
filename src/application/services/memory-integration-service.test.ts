import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMemoryText } from "./MemoryIntegrationService";

describe("MemoryIntegrationService", () => {
  it("parses dated messenger lines without inventing facts", () => {
    const parsed = parseMemoryText("2026-04-30 14:20 상대방: 안녕하세요\n나: 확인했습니다");

    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].participantName, "상대방");
    assert.equal(parsed[0].content, "안녕하세요");
    assert.equal(parsed[0].occurredAt?.getFullYear(), 2026);
    assert.equal(parsed[0].occurredAt?.getMonth(), 3);
    assert.equal(parsed[0].occurredAt?.getDate(), 30);
    assert.equal(parsed[0].occurredAt?.getHours(), 14);
    assert.equal(parsed[0].occurredAt?.getMinutes(), 20);
    assert.equal(parsed[1].participantName, "나");
    assert.equal(parsed[1].occurredAt, null);
    assert.equal(parsed[1].direction, "OUTBOUND");
  });

  it("parses KakaoTalk exported bracket lines with active date headers", () => {
    const parsed = parseMemoryText("--------------- 2026년 4월 30일 목요일 ---------------\n[나] [오후 2:05] 보낸 메시지\n[상대방] [오후 2:07] 받은 메시지");

    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].participantName, "나");
    assert.equal(parsed[0].direction, "OUTBOUND");
    assert.equal(parsed[0].occurredAt?.getHours(), 14);
    assert.equal(parsed[0].occurredAt?.getMinutes(), 5);
    assert.equal(parsed[1].participantName, "상대방");
    assert.equal(parsed[1].direction, "INBOUND");
  });
});
