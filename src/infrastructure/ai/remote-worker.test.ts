import assert from "node:assert/strict";
import { test } from "node:test";
import { checkWorkerPayload } from "./remote-worker";

test("device mode permits only anonymous text jobs at the worker boundary", () => {
  const previous = process.env.PRIVACY_MODE;
  try {
    process.env.PRIVACY_MODE = "device";
    checkWorkerPayload("inspect", { text: "인물A는 인물B에게 송금했다.", referenceDate: "2026-11-19" });
    checkWorkerPayload("status", {});
    assert.throws(() => checkWorkerPayload("extract", { content: "file bytes" }));
    assert.throws(() => checkWorkerPayload("inspect", { text: "memo", documents: [] }));
    assert.throws(() => checkWorkerPayload("legal", { text: "가상 연락처 010-1234-5678" }));
    assert.throws(() => checkWorkerPayload("chat", { context: "메모", question: "이메일 demo@example.test" }));
  } finally {
    if (previous === undefined) delete process.env.PRIVACY_MODE;
    else process.env.PRIVACY_MODE = previous;
  }
});
