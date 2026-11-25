import assert from "node:assert/strict";
import {
  anonymize,
  residualIdentifiers,
  restoreInspection,
} from "./PrivateData";
import {
  createTransfer,
  openTransfer,
  passwordKey,
  encrypt,
  decrypt,
} from "../../infrastructure/storage/DeviceVault";
import {
  newCase,
  validateState,
  confirmCandidate,
  orderedEvents,
} from "./DeviceWorkspaceState";
import type {
  Inspection,
  Candidate,
} from "../../infrastructure/ai/local-worker";
const source =
  "🙂 인물A는 김민수에게 연락했다. 김민수의 연락처는 010-1234-5678, x@example.test이다.";
const redacted = anonymize(source, ["김민수"]);
assert(!redacted.text.includes("김민수"));
assert(!redacted.text.includes("010-1234-5678"));
assert(!redacted.text.includes("x@example.test"));
assert(redacted.text.includes("인물A"));
assert.equal(residualIdentifiers(redacted.text).length, 0);
const repeated = anonymize("김민수가 김민수에게 연락했다.", ["김민수"]);
assert.equal(repeated.mappings.length, 1);
const tokenized = redacted.text.split(".")[0] + ".";
const actor = redacted.mappings.find((m) => m.original === "김민수")!.token;
const result = {
  text: redacted.text,
  relations: [
    {
      id: "r0",
      candidateId: "0",
      actor: "인물A",
      target: actor,
      actorKind: "person",
      targetKind: "person",
      action: "연락했다",
      kind: "communication",
      score: 0.9,
      polarity: "reported",
      directed: true,
      quote: tokenized,
      sourceSpan: { start: 0, end: tokenized.length },
      mentions: [],
    },
  ],
  candidates: [
    {
      id: "0",
      quote: tokenized,
      title: "",
      datetime: null,
      isApproximateTime: true,
      location: null,
      actor: "인물A",
      action: "연락했다",
      damage: null,
      approximateTimeText: null,
    },
  ],
  keywords: [],
  associations: [],
  tokens: [],
} as unknown as Inspection;
const restored = restoreInspection(result, source, redacted);
assert.equal(restored.relations![0].target, "김민수");
assert.equal(
  restored.relations![0].quote,
  source.slice(0, restored.relations![0].sourceSpan.end),
);
assert.equal(
  restoreInspection(
    { ...result, relations: [{ ...result.relations![0], quote: "없는 문장" }] },
    source,
    redacted,
  ).relations!.length,
  0,
);
const secret = { records: [{ name: "선택한 자료", text: "민감 원문" }] };
const transfer = await createTransfer(secret);
assert.equal(transfer.token.length, 43);
assert(!JSON.stringify(transfer.file).includes("민감 원문"));
assert.deepEqual(await openTransfer(transfer.file, transfer.token), secret);
await assert.rejects(openTransfer(transfer.file, "A".repeat(43)));
await assert.rejects(
  openTransfer(
    { ...transfer.file, data: transfer.file.data.slice(0, -4) + "AAAA" },
    transfer.token,
  ),
);
const salt = crypto.getRandomValues(new Uint8Array(16)),
  key = await passwordKey("synthetic-test-passphrase", salt),
  box = await encrypt(key, new TextEncoder().encode("private"), "one");
await assert.rejects(decrypt(key, box, "two"));
const wrong = await passwordKey("wrong-test-passphrase", salt);
await assert.rejects(decrypt(wrong, box, "one"));
const c = newCase("합성 검사");
c.evidence.push({
  id: "e",
  name: "합성",
  type: "text/plain",
  hash: "",
  size: 1,
  text: "먼저 연락했다. 나중에 송금했다.",
  date: "2026-11-19",
  createdAt: new Date().toISOString(),
  analysis: {
    ...result,
    candidates: [
      {
        ...result.candidates[0],
        id: "a",
        quote: "나중에 송금했다.",
        datetime: "2026-11-19T14:00:00+09:00",
      },
      {
        ...result.candidates[0],
        id: "b",
        quote: "먼저 연락했다.",
        datetime: "2026-11-19T10:00:00+09:00",
      },
    ],
  },
});
const a = c.evidence[0].analysis!.candidates[0],
  b = c.evidence[0].analysis!.candidates[1];
confirmCandidate(c, "e", a);
confirmCandidate(c, "e", a);
confirmCandidate(c, "e", b);
assert.equal(c.events.length, 2);
assert.doesNotThrow(() => validateState({version:1,cases:[c]}));
assert.throws(() => validateState({version:1,cases:[c,c]}));
assert.throws(() => validateState({version:1,cases:[{...c,diagram:{}}]}));
assert.equal(orderedEvents(c)[0].quote, b.quote);
assert.throws(() => confirmCandidate(c, "e", { ...a, quote: "없는 원문" }));
c.locked = true;
assert.throws(() => confirmCandidate(c, "e", b));
console.log(
  "PASS local redaction/collision/Unicode provenance, token-only transfer/tamper/wrong token, authenticated encryption and idempotent chronological source links",
);
