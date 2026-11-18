export type GraphNode = {
  id: string;
  label: string;
  kind: "file" | "fact" | "person" | "place" | "date";
  evidenceId?: string;
  confirmed?: boolean;
  quote?: string;
  phase?: string;
};
export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  kind: "source" | "entity" | "semantic";
  confirmed?: boolean;
  score?: number;
  reason?: string;
};
type Candidate = {
  id: string;
  quote: string;
  title: string;
  actor?: string | null;
  location?: string | null;
  datetime?: string | null;
  approximateTimeText?: string | null;
};
type InputFile = {
  id: string;
  name: string;
  phase: string;
  analysis?: { candidates: Candidate[] } | null;
  matches?: Array<{
    source: string;
    target: string;
    score: number;
    shared: string[];
  }>;
};
type Fact = {
  id: string;
  title: string;
  rawStatement: string;
  evidenceIds: string[];
  actor?: string | null;
  location?: string | null;
  datetime?: Date | string | null;
  approximateTimeText?: string | null;
};
export function evidenceGraph(files: InputFile[], facts: Fact[]) {
  const nodes: GraphNode[] = [],
    edges: GraphEdge[] = [];
  const entities = new Map<string, GraphNode>();
  const visible = files.slice(0, 12);
  const visibleIds = new Set(visible.map((x) => x.id));
  function addEntity(
    source: string,
    kind: "person" | "place" | "date",
    label: string | null | undefined,
    confirmed: boolean,
    evidenceId: string,
  ) {
    if (!label?.trim()) return;
    label = label.trim().replace(/\s+/g, " ");
    const id = kind + ":" + label.normalize("NFC").toLocaleLowerCase();
    if (!entities.has(id)) entities.set(id, { id, label, kind, evidenceId });
    edges.push({
      id: source + "/" + id,
      source,
      target: id,
      kind: "entity",
      confirmed,
    });
  }
  function addFact(
    id: string,
    c: Candidate,
    evidenceId: string,
    confirmed: boolean,
  ) {
    nodes.push({
      id,
      label: c.title,
      quote: c.quote,
      kind: "fact",
      evidenceId,
      confirmed,
    });
    edges.push({
      id: "file:" + evidenceId + "/" + id,
      source: "file:" + evidenceId,
      target: id,
      kind: "source",
      confirmed,
    });
    addEntity(id, "person", c.actor, confirmed, evidenceId);
    addEntity(id, "place", c.location, confirmed, evidenceId);
    const date = c.datetime
      ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(
          new Date(c.datetime),
        )
      : c.approximateTimeText;
    addEntity(id, "date", date, confirmed, evidenceId);
  }
  for (const file of visible) {
    nodes.push({
      id: "file:" + file.id,
      label: file.name,
      kind: "file",
      evidenceId: file.id,
      phase: file.phase,
    });
    const accepted = facts.filter((f) => f.evidenceIds.includes(file.id));
    for (const fact of accepted.slice(0, 3))
      addFact(
        "fact:" + fact.id + ":" + file.id,
        {
          ...fact,
          quote: fact.rawStatement,
          datetime:
            fact.datetime instanceof Date
              ? fact.datetime.toISOString()
              : fact.datetime,
        },
        file.id,
        true,
      );
    const candidates = (file.analysis?.candidates ?? []).filter(
      (c) => !accepted.some((f) => f.rawStatement === c.quote),
    );
    for (const c of candidates.slice(0, Math.max(0, 3 - accepted.length)))
      addFact("candidate:" + file.id + ":" + c.id, c, file.id, false);
  }
  const pairs = new Map<string, GraphEdge>();
  for (const file of visible)
    for (const match of file.matches ?? []) {
      if (
        match.source === match.target ||
        !visibleIds.has(match.source) ||
        !visibleIds.has(match.target)
      )
        continue;
      const id = [match.source, match.target].sort().join("/");
      const previous = pairs.get(id);
      if (!previous || (previous.score ?? 0) < match.score)
        pairs.set(id, {
          id,
          source: "file:" + match.source,
          target: "file:" + match.target,
          kind: "semantic",
          score: match.score,
          reason: match.shared.join(" · "),
        });
    }
  edges.push(...pairs.values());
  nodes.push(...entities.values());
  return {
    nodes,
    edges,
    totalFiles: files.length,
    visibleFiles: visible.length,
    confirmed: facts.length,
  };
}
