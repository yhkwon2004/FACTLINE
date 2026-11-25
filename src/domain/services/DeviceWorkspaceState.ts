import { z } from "zod";
import { diagramSchema,emptyDiagram, type DiagramSnapshot } from "./DiagramDocument";
import { relationshipGraph } from "./RelationshipGraph";
import { IncidentEvent } from "../entities/IncidentEvent";
import { TimelineService } from "./TimelineService";
import type {
  Inspection,
  Candidate,
} from "../../infrastructure/ai/local-worker";
import type { AudioSegment } from "../../presentation/components/AudioTranscript";
export type DeviceEvidence = {
  id: string;
  fileId?: string;
  name: string;
  type: string;
  hash: string;
  size: number;
  text: string;
  date: string;
  versions?: Array<{ text: string; analysis?: Inspection; createdAt: string }>;
  analysis?: Inspection;
  segments?: AudioSegment[];
  createdAt: string;
};
export type DeviceEvent = {
  id: string;
  evidenceId: string;
  candidateId: string;
  quote: string;
  datetime: string | null;
  approximate: boolean;
  actor: string | null;
  location: string | null;
  createdAt: string;
};
export type DeviceCase = {
  id: string;
  title: string;
  isDemo?: boolean;
  description: string;
  createdAt: string;
  locked: boolean;
  evidence: DeviceEvidence[];
  events: DeviceEvent[];
  diagram: DiagramSnapshot;
};
export type DeviceState = { version: 1; cases: DeviceCase[] };
export const newState = (): DeviceState => ({ version: 1, cases: [] });
export const newCase = (title: string): DeviceCase => ({
  id: crypto.randomUUID(),
  title,
  description: "",
  createdAt: new Date().toISOString(),
  locked: false,
  evidence: [],
  events: [],
  diagram: { revision: 0, updatedAt: null, document: emptyDiagram() },
});
export function validateState(input: unknown): DeviceState {
  if (!workspaceSchema.safeParse(input).success)
    throw Error("보관함 구조를 확인해 주세요.");
  // Preserve additional fields from older analyses and archives, including model provenance.
  return input as DeviceState;
}
const id = z.string().min(1).max(512);
const text = z.string(), date = text.refine(v => Number.isFinite(Date.parse(v)));
const analysis = z.object({
  text, candidates: z.array(z.object({
    id, quote: text, title: text, datetime: date.nullable(),
    actor: text.nullable(), location: text.nullable(), action: text,
  })), relations: z.array(z.object({
    id, candidateId: id, actor: text, target: text.nullable(), action: text, quote: text,
    kind: text, polarity: z.enum(["reported","denied","uncertain","planned"]),
    directed: z.boolean(), score: z.number(), actorKind: z.enum(["person","organization"]),
  })).optional(),
});
const uniqueIds = (rows: Array<{id:string}>) => new Set(rows.map(row => row.id)).size === rows.length;
const workspaceSchema = z.object({
  version: z.literal(1), cases: z.array(z.object({
    id, title: text, description: text, locked: z.boolean(), createdAt: date,
    evidence: z.array(z.object({
      id, fileId: id.optional(), name: text, type: text, size: z.number().int().nonnegative(),
      hash: text, text, date: text, createdAt: date, analysis: analysis.optional(),
      versions: z.array(z.object({text, analysis: analysis.optional(), createdAt: date})).optional(),
      segments: z.array(z.object({start:z.number().nonnegative(),end:z.number().nonnegative(),text})).optional(),
    })).refine(uniqueIds),
    events: z.array(z.object({
      id, evidenceId: text, candidateId: id, quote:text, datetime: date.nullable(), approximate: z.boolean(),
      actor: text.nullable(), location: text.nullable(), createdAt: date,
    })).refine(uniqueIds),
    diagram: z.object({revision:z.number().int().nonnegative(),updatedAt:date.nullable(),document:diagramSchema}),
  })).max(200).refine(uniqueIds),
});
export function confirmCandidate(
  c: DeviceCase,
  evidenceId: string,
  candidate: Candidate,
) {
  if (c.locked) throw Error("잠긴 사건입니다.");
  const e = c.evidence.find((e) => e.id === evidenceId);
  if (
    !e ||
    !e.text.includes(candidate.quote) ||
    !e.analysis?.candidates.some(
      (x) => x.id === candidate.id && x.quote === candidate.quote,
    )
  )
    throw Error("근거 원문을 확인할 수 없습니다.");
  if (
    !c.events.some(
      (x) => x.evidenceId === evidenceId && x.candidateId === candidate.id,
    )
  )
    c.events.push({
      id: crypto.randomUUID(),
      evidenceId,
      candidateId: candidate.id,
      quote: candidate.quote,
      datetime: candidate.datetime,
      approximate: candidate.isApproximateTime !== false,
      actor: candidate.actor,
      location: candidate.location,
      createdAt: new Date().toISOString(),
    });
}
export function orderedEvents(c: Pick<DeviceCase,"id"|"events">) {
  const entries = c.events.map(
    (e) =>
      new IncidentEvent({
        id: e.id,
        caseId: c.id,
        title: e.quote,
        rawStatement: e.quote,
        description: e.quote,
        datetime: e.datetime ? new Date(e.datetime) : null,
        isApproximateTime: e.approximate,
        createdAt: new Date(e.createdAt),
      }),
  );
  return new TimelineService()
    .generate(entries)
    .map((e) => c.events.find((v) => v.id === e.id)!);
}

