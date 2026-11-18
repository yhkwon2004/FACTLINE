export type SourceRelation={id:string;candidateId:string;actor:string;target:string|null;actorKind:"person"|"organization";targetKind?:"person"|"organization"|null;actorAmbiguous?:boolean;targetAmbiguous?:boolean;action:string;kind:string;typeLabel:string;score:number;polarity:"reported"|"denied"|"uncertain"|"planned";directed:boolean;amount:string|null;quote:string;sourceSpan:{start:number;end:number};mentions:Array<{text:string;kind:string;ambiguous:boolean}>;model:string};
export type RelationshipNode={id:string;label:string;kind:"person"|"organization"|"action";evidenceIds:string[];ambiguous?:boolean;quote?:string};
export type RelationshipEdge={id:string;source:string;target:string;action:string;kind:string;amount:string|null;polarity:SourceRelation["polarity"];directed:boolean;confirmed:boolean;quote:string;evidenceId:string|null;candidateId:string|null;score:number;audioRange?:{start:number;end:number}};
export type RelationshipMap={nodes:RelationshipNode[];edges:RelationshipEdge[];totalRelations:number;shownRelations:number};
type Input={id:string;name:string;analysis?:{relations?:SourceRelation[];candidates?:Array<{id:string;quote:string;actor?:string|null;audioRange?:{start:number;end:number}}> }|null};
type Fact={id:string;title:string;rawStatement:string;actor?:string|null;evidenceIds:string[]};
export function relationshipGraph(files:Input[],facts:Fact[]):RelationshipMap {
 const nodes=new Map<string,RelationshipNode>(),edges:RelationshipEdge[]=[];let total=0;
 function entity(label:string,kind:"person"|"organization",fileId:string,ambiguous=false){const id=kind+":"+label.normalize("NFC").trim()+(ambiguous?":"+fileId:"");const existing=nodes.get(id);if(existing){if(!existing.evidenceIds.includes(fileId))existing.evidenceIds.push(fileId);}else nodes.set(id,{id,label,kind,evidenceIds:[fileId],ambiguous});return id;}
 for(const file of files.slice(0,12)) {
  for(const relation of file.analysis?.relations??[]) {
   if(!relation.actor || !relation.quote.includes(relation.actor) || (relation.target && !relation.quote.includes(relation.target)) || !relation.quote.includes(relation.action))continue;
   total++;if(edges.length>=36)continue;
   const source=entity(relation.actor,relation.actorKind,file.id,relation.actorAmbiguous);
   const target=relation.target?entity(relation.target,relation.targetKind??"person",file.id,relation.targetAmbiguous):"action:"+file.id+":"+relation.id;
   if(!relation.target)nodes.set(target,{id:target,label:relation.action,kind:"action",evidenceIds:[file.id],quote:relation.quote});
   if(source===target)continue;
   const confirmed=facts.some(f=>f.evidenceIds.includes(file.id)&&f.rawStatement===relation.quote);
   const candidate=file.analysis?.candidates?.find(x=>x.id===relation.candidateId);
   edges.push({id:file.id+":"+relation.id,source,target,action:relation.action,kind:relation.kind,amount:relation.amount,polarity:relation.polarity,directed:relation.target?relation.directed:true,confirmed,quote:relation.quote,evidenceId:file.id,candidateId:relation.candidateId,score:relation.score,audioRange:candidate?.audioRange});
  }
 }
 // Older approved records remain visible; they do not acquire a guessed recipient or relationship.
 for(const fact of facts.filter(f=>!edges.some(e=>e.quote===f.rawStatement&&e.confirmed)).slice(0,Math.max(0,36-edges.length))) {
  if(!fact.actor || !fact.rawStatement.includes(fact.actor))continue;
  const source=entity(fact.actor,"person",fact.evidenceIds[0]??"manual"),target="action:approved:"+fact.id;
  nodes.set(target,{id:target,label:fact.title,kind:"action",evidenceIds:fact.evidenceIds,quote:fact.rawStatement});
  edges.push({id:"approved:"+fact.id,source,target,action:"확인한 원문",kind:"other",amount:null,polarity:"reported",directed:true,confirmed:true,quote:fact.rawStatement,evidenceId:fact.evidenceIds[0]??null,candidateId:null,score:0});
 }
 return {nodes:[...nodes.values()],edges,totalRelations:Math.max(total,edges.length),shownRelations:edges.length};
}
