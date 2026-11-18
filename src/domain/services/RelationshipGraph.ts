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
export function layoutRelationships(graph:RelationshipMap,width:number){
 const w=Math.max(300,width),degree=new Map(graph.nodes.map(n=>[n.id,0]));for(const e of graph.edges){degree.set(e.source,(degree.get(e.source)??0)+1);degree.set(e.target,(degree.get(e.target)??0)+1);}
 const ordered=[...graph.nodes].sort((a,b)=>Number(a.kind==="action")-Number(b.kind==="action")||(degree.get(b.id)??0)-(degree.get(a.id)??0)||a.id.localeCompare(b.id));
 const positions=new Map<string,{x:number;y:number}>();let height=520;
 if(w<600){ordered.forEach((n,i)=>positions.set(n.id,i===0?{x:w/2,y:70}:{x:w*(i%2===1?.23:.77),y:340+Math.floor((i-1)/2)*225}));height=Math.max(590,Math.ceil(Math.max(0,ordered.length-1)/2)*225+295);}
 else {const cols=Math.min(5,Math.max(2,Math.ceil(Math.sqrt(ordered.length||1))));ordered.forEach((n,i)=>positions.set(n.id,{x:70+(i%cols)*(w-140)/Math.max(1,cols-1),y:90+Math.floor(i/cols)*200}));height=Math.max(520,Math.ceil(ordered.length/cols)*200+40);}
 const routes=new Map<string,{sx:number;sy:number;tx:number;ty:number;cx:number;cy:number;lx:number;ly:number;mx:number;my:number}>(),labels:Array<{x:number;y:number}>=[];
 // shortcut: bounded graph uses a small label-placement scan; use a graph layout engine beyond 36 edges.
 for(const e of graph.edges){const a=positions.get(e.source)!,b=positions.get(e.target)!,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,sx=a.x+dx/d*43,sy=a.y+dy/d*43,tx=b.x-dx/d*45,ty=b.y-dy/d*45;
 const parallel=graph.edges.filter(x=>[x.source,x.target].sort().join("|")===[e.source,e.target].sort().join("|")),offset=(parallel.findIndex(x=>x.id===e.id)-(parallel.length-1)/2)*52,cx=(sx+tx)/2-dy/d*offset,cy=(sy+ty)/2+dx/d*offset,mx=(sx+2*cx+tx)/4,my=(sy+2*cy+ty)/4;
 let best={x:mx,y:my,cost:Infinity};for(const t of [.5,.35,.65,.2,.8])for(const oy of [0,-55,55,-95,95])for(const ox of [0,-35,35]){const x=Math.max(61,Math.min(w-61,(1-t)**2*sx+2*(1-t)*t*cx+t*t*tx+ox)),y=Math.max(30,Math.min(height-35,(1-t)**2*sy+2*(1-t)*t*cy+t*t*ty+oy));const overlap=[...positions.values()].reduce((n,p)=>n+(Math.abs(p.x-x)<105&&Math.abs(p.y-y)<68?1:0),0)+labels.reduce((n,p)=>n+(Math.abs(p.x-x)<123&&Math.abs(p.y-y)<48?1:0),0);const cost=overlap*10000+Math.hypot(x-mx,y-my);if(cost<best.cost)best={x,y,cost};}
 if(best.cost>=10000){for(let y=30;y<height-30;y+=50)for(const x of [w/2,61,w-61]){const overlap=[...positions.values()].some(p=>Math.abs(p.x-x)<105&&Math.abs(p.y-y)<68)||labels.some(p=>Math.abs(p.x-x)<123&&Math.abs(p.y-y)<48);const cost=Math.hypot(x-mx,y-my);if(!overlap&&cost<best.cost)best={x,y,cost};}}
 labels.push(best);routes.set(e.id,{sx,sy,tx,ty,cx,cy,lx:best.x,ly:best.y,mx,my});}
 return {width:w,height,positions,routes};
}