export type FictionalScenario = {
  caseId: string;
  title: string;
  notice: string;
  createdAt: string;
  files: Array<{
    id: string;
    name: string;
    text: string;
    date: string;
    sha256: string;
    analysis: Inspection;
  }>;
};
export function fictionalCase(demo: FictionalScenario): DeviceCase {
  const c = newCase(demo.title);
  c.id = demo.caseId;
  c.description = demo.notice;
  c.isDemo = true;
  c.createdAt = demo.createdAt;
  for (const f of demo.files) {
    c.evidence.push({
      id: f.id,
      name: f.name,
      type: "text/plain",
      hash: f.sha256,
      size: new TextEncoder().encode(f.text).length,
      text: f.text,
      date: f.date,
      createdAt: demo.createdAt,
      analysis: f.analysis,
    });
    for (const candidate of f.analysis.candidates)
      confirmCandidate(c, f.id, candidate);
  }
  const graph = relationshipGraph(
    c.evidence.map((e) => ({ id: e.id, name: e.name, analysis: e.analysis })),
    [],
  );
  const places: Record<string, { x: number; y: number }> = {
    김민수: { x: 220, y: 190 },
    이서연: { x: 600, y: 190 },
    박지훈: { x: 220, y: 650 },
    한수빈: { x: 600, y: 650 },
  };
  c.diagram.document.title = "가상 행사 정산 · 인물과 진술";
  c.diagram.document.groups = [
    {
      id: "group:contract",
      label: "계약 · 지급",
      x: 60,
      y: 60,
      width: 1090,
      height: 320,
      color: "blue",
    },
    {
      id: "group:statements",
      label: "확인 · 진술",
      x: 60,
      y: 500,
      width: 1090,
      height: 340,
      color: "slate",
    },
  ];
  for (const n of graph.nodes)
    c.diagram.document.nodes[n.id] = {
      ...(places[n.label] ?? { x: 990, y: 650 }),
      subtitle: n.kind === "action" ? "전언 · 사실 미확인" : "합성 인물",
      groupId:
        n.kind === "action" || ["박지훈", "한수빈"].includes(n.label)
          ? "group:statements"
          : "group:contract",
      color: n.kind === "action" ? "amber" : "slate",
    };
  c.diagram.document.manualNodes.push({
    id: "manual:demo-context",
    label: "행사 제작 의뢰",
    kind: "note",
  });
  c.diagram.document.nodes["manual:demo-context"] = {
    x: 990,
    y: 190,
    subtitle: "설명용 카드 · 근거 미연결",
    groupId: "group:contract",
    color: "blue",
  };
  for (const edge of graph.edges) {
    if (edge.kind === "payment" && edge.target === "person:이서연")
      c.diagram.document.edges[edge.id] = { labelX: 410, labelY: 330 };
    else if (edge.kind === "work")
      c.diagram.document.edges[edge.id] = { labelX: 410, labelY: 105 };
    else if (edge.polarity === "planned")
      c.diagram.document.edges[edge.id] = {
        labelX: 550,
        labelY: 430,
        color: "violet",
        dashed: true,
      };
    else if (edge.polarity === "denied")
      c.diagram.document.edges[edge.id] = {
        labelX: 220,
        labelY: 430,
        color: "rose",
        dashed: true,
      };
    else if (edge.source === "person:박지훈")
      c.diagram.document.edges[edge.id] = { labelX: 900, labelY: 430 };
  }
  return c;
}
