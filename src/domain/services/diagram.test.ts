import assert from "node:assert/strict";
import {diagramSchema,emptyDiagram,nextDiagram} from "./DiagramDocument";
import {composeBoard,boardRoutes,layoutFeatures,proposeLayouts,rankLayout,boardBounds,wrapDiagramText} from "./DiagramLayout";
import parity from "../../../ai/training/layout-parity.json";
import generator from "../../../ai/training/layout-generator-run.json";
import {predictCoordinates} from "./DiagramLayout";
const network=predictCoordinates(generator.parity.nodes,generator.parity.edges as [number,number][])[0];
assert(Math.abs(network.x-generator.parity.firstCoordinate[0])<1e-8 && Math.abs(network.y-generator.parity.firstCoordinate[1])<1e-8,"Browser coordinate network matches trained Python model");
import type {RelationshipMap} from "./RelationshipGraph";
const actual=layoutFeatures(parity.points.map(([x,y])=>({x,y})),parity.edges as [number,number][]);
actual.forEach((v,i)=>assert.ok(Math.abs(v-parity.features[i])<1e-10,"Python/browser feature parity: "+i));
assert.ok(Number.isFinite(rankLayout(actual)));
const graph:RelationshipMap={nodes:[{id:"person:a",label:"김민수",kind:"person",evidenceIds:["source"]},{id:"person:b",label:"이서연",kind:"person",evidenceIds:["source"]}],edges:[{id:"source:r",source:"person:a",target:"person:b",action:"송금했다",kind:"payment",amount:"5만원",polarity:"denied",directed:true,confirmed:false,quote:"김민수가 이서연에게 송금하지 않았다고 했다.",evidenceId:"source",candidateId:"0",score:.7}],totalRelations:1,shownRelations:1};
const document=emptyDiagram();document.nodes["person:a"]={x:100,y:200,label:"표시 이름",color:"rose"};document.edges["source:r"]={label:"지급 여부",detail:"금액 확인 필요",route:"elbow"};
document.manualNodes.push({id:"manual:n",label:"직접 작성",kind:"note"});document.nodes["manual:n"]={x:750,y:500};document.manualEdges.push({id:"manual:e",source:"person:a",target:"manual:n",label:"메모 연결",directed:true});
const board=composeBoard(graph,document);assert.equal(board.nodes[0].x,100);assert.equal(board.nodes[0].originalLabel,"김민수");assert.equal(board.edges[0].action,"송금했다");assert.equal(board.edges[0].label,"지급 여부");assert.equal(board.edges[0].polarity,"denied");assert.equal(board.edges[0].quote,graph.edges[0].quote);assert.equal(board.edges[1].confirmed,false);assert.equal(board.edges[1].evidenceId,null);assert.equal(board.edges[1].manual,true);
assert.equal(graph.nodes[0].label,"김민수");assert.equal(graph.edges[0].action,"송금했다");
for(const route of boardRoutes(board.nodes,board.edges,document)){assert.ok(!route.path.includes("NaN"));route.points.slice(1).forEach((p,i)=>assert.ok(p.x===route.points[i].x||p.y===route.points[i].y,"Orthogonal route"));}
const hidden=structuredClone(document);hidden.nodes["person:b"]={x:0,y:0,hidden:true};assert.equal(composeBoard(graph,hidden).edges.length,1);delete hidden.nodes["person:b"].hidden;assert.equal(composeBoard(graph,hidden).edges.length,2);
assert.equal(diagramSchema.safeParse(document).success,true);
assert.equal(diagramSchema.safeParse({...document,unexpected:"script"}).success,false);
assert.equal(diagramSchema.safeParse({...document,nodes:{a:{x:Infinity,y:0}}}).success,false);
assert.equal(diagramSchema.safeParse({...document,nodes:{a:{x:0,y:0,portraitEvidenceId:"https://evil.test/image"}}}).success,false);
assert.equal(diagramSchema.safeParse({...document,manualNodes:[document.manualNodes[0],document.manualNodes[0]]}).success,false);
assert.equal(diagramSchema.safeParse({...document,manualEdges:[{id:"manual:loop",source:"a",target:"a",label:"loop",directed:true}]}).success,false);
const snapshot={revision:1,updatedAt:null,document:emptyDiagram()};assert.equal(nextDiagram(snapshot,1,document).revision,2);assert.throws(()=>nextDiagram(snapshot,0,document),/다른 화면/);assert.equal(snapshot.revision,1);
for(const proposal of proposeLayouts(board.nodes,board.edges)){assert.ok(Number.isFinite(proposal.score));assert.equal(Object.keys(proposal.positions).length,3);}
assert.ok(boardBounds(board.nodes).width>0);assert.deepEqual(wrapDiagramText("abcdefghijklmnop",4,2),["abcd","efg…"]);
console.log("PASS trained layout parity, immutable source facts, manual provenance, routing, validation and version conflicts");

