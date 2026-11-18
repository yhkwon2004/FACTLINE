import assert from "node:assert/strict";
import { evidenceGraph } from "./EvidenceGraph";
const first = {
  id: "a",
  name: "대화",
  phase: "ready",
  analysis: {
    candidates: [
      {
        id: "1",
        quote: "원문1",
        title: "문장1",
        actor: "민수",
        location: "교실",
        datetime: "2026-05-12T00:00:00+09:00",
      },
    ],
  },
  matches: [{ source: "a", target: "b", score: 0.8, shared: ["민수"] }],
};
const second = {
  id: "b",
  name: "메모",
  phase: "linking",
  analysis: {
    candidates: [
      {
        id: "2",
        quote: "원문2",
        title: "문장2",
        actor: "민수",
        location: "복도",
      },
    ],
  },
};
const graph = evidenceGraph(
  [first, second],
  [
    {
      id: "e",
      title: "확인",
      rawStatement: "원문1",
      evidenceIds: ["a"],
      actor: "민수",
      datetime: new Date("2026-05-11T15:00:00Z"),
    },
  ],
);
assert.equal(
  graph.nodes.filter((n) => n.kind === "person" && n.label === "민수").length,
  1,
);
assert.equal(graph.nodes.filter((n) => n.kind === "fact").length, 2);
assert(graph.nodes.some((n) => n.label === "2026-05-12"));
assert(graph.edges.some((e) => e.kind === "semantic" && e.score === 0.8));
assert(graph.edges.some((e) => e.confirmed));
assert(graph.nodes.some((n) => n.kind === "fact" && !n.confirmed));
assert(
  graph.edges.every(
    (e) =>
      graph.nodes.some((n) => n.id === e.source) &&
      graph.nodes.some((n) => n.id === e.target),
  ),
);
assert.deepEqual(evidenceGraph([], []).nodes, []);
console.log(
  "PASS source graph, shared entities, Korean dates, confirmed/proposed distinction and actual similarity",
);

const many=evidenceGraph([first],Array.from({length:4},(_,i)=>({id:String(i),title:"확인",rawStatement:"확인 "+i,evidenceIds:["a"]})));
assert.equal(many.nodes.filter(x=>x.kind==="fact").length,3);
