import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fictionalCase, type FictionalScenario } from "./DeviceWorkspaceState";
import { indexCase, selectCaseRows } from "./CaseIndex";
import { anonymize, restoreInspection } from "./PrivateData";

const demo: FictionalScenario = JSON.parse(
  readFileSync(
    new URL("../../../public/demo/scenario.json", import.meta.url),
    "utf8",
  ),
);

test("the three case axes return original, scoped statements in chronological order", () => {
  const sample = fictionalCase(demo),
    index = indexCase(sample);
  assert.equal(index.rows.length, 6);
  assert.equal(index.people.length, 4);
  assert.equal(index.graph.edges.length, 6);
  assert.equal(index.times.length, 6);
  assert.equal(index.cells.length, 12);
  for (const row of index.rows) {
    assert(row.span && row.sourceText);
    assert.equal(row.sourceText.slice(row.span.start, row.span.end), row.quote);
  }
  const paid = index.rows.find((r) => r.quote.includes("5만원"))!;
  const sender = index.people.find((p) => p.name === "김민수")!;
  assert.deepEqual(
    selectCaseRows(index, sender.id, paid.datetime!, paid.id, false),
    [paid],
  );
  assert.equal(selectCaseRows(index, "", "", "", true).length, 1);
  const hearsay = index.rows.find((r) => r.quote.includes("들었다"))!;
  assert.equal(hearsay.relations[0].target, null);
  assert.deepEqual(hearsay.missing, ["상대방", "금액"]);
  assert(
    index.rows.some((r) => r.relations.some((e) => e.polarity === "denied")),
  );
  assert(
    index.rows.some((r) => r.relations.some((e) => e.polarity === "planned")),
  );
  assert(index.graph.edges.every((e) => e.confirmed));
  assert.deepEqual(
    index.timeline.map((e) => e.quote),
    selectCaseRows(index, "", "", "", false).map((r) => r.quote),
  );
  sample.id = "another-case";
  assert(
    !indexCase(sample).rows.some((r) =>
      index.rows.some((original) => r.id === original.id),
    ),
  );
  sample.events[0].datetime = null;
  assert.equal(
    selectCaseRows(indexCase(sample), "", "unknown", "", true)[0].quote,
    sample.events[0].quote,
  );
});

test("distinct occurrences, uncertain identities and archived text keep their own provenance", () => {
  const sample = fictionalCase(demo),
    f = sample.evidence[1],
    analysis = f.analysis!;
  sample.evidence = [f];
  sample.events = [sample.events[1]];
  const c = analysis.candidates[0],
    r = analysis.relations![0];
  f.text = [c.quote, c.quote].join("\n");
  const second = { start: c.quote.length + 1, end: f.text.length };
  analysis.candidates = [
    { ...c, sourceSpan: r.sourceSpan },
    { ...c, id: "1", sourceSpan: second },
  ];
  analysis.relations = [
    r,
    { ...r, id: "r1", candidateId: "1", sourceSpan: second },
  ];
  const index = indexCase(sample);
  assert.deepEqual(
    index.graph.edges.map((e) => e.confirmed),
    [true, false],
  );
  assert.deepEqual(
    index.rows.map((row) => row.span?.start),
    [0, second.start],
  );
  const extra = structuredClone(f);
  extra.id = "another-file";
  for (const file of [f, extra])
    for (const relation of file.analysis!.relations!) {
      relation.actorAmbiguous = true;
      const mention = relation.mentions.find((m) => m.text === relation.actor);
      if (mention) mention.ambiguous = true;
    }
  sample.evidence.push(extra);
  assert.equal(
    indexCase(sample).people.filter((p) => p.name === r.actor).length,
    2,
  );
  f.versions = [{ text: f.text, analysis, createdAt: sample.createdAt }];
  f.text = "수정된 진술입니다.";
  f.analysis = undefined;
  const archived = indexCase(sample);
  const previous = archived.rows.find(
    (row) => row.reviewedId === sample.events[0].id,
  )!;
  assert(
    previous.previousVersion && previous.missing.includes("현재 원문 대조"),
  );
  assert.equal(previous.sourceText, f.versions[0].text);
  assert(archived.graph.edges.every((e) => e.evidenceId !== f.id));
  assert.equal(archived.timeline.length, 1);
});

test("masked UTF-16 candidate offsets are checked and restored before indexing", () => {
  const text = "🙂 김민수에게 연락했다. 🙂 김민수에게 연락했다.";
  const masked = anonymize(text, ["김민수"]),
    quote = masked.text.split(". ")[1];
  const offset = masked.text.lastIndexOf(quote);
  const base = demo.files[0].analysis;
  const result = {
    ...base,
    relations: [],
    candidates: [
      {
        ...base.candidates[0],
        quote,
        sourceSpan: { start: offset, end: masked.text.length },
      },
    ],
  };
  const candidate = restoreInspection(result, text, masked).candidates[0];
  assert.equal(candidate.sourceSpan?.start, text.lastIndexOf("🙂"));
  assert.equal(
    text.slice(candidate.sourceSpan!.start, candidate.sourceSpan!.end),
    candidate.quote,
  );
  result.candidates[0].sourceSpan.start++;
  assert.equal(restoreInspection(result, text, masked).candidates.length, 0);
});