const portNodes=board.nodes.map((n,i)=>({...n,x:i===2?400:i*400,y:i===2?700:100}));const portEdges=[{...board.edges[0],id:"in:one",source:portNodes[0].id,target:portNodes[2].id},{...board.edges[0],id:"in:two",source:portNodes[1].id,target:portNodes[2].id}];const portRoutes=boardRoutes(portNodes,portEdges,emptyDiagram());assert.notDeepEqual(portRoutes[0].points.at(-1),portRoutes[1].points.at(-1),"Incoming arrows need separate connection ports");

// Moving the graph horizontally must not change the y lanes of a vertical edge.
const axisNodes=board.nodes.map((n,i)=>({...n,x:[0,500,250][i],y:[3000,4000,3500][i]}));
const axisRoute=boardRoutes(axisNodes,[board.edges[0]],emptyDiagram())[0];
const shiftedRoute=boardRoutes(axisNodes.map(n=>({...n,x:n.x+10000})),[board.edges[0]],emptyDiagram())[0];
assert.deepEqual(shiftedRoute.points.map(p=>({...p,x:p.x-10000})),axisRoute.points,"Vertical routing must use y coordinates for outer lanes");

assert.deepEqual(wrapDiagramText("가나다라 마바사아 자차카타",8,3),["가나다라","마바사아","자차카타"]);
assert(!wrapDiagramText("가족 👨‍👩‍👧‍👦 기록입니다",5,3).some(s=>s.endsWith("\u200d")));

// The two reporters exchange three records across a third person's card.
const newsroomNodes=[[0,0],[800,0],[400,0],[0,440],[400,440],[800,440]].map(([x,y],i)=>({...board.nodes[0],id:"n"+i,x,y}));
const newsroomEdges=[[0,1],[1,0],[0,1],[0,4],[2,5],[3,1],[4,2],[5,0]].map(([a,b],i)=>({
  ...board.edges[0], id:"r"+i, source:"n"+a,target:"n"+b,label:i===2?"자료를 다시 제출해 달라고 요청했다":"문서를 전달했다",
}));
const newsroomDoc=emptyDiagram();
newsroomDoc.groups.push({id:"group:test",label:"확인한 기록",x:170,y:220,width:460,height:500,color:"blue"});
const newsroom=boardRoutes(newsroomNodes,newsroomEdges,newsroomDoc);
const boxes=newsroomNodes.map(n=>({left:n.x-90,right:n.x+90,top:n.y-66,bottom:n.y+86}));
boxes.push({left:170,right:630,top:220,bottom:268});
for(const [i,r] of newsroom.entries()){
  for(const {a,b} of r.segments) for(const box of boxes){
    assert(!(Math.max(a.x,b.x)>box.left && Math.min(a.x,b.x)<box.right &&
             Math.max(a.y,b.y)>box.top && Math.min(a.y,b.y)<box.bottom),"Arrow cannot pass through a card or group heading: "+r.id);
  }
  const caption={left:r.label.x-r.labelWidth/2,right:r.label.x+r.labelWidth/2,top:r.label.y-r.labelHeight/2,bottom:r.label.y+r.labelHeight/2};
  for(const box of boxes)assert(caption.left>=box.right || caption.right<=box.left ||
    caption.top>=box.bottom || caption.bottom<=box.top,"Caption cannot hide a card or group heading");
  for(const other of newsroom.slice(0,i))assert(Math.abs(r.label.x-other.label.x)>=(r.labelWidth+other.labelWidth)/2 ||
    Math.abs(r.label.y-other.label.y)>=(r.labelHeight+other.labelHeight)/2,"Distinguish nearby captions");
  assert(r.segments.some(({a,b})=>r.anchor.x>=Math.min(a.x,b.x)&&r.anchor.x<=Math.max(a.x,b.x)&&
    r.anchor.y>=Math.min(a.y,b.y)&&r.anchor.y<=Math.max(a.y,b.y)),"Caption leader attaches to its own connector");
}
assert.equal(new Set([newsroom[0].points[0].y,newsroom[1].points.at(-1)!.y,newsroom[2].points[0].y]).size,3,"Reciprocal arrows use distinct tips on the shared side");
newsroomDoc.edges.r0={labelX:211,labelY:-231,viaX:360,viaY:-160};
const pinned=boardRoutes(newsroomNodes,newsroomEdges,newsroomDoc)[0];
assert.deepEqual(pinned.label,{x:211,y:-231});assert.deepEqual(pinned.handle,{x:360,y:-160});
assert(pinned.segments.some(({a,b})=>a.y===-160&&b.y===-160&&360>=Math.min(a.x,b.x)&&360<=Math.max(a.x,b.x)),"A dragged detour stays on the requested rail");
console.log("PASS card and group-title clearance, distinct reciprocal arrow ports, compact captions and pinned detours");
