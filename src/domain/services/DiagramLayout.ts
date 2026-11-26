import model from "./layout-ranker.json";
import coordinates from "./layout-generator.json";
import {structureDocument} from "./StructureLayout";
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
export function predictCoordinates(n:number,links:Array<[number,number]>):Point[]{
 const seed=Array.from({length:n},(_,i)=>{const radius=Math.sqrt((i+1)/n),angle=i*2.399963229728653;return {x:Math.cos(angle)*radius,y:Math.sin(angle)*radius};});
 const adjacent=seed.map(()=>new Set<number>());
 for(const [a,b] of links)if(a!==b){adjacent[a].add(b);adjacent[b].add(a);}
 const aggregate=(points:Point[])=>adjacent.map(near=>{
   let x=0,y=0;for(const other of near){x+=points[other].x;y+=points[other].y;}
   return {x:x/Math.max(1,near.size),y:y/Math.max(1,near.size)};
 });
 const neighbors=aggregate(seed),second=aggregate(neighbors);
 return seed.map((p,i)=>{
   let v=[p.x,p.y,neighbors[i].x,neighbors[i].y,second[i].x,second[i].y,adjacent[i].size/n,n/14];
   for(const [layer,weights] of coordinates.weights.entries()){
     const out=coordinates.biases[layer].slice();
     for(let j=0;j<out.length;j++){for(let k=0;k<v.length;k++)out[j]+=v[k]*weights[k][j];}
     v=layer===coordinates.weights.length-1?out:out.map(x=>Math.max(0,x));
   }
   return {x:v[0],y:v[1]};
 });
}
export function proposeLayouts(nodes:Array<{id:string}>,edges:Array<{source:string;target:string}>){
 if(!nodes.length)return [];
 const indexes=new Map(nodes.map((n,i)=>[n.id,i])),links=edges.filter(e=>indexes.has(e.source)&&indexes.has(e.target)).map(e=>[indexes.get(e.source)!,indexes.get(e.target)!] as [number,number]),degree=Array(nodes.length).fill(0);
 for(const [a,b] of links){degree[a]++;degree[b]++;}
 const order=nodes.map((_,i)=>i).sort((a,b)=>degree[b]-degree[a]||a-b),cols=Math.max(2,Math.ceil(Math.sqrt(nodes.length))),names=["인물 중심","사건 흐름","균등 격자","원형 연결","두 줄 구성","가로 흐름"];
 const layouts=names.map((name,mode)=>{const points:Point[]=Array(nodes.length);order.forEach((i,rank)=>{let x:number,y:number;
 if(mode===0){x=rank===0?650:230+((rank-1)%3)*360;y=rank===0?160:470+Math.floor((rank-1)/3)*330;}
 else if(mode===1){x=210+(rank%3)*380;y=180+Math.floor(rank/3)*310;}
 else if(mode===2){x=180+(rank%cols)*330;y=180+Math.floor(rank/cols)*300;}
 else if(mode===3){const angle=rank/Math.max(1,nodes.length)*Math.PI*2,r=Math.max(360,nodes.length*48);x=r+200+Math.cos(angle)*r;y=r+200+Math.sin(angle)*r;}
 else if(mode===4){x=200+(rank%2)*420;y=180+Math.floor(rank/2)*280;}
 else{x=210+Math.floor(rank/3)*380;y=180+(rank%3)*310;}points[i]={x,y};});
 const features=layoutFeatures(points,links);return {name,positions:Object.fromEntries(nodes.map((n,i)=>[n.id,points[i]])),score:rankLayout(features),features};});
 // Training covers 3–14 elements; larger boards retain the geometric layouts.
 if(nodes.length>=3&&nodes.length<=14){
   const predicted=predictCoordinates(nodes.length,links);
   let scale=260*Math.sqrt(nodes.length);
   for(let i=0;i<predicted.length;i++)for(let j=i+1;j<predicted.length;j++){
     const dx=Math.abs(predicted[i].x-predicted[j].x),dy=Math.abs(predicted[i].y-predicted[j].y);
     scale=Math.max(scale,Math.min(245/Math.max(dx,.001),245/Math.max(dy,.001)));
   }
   if(scale<4000){
     const left=Math.min(...predicted.map(p=>p.x)),top=Math.min(...predicted.map(p=>p.y));
     const points=predicted.map(p=>({x:160+Math.round((p.x-left)*scale),y:140+Math.round((p.y-top)*scale)}));
     const features=layoutFeatures(points,links);
     layouts.push({name:"학습 좌표",positions:Object.fromEntries(nodes.map((n,i)=>[n.id,points[i]])),score:rankLayout(features),features});
   }
 }
 return layouts.sort((a,b)=>Number(a.features[0]>0)-Number(b.features[0]>0)||b.score-a.score);
}
export function composeBoard(graph:RelationshipMap,document:DiagramDocument){
 const rawNodes=[...graph.nodes.map(n=>({id:n.id,label:n.label,kind:n.kind==="action"?"note" as const:n.kind,ambiguous:n.ambiguous,manual:false})),...document.manualNodes.map(n=>({...n,ambiguous:false,manual:true}))];
 const rawEdges=[...graph.edges,...document.manualEdges.map(e=>({id:e.id,source:e.source,target:e.target,action:e.label,kind:"manual",amount:null,polarity:"reported" as const,directed:e.directed,confirmed:false,quote:"",evidenceId:null,candidateId:null,score:0}))];
 const visible=rawNodes.filter(n=>!document.nodes[n.id]?.hidden),visibleIds=new Set(visible.map(n=>n.id)),rawLinks=rawEdges.filter(e=>visibleIds.has(e.source)&&visibleIds.has(e.target)&&!document.edges[e.id]?.hidden);
 const suggested=visible.some(n=>!document.nodes[n.id])?proposeLayouts(visible,rawLinks)[0]?.positions??{}:{};
 const nodes:BoardNode[]=visible.map(n=>{const patch=document.nodes[n.id];return {id:n.id,label:patch?.label??n.label,originalLabel:n.label,subtitle:patch?.subtitle??(n.ambiguous?"별칭 · 신원 미확인":""),kind:patch?.shape??n.kind,color:patch?.color??(n.kind==="organization"?"blue":n.kind==="note"?"amber":"mint"),manual:n.manual,portraitEvidenceId:patch?.portraitEvidenceId,groupId:patch?.groupId,x:patch?.x??suggested[n.id]?.x??200,y:patch?.y??suggested[n.id]?.y??200};});
 // Keep saved positions fixed while new evidence nodes find an unoccupied nearby slot.
 const placed=nodes.filter(n=>document.nodes[n.id]);for(const n of nodes.filter(n=>!document.nodes[n.id])){let tries=0;while(placed.some(p=>Math.abs(p.x-n.x)<210&&Math.abs(p.y-n.y)<230)&&tries++<180){n.x+=260;if(tries%4===0){n.x-=1040;n.y+=260;}}placed.push(n);}
 const edges:BoardEdge[]=rawLinks.map(e=>{const p=document.edges[e.id];return {...e,label:p?.label??e.action,detail:p?.detail??[e.amount,"when" in e?e.when:undefined].filter(Boolean).join(" · "),color:p?.color??(e.polarity==="denied"?"rose":e.kind==="payment"?"amber":e.kind==="family"?"violet":"slate"),manual:e.kind==="manual",dashed:p?.dashed??(!e.confirmed||e.polarity!=="reported"),route:p?.route??"elbow"};});
 return {nodes,edges};
}
export function arrangeDiagram(graph:RelationshipMap, document:DiagramDocument):DiagramDocument {
 return structureDocument(composeBoard(graph,document),document);
}
export function boardBounds(nodes:Point[],groups:Array<{x:number;y:number;width:number;height:number}>=[]){
 if(!nodes.length&&!groups.length)return {x:0,y:0,width:1100,height:720};
 const left=[...nodes.map(n=>n.x-120),...groups.map(g=>g.x)],top=[...nodes.map(n=>n.y-120),...groups.map(g=>g.y)],right=[...nodes.map(n=>n.x+120),...groups.map(g=>g.x+g.width)],bottom=[...nodes.map(n=>n.y+145),...groups.map(g=>g.y+g.height)];
 const x=Math.min(...left)-55,y=Math.min(...top)-55;return {x,y,width:Math.max(400,Math.max(...right)-x+55),height:Math.max(350,Math.max(...bottom)-y+55)};
}
type Rect = { left: number; top: number; right: number; bottom: number };
type Segment = { a: Point; b: Point };
const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const clampTo = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));
const centeredRect = (p: Point, width: number, height: number): Rect => ({
  left: p.x - width / 2, right: p.x + width / 2, top: p.y - height / 2, bottom: p.y + height / 2,
});
function segmentHits(a: Point, b: Point, box: Rect) {
  if (Math.max(a.x,b.x) <= box.left || Math.min(a.x,b.x) >= box.right ||
      Math.max(a.y,b.y) <= box.top || Math.min(a.y,b.y) >= box.bottom) return false;
  if (a.x === b.x || a.y === b.y) return true;
  const x1=(box.left-a.x)/(b.x-a.x), x2=(box.right-a.x)/(b.x-a.x);
  const y1=(box.top-a.y)/(b.y-a.y), y2=(box.bottom-a.y)/(b.y-a.y);
  return Math.max(0,Math.min(x1,x2),Math.min(y1,y2)) < Math.min(1,Math.max(x1,x2),Math.max(y1,y2));
}
function cleanRoute(points: Point[]) {
  const result: Point[] = [];
  for (const p of points) {
    const b=result.at(-1), a=result.at(-2);
    if (b?.x === p.x && b.y === p.y) continue;
    if (a && b && (a.x === b.x && b.x === p.x && (b.y-a.y)*(p.y-b.y)>=0 ||
                   a.y === b.y && b.y === p.y && (b.x-a.x)*(p.x-b.x)>=0)) result.pop();
    result.push(p);
  }
  return result;
}
function crossingCost(a: Point, b: Point, other: Segment) {
  const {a:c,b:d}=other;
  if (Math.min(a.x,b.x)>Math.max(c.x,d.x) || Math.max(a.x,b.x)<Math.min(c.x,d.x) ||
      Math.min(a.y,b.y)>Math.max(c.y,d.y) || Math.max(a.y,b.y)<Math.min(c.y,d.y)) return 0;
  const horizontal=a.y===b.y && c.y===d.y && a.y===c.y;
  const vertical=a.x===b.x && c.x===d.x && a.x===c.x;
  if (horizontal || vertical) {
    const k=horizontal?"x":"y";
    const shared=Math.min(Math.max(a[k],b[k]),Math.max(c[k],d[k]))-Math.max(Math.min(a[k],b[k]),Math.min(c[k],d[k]));
    return shared>0 ? 140+shared*3 : 0;
  }
  return orientation(a,b,c)*orientation(a,b,d)<0 && orientation(c,d,a)*orientation(c,d,b)<0 ? 60 : 0;
}
function closestPoint(p: Point, a: Point, b: Point): Point {
  const dx=b.x-a.x, dy=b.y-a.y;
  const t=clampTo(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1),0,1);
  return {x:a.x+t*dx,y:a.y+t*dy};
}
function caption(edge: BoardEdge) {
  const labelLines=wrapDiagramText(edge.label,10,2);
  const detailLine=edge.detail ? wrapDiagramText(edge.detail,14,1)[0] : "";
  const qualifier=edge.manual?"직접 작성":({reported:"",denied:"부인 진술",planned:"예정·가정",uncertain:"전언·불확실"})[edge.polarity];
  function width(text: string, font: number) {
    if (measuring) {
      measuring.font=`650 ${font}px Pretendard, "Malgun Gothic", sans-serif`;
      return measuring.measureText(text).width;
    }
    return Array.from(diagramSegmenter.segment(text),part=>/^[\x20-\x7E]$/.test(part.segment)?font*.68:font).reduce((a,b)=>a+b,0);
  }
  const labelWidth=Math.ceil(Math.max(38,...labelLines.map(s=>width(s,18)),width(detailLine,14),width(qualifier,13)))+24;
  return {labelLines,detailLine,labelWidth,labelHeight:14+labelLines.length*22+(detailLine?17:0)+(qualifier?17:0)};
}

