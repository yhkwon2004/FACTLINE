import type { Candidate } from "../../infrastructure/ai/local-worker";
import type { DeviceEvent, DeviceEvidence } from "./DeviceWorkspaceState";
import { orderedEvents } from "./DeviceWorkspaceState";
import {
  participantId,
  relationshipGraph,
  type SourceRelation,
} from "./RelationshipGraph";

type File = Pick<
  DeviceEvidence,
  "id" | "name" | "text" | "analysis" | "versions"
>;
type Span = { start: number; end: number };
type Person = {
  id: string;
  name: string;
  ambiguous: boolean;
  fileName: string;
};
type CaseRow = {
  id: string;
  evidenceId: string;
  fileName: string;
  quote: string;
  sourceText: string | null;
  span: Span | null;
  previousVersion: boolean;
  datetime: string | null;
  approximate: boolean;
  dayOnly: boolean;
  location: string | null;
  reviewedId: string | null;
  relations: SourceRelation[];
  missing: string[];
};
const unknown = "unknown";
const recordKey = (file: string, candidate: string, quote: string) =>
  JSON.stringify([file, candidate, quote]);
const validSpan = (text: string, quote: string, span?: Span) =>
  !!span &&
  Number.isInteger(span.start) &&
  Number.isInteger(span.end) &&
  span.start >= 0 &&
  span.end > span.start &&
  span.end <= text.length &&
  text.slice(span.start, span.end) === quote;

function locate(text: string, quote: string, hint?: Span): Span | null {
  if (validSpan(text, quote, hint)) return hint!;
  if (!quote) return null;
  const start = text.indexOf(quote);
  // Old records have no offsets; repeated quotations cannot identify one occurrence.
  return start >= 0 && text.indexOf(quote, start + 1) < 0
    ? { start, end: start + quote.length }
    : null;
}

