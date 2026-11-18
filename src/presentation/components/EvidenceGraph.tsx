"use client";
import { useState } from "react";
import { Network, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { GraphNode, GraphEdge } from "../../domain/services/EvidenceGraph";
export type LiveGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalFiles: number;
  visibleFiles: number;
  confirmed: number;
};
export const phaseLabel: Record<string, string> = {
  queued: "대기",
  extracting: "본문 읽는 중",
  linking: "관계 찾는 중",
  ready: "연결 완료",
  waiting: "분석기 연결 대기",
  error: "다시 확인",
};
export function EvidenceGraph({
  graph,
  draft,
  selected,
  onSelect,
  syncError,
}: {
  graph: LiveGraph;
  draft: string;
  selected?: string;
  onSelect: (id: string) => void;
  syncError: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [focused, setFocused] = useState<GraphNode | null>(null);
  const files = graph.nodes.filter((x) => x.kind === "file"),
    facts = graph.nodes.filter((x) => x.kind === "fact"),
    entities = graph.nodes.filter((x) => !["file", "fact"].includes(x.kind));
  const height = Math.max(
    390,
    (files.length + (draft ? 1 : 0)) * 92 + 80,
    facts.length * 80 + 80,
    entities.length * 70 + 80,
  );
  const positions = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >();
  for (const [group, x, w, gap] of [
    [files, 18, 160, 92],
    [facts, 216, 228, 80],
    [entities, 504, 140, 70],
  ] as const)
    group.forEach((n, i) =>
      positions.set(n.id, { x, y: 72 + i * gap, w, h: 58 }),
    );
  function activate(node: GraphNode) {
    setFocused(node);
    if (node.evidenceId) onSelect(node.evidenceId);
  }
  return (
    <section className="live-graph" aria-label="실시간 증거 연결">
      <div className="graph-heading">
        <div>
          <span className={syncError ? "sync-dot offline" : "sync-dot"} />
          <h2>증거가 연결되는 곳</h2>
          <span className="graph-live">{syncError ? "재연결 중" : "LIVE"}</span>
        </div>
        <span className="graph-count">
          자료 {graph.totalFiles} · 확인한 기록 {graph.confirmed}
        </span>
      </div>
      <div className="graph-legend">
        <span>
          <i />
          확인한 사실
        </span>
        <span>
          <i className="dashed" />
          추출 후보
        </span>
        <span>
          <i className="semantic" />
          AI 문장 유사도
        </span>
        <div className="graph-zoom">
          <button
            type="button"
            aria-label="연결도 축소"
            onClick={() => setZoom((x) => Math.max(0.6, x - 0.2))}
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            aria-label="연결도 배율 초기화"
            onClick={() => setZoom(1)}
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            aria-label="연결도 확대"
            onClick={() => setZoom((x) => Math.min(1.8, x + 0.2))}
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>
      <div
        className="graph-viewport"
        tabIndex={0}
        aria-label="증거 연결도. 방향키로 이동할 수 있습니다."
      >
        {!graph.nodes.length && !draft ? (
          <div className="graph-empty">
            <Network size={34} />
            <strong>{graph.totalFiles ? "보관한 자료를 불러오고 있어요" : "첫 자료부터 하나씩 연결해요"}</strong>
            <p>{graph.totalFiles ? "연결 상태를 확인하고 있어요." : "메모를 적거나 파일을 올려 보세요."}</p>
            <div>
              <span>원본</span>
              <b>→</b>
              <span>문장</span>
              <b>→</b>
              <span>인물 · 장소 · 날짜</span>
            </div>
          </div>
        ) : (
          <svg
            width={660 * zoom}
            height={height * zoom}
            viewBox={"0 0 660 " + height}
            role="group"
            aria-label="원본, 문장, 공통 정보를 연결한 그래프"
          >
            <text x="18" y="34" className="graph-column">
              원본 자료
            </text>
            <text x="216" y="34" className="graph-column">
              원문에서 찾은 문장
            </text>
            <text x="504" y="34" className="graph-column">
              공통 정보
            </text>
            {graph.edges.map((edge) => {
              const a = positions.get(edge.source),
                b = positions.get(edge.target);
              if (!a || !b) return null;
              const semantic = edge.kind === "semantic";
              const start = { x: semantic ? a.x : a.x + a.w, y: a.y + a.h / 2 };
              const end = { x: b.x, y: b.y + b.h / 2 };
              const bend = semantic
                ? Math.max(4, 25 - (edge.score ?? 0) * 16)
                : (start.x + end.x) / 2;
              const active = graph.nodes.some(
                (n) =>
                  n.evidenceId === selected &&
                  (n.id === edge.source || n.id === edge.target),
              );
              return (
                <path
                  key={edge.id}
                  d={
                    "M " +
                    start.x +
                    " " +
                    start.y +
                    " C " +
                    bend +
                    " " +
                    start.y +
                    ", " +
                    bend +
                    " " +
                    end.y +
                    ", " +
                    end.x +
                    " " +
                    end.y
                  }
                  className={
                    "graph-edge " +
                    (semantic
                      ? "semantic"
                      : edge.confirmed
                        ? "confirmed"
                        : "proposed") +
                    (active ? " active" : "")
                  }
                >
                  <title>
                    {semantic
                      ? "문장 유사도 " +
                        Math.round((edge.score ?? 0) * 100) +
                        "% · " +
                        (edge.reason || "다국어 의미 비교")
                      : edge.confirmed
                        ? "사용자가 확인한 원문 연결"
                        : "원문 추출 후보 · 확인 필요"}
                  </title>
                </path>
              );
            })}
            {graph.nodes.map((node) => {
              const p = positions.get(node.id)!;
              const active = node.evidenceId === selected;
              const limit =
                node.kind === "fact"
                  ? 15
                  : node.kind === "file"
                    ? 10
                    : node.kind === "date"
                      ? 12
                      : 8;
              return (
                <g
                  key={node.id}
                  transform={"translate(" + p.x + "," + p.y + ")"}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    node.label + (node.confirmed ? " · 확인한 사실" : "")
                  }
                  onClick={() => activate(node)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      activate(node);
                    }
                  }}
                  className={
                    "graph-node " +
                    node.kind +
                    (active ? " selected" : "") +
                    (node.kind === "fact" && !node.confirmed ? " proposed" : "")
                  }
                >
                  <rect width={p.w} height={p.h} rx="12" />
                  <text x="14" y="23" className="graph-node-label">
                    {node.label.length > limit
                      ? node.label.slice(0, limit) + "…"
                      : node.label}
                  </text>
                  <text x="14" y="43" className="graph-node-meta">
                    {node.kind === "file"
                      ? phaseLabel[node.phase ?? "queued"]
                      : node.kind === "fact"
                        ? node.confirmed
                          ? "확인한 원문"
                          : "추출 후보 · 확인 전"
                        : node.kind === "person"
                          ? "인물"
                          : node.kind === "place"
                            ? "장소"
                            : "날짜·시간"}
                  </text>
                  <title>{node.quote || node.label}</title>
                </g>
              );
            })}
            {draft ? (
              <g
                transform={"translate(18," + (files.length * 92 + 72) + ")"}
                className="graph-node draft"
              >
                <rect width="260" height="66" rx="12" />
                <text x="14" y="20" className="graph-node-label">
                  {draft.slice(0, 18)}
                  {draft.length > 18 ? "…" : ""}
                </text>
                <text x="14" y="46" className="graph-node-meta">
                  작성 중 · 저장하면 자동 분석
                </text>
              </g>
            ) : null}
          </svg>
        )}
      </div>
      {focused ? (
        <div className="graph-selection">
          <strong>{focused.label}</strong>
          <p>
            {focused.quote ||
              (focused.kind === "file"
                ? "아래에서 원본과 분석 내용을 확인할 수 있어요."
                : "원문에서 추출한 정보입니다. 원본과 대조해 주세요.")}
          </p>
        </div>
      ) : null}
      <div className="graph-footer">
        <span>
          {draft
            ? "작성 내용이 미리 보이고 있어요. 저장 후 연결됩니다."
            : "문장이나 연결을 선택해 원문을 확인하세요."}
        </span>
        <span>
          {graph.totalFiles > 12
            ? "최근 12개 자료 · 자료당 주요 문장 3개"
            : "자료당 주요 문장 3개"}{" "}
          · 후보는 확인 후 기록에 반영
        </span>
      </div>
      {syncError ? (
        <p role="status" className="graph-sync-error">
          {syncError}
        </p>
      ) : null}
    </section>
  );
}
