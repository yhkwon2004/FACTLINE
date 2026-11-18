import model from "./layout-ranker.json";
import type {DiagramDocument} from "./DiagramDocument";
import type {RelationshipMap,RelationshipEdge} from "./RelationshipGraph";
export type Point={x:number;y:number};
export type BoardNode=Point&{id:string;label:string;subtitle:string;kind:"person"|"organization"|"note";color:string;manual:boolean;originalLabel:string;portraitEvidenceId?:string|null;groupId?:string|null};
export type BoardEdge=RelationshipEdge&{label:string;detail:string;color:string;manual:boolean;dashed:boolean;route:"elbow"|"straight"};
export const boardPalette={mint:{fill:"#eaf3ef",stroke:"#3d7d69"},slate:{fill:"#f0f1f3",stroke:"#718095"},blue:{fill:"#edf2fb",stroke:"#5379a7"},rose:{fill:"#fbefed",stroke:"#b95c58"},amber:{fill:"#fff7df",stroke:"#bb8b45"},violet:{fill:"#f2eef8",stroke:"#8974ac"}};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
function orientation(a:Point,b:Point,c:Point){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
export function layoutFeatures(points:Point[],edges:Array<[number,number]>):number[]{
 if(!points.length)return Array(8).fill(0);
 let overlap=0,cross=0,label=0;const n=points.length;
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(points[i].x-points[j].x)<190&&Math.abs(points[i].y-points[j].y)<200)overlap++;
 for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){const [a,b]=edges[i],[c,d]=edges[j];if(new Set([a,b,c,d]).size===4&&orientation(points[a],points[b],points[c])*orientation(points[a],points[b],points[d])<0&&orientation(points[c],points[d],points[a])*orientation(points[c],points[d],points[b])<0)cross++;}
 const mids=edges.map(([a,b])=>({x:(points[a].x+points[b].x)/2,y:(points[a].y+points[b].y)/2}));
 for(let i=0;i<mids.length;i++)for(let j=i+1;j<mids.length;j++)if(Math.abs(mids[i].x-mids[j].x)<150&&Math.abs(mids[i].y-mids[j].y)<65)label++;
 const lengths=edges.map(([a,b])=>distance(points[a],points[b])/350),mean=lengths.reduce((a,b)=>a+b,0)/Math.max(1,lengths.length),variation=lengths.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,lengths.length);
 const w=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))+190,h=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))+200;
 return [overlap/Math.max(1,n*(n-1)/2),cross/Math.max(1,edges.length*(edges.length-1)/2),label/Math.max(1,edges.length*(edges.length-1)/2),mean,variation,w*h/(n*350*350),Math.abs(Math.log(w/h)),edges.length/Math.max(1,n)];
}
export function rankLayout(features:number[]){return model.bias+features.reduce((sum,v,i)=>sum+(v-model.mean[i])/model.scale[i]*model.weights[i],0);}
export function proposeLayouts(nodes:Array<{id:string}>,edges:Array<{source:string;target:string}>){
 if(!nodes.length)return [];
 const indexes=new Map(nodes.map((n,i)=>[n.id,i])),links=edges.filter(e=>indexes.has(e.source)&&indexes.has(e.target)).map(e=>[indexes.get(e.source)!,indexes.get(e.target)!] as [number,number]),degree=Array(nodes.length).fill(0);
 for(const [a,b] of links){degree[a]++;degree[b]++;}
 const order=nodes.map((_,i)=>i).sort((a,b)=>degree[b]-degree[a]||a-b),cols=Math.max(2,Math.ceil(Math.sqrt(nodes.length))),names=["인물 중심","사건 흐름","균등 격자","원형 연결","두 줄 구성","가로 흐름"];
 return names.map((name,mode)=>{const points:Point[]=Array(nodes.length);order.forEach((i,rank)=>{let x:number,y:number;
 if(mode===0){x=rank===0?650:230+((rank-1)%3)*360;y=rank===0?160:470+Math.floor((rank-1)/3)*330;}
 else if(mode===1){x=210+(rank%3)*380;y=180+Math.floor(rank/3)*310;}
 else if(mode===2){x=180+(rank%cols)*330;y=180+Math.floor(rank/cols)*300;}
 else if(mode===3){const angle=rank/Math.max(1,nodes.length)*Math.PI*2,r=Math.max(360,nodes.length*48);x=r+200+Math.cos(angle)*r;y=r+200+Math.sin(angle)*r;}
 else if(mode===4){x=200+(rank%2)*420;y=180+Math.floor(rank/2)*280;}
 else{x=210+Math.floor(rank/3)*380;y=180+(rank%3)*310;}points[i]={x,y};});
 const features=layoutFeatures(points,links);return {name,positions:Object.fromEntries(nodes.map((n,i)=>[n.id,points[i]])),score:rankLayout(features),features};}).sort((a,b)=>Number(a.features[0]>0)-Number(b.features[0]>0)||b.score-a.score);
}
export function composeBoard(graph:RelationshipMap,document:DiagramDocument){
 const rawNodes=[...graph.nodes.map(n=>({id:n.id,label:n.label,kind:n.kind==="action"?"note" as const:n.kind,ambiguous:n.ambiguous,manual:false})),...document.manualNodes.map(n=>({...n,ambiguous:false,manual:true}))];
 const rawEdges=[...graph.edges,...document.manualEdges.map(e=>({id:e.id,source:e.source,target:e.target,action:e.label,kind:"manual",amount:null,polarity:"reported" as const,directed:e.directed,confirmed:false,quote:"",evidenceId:null,candidateId:null,score:0}))];
 const visible=rawNodes.filter(n=>!document.nodes[n.id]?.hidden),visibleIds=new Set(visible.map(n=>n.id)),rawLinks=rawEdges.filter(e=>visibleIds.has(e.source)&&visibleIds.has(e.target)&&!document.edges[e.id]?.hidden);
 const suggested=proposeLayouts(visible,rawLinks)[0]?.positions??{};
 const nodes:BoardNode[]=visible.map(n=>{const patch=document.nodes[n.id];return {id:n.id,label:patch?.label??n.label,originalLabel:n.label,subtitle:patch?.subtitle??(n.ambiguous?"별칭 · 신원 미확인":""),kind:patch?.shape??n.kind,color:patch?.color??(n.kind==="organization"?"blue":n.kind==="note"?"amber":"mint"),manual:n.manual,portraitEvidenceId:patch?.portraitEvidenceId,groupId:patch?.groupId,x:patch?.x??suggested[n.id]?.x??200,y:patch?.y??suggested[n.id]?.y??200};});
 // Keep saved positions fixed while new evidence nodes find an unoccupied nearby slot.
 const placed=nodes.filter(n=>document.nodes[n.id]);for(const n of nodes.filter(n=>!document.nodes[n.id])){let tries=0;while(placed.some(p=>Math.abs(p.x-n.x)<210&&Math.abs(p.y-n.y)<230)&&tries++<180){n.x+=260;if(tries%4===0){n.x-=1040;n.y+=260;}}placed.push(n);}
 const edges:BoardEdge[]=rawLinks.map(e=>{const p=document.edges[e.id];return {...e,label:p?.label??e.action,detail:p?.detail??(e.amount??""),color:p?.color??(e.polarity==="denied"?"rose":e.kind==="payment"?"amber":e.kind==="family"?"violet":"slate"),manual:e.kind==="manual",dashed:p?.dashed??(!e.confirmed||e.polarity!=="reported"),route:p?.route??"elbow"};});
 return {nodes,edges};
}
export function boardBounds(nodes:Point[],groups:Array<{x:number;y:number;width:number;height:number}>=[]){
 if(!nodes.length&&!groups.length)return {x:0,y:0,width:1100,height:720};
 const left=[...nodes.map(n=>n.x-120),...groups.map(g=>g.x)],top=[...nodes.map(n=>n.y-120),...groups.map(g=>g.y)],right=[...nodes.map(n=>n.x+120),...groups.map(g=>g.x+g.width)],bottom=[...nodes.map(n=>n.y+145),...groups.map(g=>g.y+g.height)];
 const x=Math.min(...left)-55,y=Math.min(...top)-55;return {x,y,width:Math.max(400,Math.max(...right)-x+55),height:Math.max(350,Math.max(...bottom)-y+55)};
}
const pathLength=(p:Point[])=>p.slice(1).reduce((sum,v,i)=>sum+distance(p[i],v),0);
function hitsNode(points:Point[],n:BoardNode){return points.slice(1).some((b,i)=>{const a=points[i];return a.x===b.x?a.x>n.x-105&&a.x<n.x+105&&Math.max(a.y,b.y)>n.y-65&&Math.min(a.y,b.y)<n.y+120:a.y===b.y&&a.y>n.y-65&&a.y<n.y+120&&Math.max(a.x,b.x)>n.x-105&&Math.min(a.x,b.x)<n.x+105;});}
export function boardRoutes(nodes:BoardNode[],edges:BoardEdge[],document:DiagramDocument){
 const byId=new Map(nodes.map(n=>[n.id,n])),labels:Point[]=[];
 function portOffset(nodeId:string,edgeId:string,terminal:boolean,horizontal:boolean){const related=edges.filter(e=>{if((terminal?e.target:e.source)!==nodeId)return false;const a=byId.get(e.source)!,b=byId.get(e.target)!;return (Math.abs(b.x-a.x)>=Math.abs(b.y-a.y))===horizontal;});return clampPort((related.findIndex(e=>e.id===edgeId)-(related.length-1)/2)*22);}
 function clampPort(v:number){return Math.max(-30,Math.min(30,v));}
 return edges.map(e=>{const a=byId.get(e.source)!,b=byId.get(e.target)!,patch=document.edges[e.id],dx=b.x-a.x,dy=b.y-a.y;
 const horizontal=Math.abs(dx)>=Math.abs(dy),sign=horizontal?Math.sign(dx||1):Math.sign(dy||1),padA=a.kind==="note"?100:58,padB=b.kind==="note"?100:58;
 const startOffset=portOffset(a.id,e.id,false,horizontal),endOffset=portOffset(b.id,e.id,true,horizontal);
 const start=horizontal?{x:a.x+sign*padA,y:a.y+startOffset}:{x:a.x+startOffset,y:a.y+(sign>0?120:-65)},end=horizontal?{x:b.x-sign*padB,y:b.y+endOffset}:{x:b.x+endOffset,y:b.y+(sign>0?-65:120)};
 let points:Point[];
 if(e.route==="straight")points=[start,end];else{const lane=horizontal?patch?.viaX:patch?.viaY,mid=horizontal?(start.x+end.x)/2:(start.y+end.y)/2;
 const options=(lane!==undefined?[lane]:[mid,mid-90,mid+90,Math.min(a.x,b.x)-180,Math.max(a.x,b.x)+180]).map(v=>horizontal?[start,{x:v,y:start.y},{x:v,y:end.y},end]:[start,{x:start.x,y:v},{x:end.x,y:v},end]);
 points=options.sort((p,q)=>{const cost=(v:Point[])=>nodes.filter(n=>n.id!==a.id&&n.id!==b.id&&hitsNode(v,n)).length*10000+pathLength(v);return cost(p)-cost(q);})[0];}
 let longest=0,index=0;for(let i=0;i<points.length-1;i++){const length=distance(points[i],points[i+1]);if(length>longest){longest=length;index=i;}}
 const mid={x:(points[index].x+points[index+1].x)/2,y:(points[index].y+points[index+1].y)/2};let label={x:patch?.labelX??mid.x,y:patch?.labelY??mid.y};
 if(patch?.labelX===undefined||patch?.labelY===undefined){let best=Infinity;for(const ox of [0,-100,100,-190,190])for(const oy of [0,-60,60,-90,90,-120,120]){const p={x:mid.x+ox,y:mid.y+oy},collision=nodes.filter(n=>n.kind==="person"?((Math.abs(n.x-p.x)<157&&Math.abs(n.y-p.y)<86)||(Math.abs(n.x-p.x)<185&&p.y>n.y+42&&p.y<n.y+148)):(Math.abs(n.x-p.x)<205&&p.y>n.y-98&&p.y<n.y+125)).length+labels.filter(l=>Math.abs(l.x-p.x)<195&&Math.abs(l.y-p.y)<66).length,cost=collision*10000+distance(p,mid);if(cost<best){best=cost;label=p;}}}
 labels.push(label);return {id:e.id,points,label,handle:points.length>2?{x:(points[1].x+points[2].x)/2,y:(points[1].y+points[2].y)/2}:mid,path:points.map((p,i)=>(i?"L":"M")+p.x+","+p.y).join(" ")};
 });
}
export function wrapDiagramText(text:string,maxCharacters=16,maxLines=3){const rows:string[]=[];for(const line of text.split("\n")){let rest=line;while(rest.length>maxCharacters){rows.push(rest.slice(0,maxCharacters));rest=rest.slice(maxCharacters);}rows.push(rest);}return rows.slice(0,maxLines).map((s,i)=>i===maxLines-1&&rows.length>maxLines?s.slice(0,-1)+"…":s);}
