import assert from "node:assert/strict";
import {relationshipGraph,layoutRelationships,type SourceRelation} from "./RelationshipGraph";
const relation:SourceRelation={id:"0",candidateId:"0",actor:"김민수",target:"이서연",actorKind:"person",targetKind:"person",action:"송금했다",kind:"payment",typeLabel:"금전",score:.8,polarity:"reported",directed:true,amount:"5만원",quote:"김민수가 이서연에게 5만원을 송금했다.",sourceSpan:{start:0,end:26},mentions:[],model:"E5 + Ridge"};
const file={id:"f1",name:"record",analysis:{relations:[relation],candidates:[{id:"0",quote:relation.quote,audioRange:{start:2,end:7}}]}};
const result=relationshipGraph([file],[]);
assert.equal(result.nodes.length,2);assert.equal(result.edges[0].audioRange?.start,2);assert.equal(result.edges[0].amount,"5만원");assert.equal(result.edges[0].confirmed,false);
assert.equal(result.nodes.find(n=>n.id===result.edges[0].source)?.label,"김민수");
const denied=relationshipGraph([{...file,analysis:{relations:[{...relation,polarity:"denied"}]}}],[{id:"fact",title:"원문 확인",rawStatement:relation.quote,evidenceIds:["f1"]}]);
assert.equal(denied.edges[0].confirmed,true);assert.equal(denied.edges[0].polarity,"denied");
assert.equal(relationshipGraph([{...file,analysis:{relations:[{...relation,target:"가짜이름"}]}}],[]).edges.length,0);
const ambiguous=relationshipGraph([file,{...file,id:"f2",analysis:{relations:[{...relation,actor:"김씨",quote:"김씨가 이서연에게 5만원을 송금했다.",actorAmbiguous:true}]}}],[]);
assert.equal(ambiguous.nodes.filter(n=>n.label==="이서연").length,1);
for(const width of [320,375,780]){const layout=layoutRelationships(result,width);for(const p of layout.positions.values()){assert.ok(p.x>=40&&p.x<=layout.width-40);assert.ok(p.y>=40&&p.y<=layout.height-40);}}
console.log("PASS grounded directed relationship map, denial, source/audio provenance and mobile layout");

for(const width of [320,375,780]){const l=layoutRelationships(result,width);for(const route of l.routes.values())for(const p of l.positions.values())assert.ok(Math.abs(p.x-route.lx)>=105||Math.abs(p.y-route.ly)>=68,"Relationship label intersects a person");}