export function indexCase(item: {
  id: string;
  evidence: File[];
  events: DeviceEvent[];
}) {
  const people: Person[] = [],
    times: Array<string | null> = [],
    rows: CaseRow[] = [];
  const cells: Array<[person: number, time: number, event: number]> = [];
  const personIndices = new Map<string, number>(),
    timeIndices = new Map<string | null, number>();
  const confirmations = new Map(
    item.events.map((e) => [
      recordKey(e.evidenceId, e.candidateId, e.quote),
      e,
    ]),
  );
  const projected = new Set<string>();
  const filesById = new Map(item.evidence.map((f) => [f.id, f]));
  const graphFiles: Parameters<typeof relationshipGraph>[0] = [];
  const graphFacts: Parameters<typeof relationshipGraph>[1] = [];

  function add(
    file: File | undefined,
    candidate: Candidate | undefined,
    reviewed: DeviceEvent | undefined,
    relations: SourceRelation[],
    sourceText: string | null,
    previousVersion: boolean,
  ) {
    const quote = reviewed?.quote ?? candidate!.quote;
    const fileId = file?.id ?? reviewed!.evidenceId;
    const matches = (value: string | null | undefined) =>
      !!value && quote.includes(value);
    const actor = reviewed?.actor ?? candidate?.actor;
    const participants = new Set<number>();
    function participant(
      name: string,
      kind: "person" | "organization",
      ambiguous = false,
    ) {
      const id = name ? participantId(name, kind, fileId, ambiguous) : unknown;
      let index = personIndices.get(id);
      if (index === undefined) {
        index = people.length;
        personIndices.set(id, index);
        people.push({
          id,
          name: name || "인물 미상",
          ambiguous,
          fileName: file?.name ?? "",
        });
      }
      participants.add(index);
    }
    for (const relation of relations) {
      participant(relation.actor, relation.actorKind, relation.actorAmbiguous);
      if (relation.target)
        participant(
          relation.target,
          relation.targetKind ?? "person",
          relation.targetAmbiguous,
        );
      for (const m of relation.mentions ?? []) {
        if (
          matches(m.text) &&
          (m.kind === "person" || m.kind === "organization")
        )
          participant(m.text, m.kind, m.ambiguous);
      }
    }
    if (!participants.size) participant(matches(actor) ? actor! : "", "person");
    const rawDate = reviewed ? reviewed.datetime : candidate?.datetime;
    const datetime =
      rawDate && Number.isFinite(Date.parse(rawDate))
        ? new Date(rawDate).toISOString()
        : null;
    const approximate = reviewed
      ? reviewed.approximate
      : candidate?.isApproximateTime !== false;
    const dayOnly =
      !!datetime &&
      approximate &&
      !!candidate?.approximateTimeText &&
      !/(?:\d\s*시|\d:\d|오전|오후)/.test(candidate.approximateTimeText) &&
      (!reviewed ||
        Date.parse(reviewed.datetime ?? "") ===
          Date.parse(candidate.datetime ?? ""));
    const time = dayOnly
      ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(
          new Date(datetime!),
        )
      : datetime;
    let timeIndex = timeIndices.get(time);
    if (timeIndex === undefined) {
      timeIndex = times.length;
      timeIndices.set(time, timeIndex);
      times.push(time);
    }
    for (const p of participants) cells.push([p, timeIndex, rows.length]);

    const span =
      sourceText === null
        ? null
        : locate(
            sourceText,
            quote,
            candidate?.sourceSpan ?? relations[0]?.sourceSpan,
          );
    const missing: string[] = [];
    if (!datetime) missing.push("시점");
    if (!matches(actor) && !relations.length) missing.push("행위자");
    if (relations.some((r) => r.actorAmbiguous || r.targetAmbiguous))
      missing.push("인물 식별");
    if (
      relations.some(
        (r) =>
          !r.target &&
          ["payment", "threat", "violence", "communication", "family"].includes(
            r.kind,
          ),
      )
    )
      missing.push("상대방");
    if (relations.some((r) => r.kind === "payment" && !r.amount))
      missing.push("금액");
    if (!span) missing.push(sourceText === null ? "근거 원문" : "원문 위치");
    if (previousVersion) missing.push("현재 원문 대조");
    rows.push({
      id: JSON.stringify([
        item.id,
        fileId,
        candidate?.id ?? null,
        reviewed?.id ?? null,
      ]),
      evidenceId: fileId,
      fileName: file?.name ?? "기기에서 찾을 수 없는 자료",
      quote,
      sourceText,
      span,
      previousVersion,
      datetime,
      approximate,
      dayOnly,
      relations,
      reviewedId: reviewed?.id ?? null,
      missing,
      location: reviewed ? reviewed.location : (candidate?.location ?? null),
    });
  }

  for (const file of item.evidence) {
    const analysis = file.analysis;
    if (!analysis) continue;
    const relationsByCandidate = new Map<string, SourceRelation[]>();
    for (const r of analysis.relations ?? []) {
      if (
        !r.actor ||
        !r.action ||
        !r.quote.includes(r.actor) ||
        !r.quote.includes(r.action) ||
        (r.target && !r.quote.includes(r.target)) ||
        !validSpan(file.text, r.quote, r.sourceSpan)
      )
        continue;
      const list = relationsByCandidate.get(r.candidateId) ?? [];
      list.push(r);
      relationsByCandidate.set(r.candidateId, list);
    }
    const validRelations: SourceRelation[] = [];
    for (const candidate of analysis.candidates) {
      if (!candidate.quote || !file.text.includes(candidate.quote)) continue;
      if (
        candidate.sourceSpan &&
        !validSpan(file.text, candidate.quote, candidate.sourceSpan)
      )
        continue;
      const relations = (relationsByCandidate.get(candidate.id) ?? []).filter(
        (r) =>
          r.quote === candidate.quote &&
          (!candidate.sourceSpan ||
            r.sourceSpan.start === candidate.sourceSpan.start),
      );
      validRelations.push(...relations);
      const reviewed = confirmations.get(
        recordKey(file.id, candidate.id, candidate.quote),
      );
      if (reviewed) {
        projected.add(reviewed.id);
        graphFacts.push({
          id: reviewed.id,
          title: reviewed.quote,
          rawStatement: reviewed.quote,
          evidenceIds: [file.id],
          actor: reviewed.actor,
          candidateId: reviewed.candidateId,
        });
      }
      add(file, candidate, reviewed, relations, file.text, false);
    }
    graphFiles.push({
      id: file.id,
      name: file.name,
      analysis: { relations: validRelations, candidates: analysis.candidates },
    });
  }
  for (const reviewed of item.events) {
    if (projected.has(reviewed.id)) continue;
    const file = filesById.get(reviewed.evidenceId);
    const current = !!reviewed.quote && !!file?.text.includes(reviewed.quote);
    const version = file?.versions
      ?.slice()
      .reverse()
      .find((v) => !!reviewed.quote && v.text.includes(reviewed.quote));
    const text = current ? file!.text : (version?.text ?? null);
    const oldCandidate = version?.analysis?.candidates.find(
      (c) => c.id === reviewed.candidateId && c.quote === reviewed.quote,
    );
    const oldRelations = (version?.analysis?.relations ?? []).filter(
      (r) =>
        r.candidateId === reviewed.candidateId &&
        r.quote === reviewed.quote &&
        validSpan(version!.text, r.quote, r.sourceSpan) &&
        r.quote.includes(r.actor) &&
        r.quote.includes(r.action) &&
        (!r.target || r.quote.includes(r.target)),
    );
    add(
      file,
      current ? undefined : oldCandidate,
      reviewed,
      current ? [] : oldRelations,
      text,
      !current && !!version,
    );
    // A legacy reviewed sentence can remain on the timeline even if its original is unavailable.
    if (current)
      graphFacts.push({
        id: reviewed.id,
        title: reviewed.quote,
        rawStatement: reviewed.quote,
        evidenceIds: [reviewed.evidenceId],
        actor: reviewed.actor,
        candidateId: reviewed.candidateId,
      });
  }
  return {
    caseId: item.id,
    people,
    times,
    rows,
    cells,
    graph: relationshipGraph(graphFiles, graphFacts),
    timeline: orderedEvents(item),
    pendingFiles: item.evidence.filter((f) => !f.analysis).length,
  };
}
export type CaseIndex = ReturnType<typeof indexCase>;

export function selectCaseRows(
  index: CaseIndex,
  person: string,
  time: string,
  event: string,
  missingOnly: boolean,
) {
  const indices = new Set<number>();
  for (const [p, t, e] of index.cells) {
    if (person && index.people[p].id !== person) continue;
    if (time && (index.times[t] ?? unknown) !== time) continue;
    if (event && index.rows[e].id !== event) continue;
    if (!missingOnly || index.rows[e].missing.length) indices.add(e);
  }
  return Array.from(indices, (i) => index.rows[i]).sort(
    (a, b) =>
      (a.datetime ? Date.parse(a.datetime) : Infinity) -
      (b.datetime ? Date.parse(b.datetime) : Infinity),
  );
}
