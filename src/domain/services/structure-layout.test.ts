import assert from "node:assert/strict";
import {test} from "node:test";
import {arrangeDiagram,composeBoard} from "./DiagramLayout";
import {diagramSchema,emptyDiagram} from "./DiagramDocument";
import type {RelationshipMap} from "./RelationshipGraph";
import {structureOrder} from "./StructureLayout";
import run from "../../../ai/training/structure-order-run.json";

test("the browser evaluates the trained layer order model with Python parity",()=>{
  const {nodes,edges,scores}=run.parity;
  const actual=structureOrder(nodes,edges as [number,number][]).scores;
  scores.forEach((score,i)=>assert.ok(Math.abs(actual[i]-score)<1e-8));
});

const pairs=[["a","b","f1"],["a","c","f1"],["c","d","f2"],["d","e","f3"],["a","b","f1"]];
const graph:RelationshipMap={
  nodes:["a","b","c","d","e","solo"].map(id=>({id,label:id,kind:"person",evidenceIds:[]})),
  edges:pairs.map(([source,target,evidenceId],i)=>({id:"r"+i,source,target,evidenceId,
    action:"연락했다",kind:"communication",amount:null,polarity:"reported",directed:true,
    confirmed:false,quote:source+"는 "+target+"에게 연락했다",candidateId:String(i),score:.8})),
  totalRelations:pairs.length,shownRelations:pairs.length,
};

test("shared evidence gets editable non-overlapping frames and keeps isolated people ungrouped",()=>{
  const document=emptyDiagram();
  const next=arrangeDiagram(graph,document);
  assert.equal(document.groups.length,0);
  assert.equal(next.groups.length,2);
  assert.equal(next.nodes.a.groupId,next.nodes.b.groupId);
  assert.equal(next.nodes.a.groupId,next.nodes.c.groupId);
  assert.equal(next.nodes.d.groupId,next.nodes.e.groupId);
  assert.notEqual(next.nodes.a.groupId,next.nodes.d.groupId);
  assert.equal(next.nodes.solo.groupId,undefined);
  assert.equal(new Set(next.groups.map(g=>g.color)).size,2);
  const [a,b]=next.groups;
  assert(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y);
  assert.deepEqual(arrangeDiagram(graph,next),next);
  assert(diagramSchema.safeParse(next).success);
  const board=composeBoard(graph,next);
  for (const n of board.nodes) {
    const g=next.groups.find(f=>f.id===n.groupId);
    if (g) assert(n.x-106>=g.x && n.x+106<=g.x+g.width && n.y-66>g.y+35 && n.y+122<=g.y+g.height);
  }
  assert.equal(board.edges.length,pairs.length);
  assert.deepEqual(board.edges.map(e=>e.quote),graph.edges.map(e=>e.quote));
});

test("arrange preserves hand-drawn frame size, offsets, explicit ungrouping and custom ink",()=>{
  const original=emptyDiagram();
  original.nodes.a={x:75,y:95,groupId:"group:own",subtitle:"직접 적은 설명"};
  original.nodes.b={x:425,y:135,groupId:"group:own"};
  original.nodes.d={x:400,y:410,groupId:null};
  original.groups.push({id:"group:own",label:"확인할 자료",color:"rose",x:10,y:20,width:580,height:280});
  original.edges.r0={labelX:180,labelY:140,viaX:200,dashed:false,label:"직접 작성"};
  const next=arrangeDiagram(graph,original);
  const g=next.groups.find(frame=>frame.id==="group:own")!;
  assert.deepEqual([g.label,g.color,g.width,g.height],["확인할 자료","rose",580,280]);
  assert.deepEqual([next.nodes.a.x-g.x,next.nodes.a.y-g.y,next.nodes.b.x-g.x,next.nodes.b.y-g.y],[65,75,415,115]);
  assert.equal(next.nodes.d.groupId,null);
  assert.equal(next.nodes.a.subtitle,"직접 적은 설명");
  assert.deepEqual(next.edges,original.edges);
  assert.equal(composeBoard(graph,original).nodes[0].x,75);
});

test("a frame with multiple displayed action types has a neutral caption",()=>{
  const mixed=structuredClone(graph);
  mixed.edges.push({...mixed.edges[0],id:"payment:1",kind:"payment",evidenceId:"separate-receipt"});
  const next=arrangeDiagram(mixed,emptyDiagram());
  assert.equal(next.groups.find(g=>g.id===next.nodes.a.groupId)?.label,"함께 언급된 항목");
});