export function boardRoutes(nodes: BoardNode[], edges: BoardEdge[], document: DiagramDocument) {
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const obstacles=nodes.map(n=>({left:n.x-99,right:n.x+99,top:n.y-75,bottom:n.y+95}));
  for (const g of document.groups) obstacles.push({left:g.x,top:g.y,right:g.x+g.width,bottom:g.y+48});
  const captions=edges.map(caption);
  edges.forEach((edge,i)=>{
    const patch=document.edges[edge.id];
    if(patch?.labelX!==undefined && patch.labelY!==undefined) {
      const c=captions[i];
      obstacles.push(centeredRect({x:patch.labelX,y:patch.labelY},c.labelWidth+12,c.labelHeight+10));
    }
  });
  const ends=edges.map(edge=>{
    const a=byId.get(edge.source)!, b=byId.get(edge.target)!;
    const horizontal=Math.abs(b.x-a.x)>=Math.abs(b.y-a.y);
    const sign=Math.sign(horizontal?b.x-a.x:b.y-a.y)||1;
    return {a,b,horizontal,sign};
  });
  // Incoming and outgoing tips share a physical side. Distribute both on that side in reading order.
  const fans=new Map<string,Array<{i:number;end:0|1;near:number}>>();
  ends.forEach(({a,b,horizontal,sign},i)=>{
    ([0,1] as const).forEach(end=>{
      const n=end?b:a, other=end?a:b, key=JSON.stringify([n.id,horizontal,end?-sign:sign]);
      const fan=fans.get(key)??[];
      fan.push({i,end,near:horizontal?other.y:other.x});
      fans.set(key,fan);
    });
  });
  const offsets=edges.map(()=>[0,0]);
  for (const fan of fans.values()) {
    fan.sort((a,b)=>a.near-b.near || (edges[a.i].id<edges[b.i].id?-1:1));
    const step=Math.min(21,96/Math.max(1,fan.length-1));
    fan.forEach((p,j)=>{offsets[p.i][p.end]=(j-(fan.length-1)/2)*step;});
  }
  const used: Segment[]=[];
  const routes=edges.map((edge,i)=>{
    const {a,b,horizontal,sign}=ends[i], patch=document.edges[edge.id];
    const point=(u:number,v:number):Point=>horizontal?{x:u,y:v}:{x:v,y:u};
    const u=(p:Point)=>horizontal?p.x:p.y, v=(p:Point)=>horizontal?p.y:p.x;
    const port=(n:BoardNode,side:number,offset:number)=>horizontal
      ? {x:n.x+side*93,y:n.y+10+offset}
      : {x:n.x+offset,y:n.y+(side<0?-69:89)};
    const start=port(a,sign,offsets[i][0]), end=port(b,-sign,offsets[i][1]);
    const from=u(start)+sign*24, to=u(end)-sign*24, sv=v(start), ev=v(end);
    const fromStub=point(from,sv), toStub=point(to,ev), middle=(from+to)/2;
    const lane=horizontal?patch?.viaX:patch?.viaY, across=horizontal?patch?.viaY:patch?.viaX;
    const horizontalLane=(along:number)=>cleanRoute([start,fromStub,point(along,sv),point(along,ev),toStub,end]);
    const crossLane=(side:number)=>cleanRoute([start,fromStub,point(from,side),point(to,side),toStub,end]);
    function cost(path:Point[], limit:number) {
      let total=(path.length-2)*19;
      for(let j=1;j<path.length;j++){
        const p=path[j-1], q=path[j]; total+=distance(p,q);
        for(let k=0;k<obstacles.length;k++){
          if (j===1 && nodes[k]?.id===a.id || j===path.length-1 && nodes[k]?.id===b.id) continue;
          if(segmentHits(p,q,obstacles[k])) total+=1000000;
        }
        if(total>=limit) return total;
        for(const line of used) total+=crossingCost(p,q,line);
        if(total>=limit) return total;
      }
      return total;
    }
    let points:Point[], handle:Point|undefined;
    if (edge.route==="straight") points=[start,end];
    else if (lane!==undefined || across!==undefined) {
      const main=lane??middle, side=across??(sv+ev)/2;
      handle=point(main,side);
      const followsLane=side>=Math.min(sv,ev) && side<=Math.max(sv,ev);
      points=cleanRoute(followsLane
        ? [start,point(main,sv),point(main,ev),end]
        : [start,point(main,sv),handle,point(to,side),toStub,end]);
      if(across!==undefined && main>=Math.min(from,to) && main<=Math.max(from,to)){
        const transverse=crossLane(side);
        if(cost(transverse,Infinity)<cost(points,Infinity)) points=transverse;
      }
    } else {
      // ponytail: score single-track detours for interactive dragging; a maze of overlapping manual cards can require a visibility-graph router.
      let best=horizontalLane(middle), bestCost=cost(best,Infinity);
      function consider(path:Point[]) {const c=cost(path,bestCost); if(c<bestCost){bestCost=c;best=path;}}
      if (bestCost>distance(start,end)+.01) {
        for(const main of [from,to,middle-32,middle+32]) consider(horizontalLane(main));
        const rails=new Set([(sv+ev)/2,Math.min(sv,ev)-32,Math.max(sv,ev)+32]);
        const near=obstacles.filter(r=>horizontal
          ? r.right>Math.min(from,to) && r.left<Math.max(from,to)
          : r.bottom>Math.min(from,to) && r.top<Math.max(from,to));
        for(const r of near) {
          rails.add((horizontal?r.top:r.left)-12);
          rails.add((horizontal?r.bottom:r.right)+12);
        }
        for(const rail of [...rails].sort((x,y)=>Math.abs(x-(sv+ev)/2)-Math.abs(y-(sv+ev)/2))) consider(crossLane(rail));
      }
      points=best;
    }
    if(points.length<2) points=[start,end];
    const segments=points.slice(1).map((b,j)=>({a:points[j],b}));
    used.push(...segments);
    const longest=segments.reduce((best,s)=>distance(s.a,s.b)>distance(best.a,best.b)?s:best,segments[0]);
    handle??={x:(longest.a.x+longest.b.x)/2,y:(longest.a.y+longest.b.y)/2};
    return {id:edge.id,points,segments,handle,path:points.map((p,i)=>(i?"L":"M")+p.x+","+p.y).join(" "),...captions[i]};
  });

  const occupied=obstacles.slice();
  return routes.map(r=>{
    const patch=document.edges[r.id], pinned=patch?.labelX!==undefined && patch.labelY!==undefined;
    let best=Infinity, label=r.handle, anchor=r.handle;
    const otherLines=used.filter(s=>!r.segments.includes(s));
    function candidate(x:number,y:number,mid:Point,a:Point,b:Point) {
      const p={x:patch?.labelX??x,y:patch?.labelY??y};
      const foot=closestPoint(p,a,b);
      const box=centeredRect(p,r.labelWidth+8,r.labelHeight+6);
      let score=distance(p,foot)+distance(mid,foot)*.12;
      if (!pinned) {
        for(const ob of occupied) if(overlaps(box,ob)) score+=100000;
        if(score>=best) return;
        for(const s of otherLines) if(segmentHits(s.a,s.b,box)) score+=140;
        for(const s of r.segments) if(segmentHits(s.a,s.b,box)) score+=100;
      }
      if(score<best){best=score;label=p;anchor=foot;}
    }
    const segments=[...r.segments].sort((x,y)=>distance(y.a,y.b)-distance(x.a,x.b));
    for(const {a,b} of segments) {
      const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      const horizontal=Math.abs(b.x-a.x)>=Math.abs(b.y-a.y);
      for(const t of [.5,.28,.72,.12,.88]) {
        const x=a.x+(b.x-a.x)*t, y=a.y+(b.y-a.y)*t;
        for(const level of [-1,1,-2,2,0]){
          const offset=level*((horizontal?r.labelHeight:r.labelWidth)/2+10);
          candidate(x+(horizontal?0:offset),y+(horizontal?offset:0),mid,a,b);
        }
      }
    }
    // If every nearby caption slot is occupied, walk the blocked intervals to the nearest free gap.
    if(best>=100000 && !pinned) {
      const halfX=r.labelWidth/2+5, halfY=r.labelHeight/2+4;
      for(const {a,b} of segments){
        const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        for(const axis of ["x","y"] as const){
          if((axis==="x"?patch?.labelX:patch?.labelY)!==undefined) continue;
          const fixed=axis==="x"?(patch?.labelY??mid.y):(patch?.labelX??mid.x);
          const intervals=occupied.filter(o=>axis==="x"
            ? fixed>o.top-halfY && fixed<o.bottom+halfY : fixed>o.left-halfX && fixed<o.right+halfX)
            .map(o=>axis==="x"?[o.left-halfX,o.right+halfX]:[o.top-halfY,o.bottom+halfY]);
          for(const sign of [-1,1]){
            let pos=mid[axis];
            intervals.sort((l,r)=>sign>0?l[0]-r[0]:r[1]-l[1]);
            for(const [lo,hi] of intervals) if(pos>lo && pos<hi) pos=sign>0?hi:lo;
            candidate(axis==="x"?pos:fixed,axis==="y"?pos:fixed,mid,a,b);
          }
        }
      }
    }
    if(!pinned) occupied.push(centeredRect(label,r.labelWidth+10,r.labelHeight+8));
    return {...r,label,anchor};
  });
}
const diagramSegmenter=new Intl.Segmenter('ko',{granularity:'grapheme'});
let measuring:CanvasRenderingContext2D|null|undefined;
export function wrapDiagramText(text:string,maxCharacters=16,maxLines=3){
 if(measuring===undefined&&typeof globalThis.document!=='undefined')measuring=globalThis.document.createElement('canvas').getContext('2d');
 if(measuring)measuring.font='650 13px Pretendard, "Malgun Gothic", sans-serif';
 const width=(s:string)=>measuring?measuring.measureText(s).width:[...diagramSegmenter.segment(s)].length;
 const limit=measuring?maxCharacters*13:maxCharacters,rows:string[]=[];
 for(const line of text.split('\n')){let rest=line.trim();while(width(rest)>limit){const chars=[...diagramSegmenter.segment(rest)].map(s=>s.segment);let count=1;while(count<chars.length&&width(chars.slice(0,count+1).join(''))<=limit)count++;let cut=chars.slice(0,count).join(''),space=cut.lastIndexOf(' ');if(space>cut.length*.4)cut=cut.slice(0,space);rows.push(cut.trimEnd());rest=rest.slice(cut.length).trimStart();}rows.push(rest);}
 if(rows.length<=maxLines)return rows;
 const result=rows.slice(0,maxLines);let last=result[maxLines-1];while(last&&width(last+'…')>limit){const parts=[...diagramSegmenter.segment(last)];last=parts.slice(0,-1).map(s=>s.segment).join('');}result[maxLines-1]=last+'…';return result;
}
