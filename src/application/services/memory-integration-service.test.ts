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
  });
});
