import orderModel from "./structure-order.json";
import {diagramSchema, type DiagramDocument} from "./DiagramDocument";
import type {BoardEdge, BoardNode, Point} from "./DiagramLayout";

type Link = [number, number];
type Size = {width:number; height:number};
const sum = (values:number[]) => values.reduce((a,b) => a+b, 0);

function inference(features:number[]) {
  let values = features;
  for (const [layer, weights] of orderModel.weights.entries()) {
    values = orderModel.biases[layer].map((bias,j) => {
      let x = bias;
      for (let i=0; i<values.length; i++) x += values[i]*weights[i][j];
      return layer === orderModel.weights.length-1 ? x : Math.max(0,x);
    });
  }
  return values[0];
}

function orderCost(rows:number[][], links:Link[]) {
  const points:Point[] = [];
  rows.forEach((row,y) => row.forEach((node,x) => {points[node] = {x:x-(row.length-1)/2,y};}));
  const side = (a:Point,b:Point,c:Point) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  let crossings=0, hits=0, length=0;
  links.forEach(([u,v],i) => {
    const a=points[u], b=points[v], dx=b.x-a.x, dy=b.y-a.y, squared=dx*dx+dy*dy;
    length += Math.sqrt(squared);
    for (const p of points) {
      const x=p.x-a.x, y=p.y-a.y, t=(x*dx+y*dy)/squared;
      if (t>0 && t<1 && Math.max(Math.abs(x-t*dx),Math.abs(y-t*dy))<.25) hits++;
    }
    for (let j=0; j<i; j++) {
      const c=points[links[j][0]], d=points[links[j][1]];
      if (side(a,b,c)*side(a,b,d)<0 && side(c,d,a)*side(c,d,b)<0) crossings++;
    }
  });
  return 4*hits+crossings+.12*length;
}

export function structureOrder(n:number, edges:Link[]) {
  const adjacent=Array.from({length:n},()=>new Set<number>()), links:Link[]=[];
  for (const [a,b] of edges) {
    if (a===b || !adjacent[a] || !adjacent[b] || adjacent[a].has(b)) continue;
    adjacent[a].add(b); adjacent[b].add(a); links.push([a,b]);
  }
  const depth=Array<number>(n).fill(-1);
  const roots=adjacent.map((_,i)=>i).sort((a,b)=>adjacent[b].size-adjacent[a].size || a-b);
  for (const root of roots) {
    if (depth[root]>=0) continue;
    depth[root]=0;
    const queue=[root];
    for (const node of queue) for (const neighbor of adjacent[node]) {
      if (depth[neighbor]>=0) continue;
      depth[neighbor]=depth[node]+1;
      queue.push(neighbor);
    }
  }
  const rows:number[][]=[];
  depth.forEach((d,i)=>(rows[d]??=[]).push(i));
  const ranks=Array<number>(n);
  rows.forEach(row=>row.forEach((node,k)=>{ranks[node]=(2*k-row.length+1)/Math.max(1,row.length-1);}));
  const meanNeighbor=(values:number[],i:number,direction?:number)=>{
    const near=[...adjacent[i]].filter(j=>direction===undefined || Math.sign(depth[j]-depth[i])===direction);
    return near.length ? sum(near.map(j=>values[j]))/near.length : ranks[i];
  };
  const near=ranks.map((_,i)=>meanNeighbor(ranks,i));
  // ponytail: the model's measured range is 3–14 units. Larger layers use one barycentric sweep.
  const scores=n>=3 && n<=14 ? ranks.map((rank,i)=>inference([
    rank,near[i],meanNeighbor(near,i),meanNeighbor(ranks,i,-1),meanNeighbor(ranks,i,0),
    meanNeighbor(ranks,i,1),adjacent[i].size/n,depth[i]/Math.max(1,rows.length-1),rows[depth[i]].length/n,
  ])) : near;
  const candidate=rows.map(row=>row.slice().sort((a,b)=>scores[a]-scores[b] || a-b));
  const accept=links.length>0 && orderCost(candidate,links)<orderCost(rows,links)-1e-8;
  return {rows:accept?candidate:rows,scores};
}

const categories:Record<string,string>={
  payment:"금전 기록", communication:"연락 기록", family:"가족 관련 기록", work:"업무 기록",
  violence:"신체 관련 진술", threat:"위협 관련 진술",
};
type Frame=DiagramDocument["groups"][number];
const colors:Frame["color"][]=["blue","mint","violet","amber","rose","slate"];

/** Only group participants joined by an actual source sentence in the same evidence file. */
function addSourceFrames(doc:DiagramDocument, nodes:BoardNode[], edges:BoardEdge[]) {
  const byEvidence=new Map<string, BoardEdge[]>();
  for (const edge of edges) {
    if (!edge.evidenceId || edge.manual) continue;
    const existing=byEvidence.get(edge.evidenceId);
    if (existing) existing.push(edge); else byEvidence.set(edge.evidenceId,[edge]);
  }
  const available=new Set(nodes.filter(node=>!node.manual && doc.nodes[node.id]?.groupId===undefined).map(n=>n.id));
  const positions=new Map(nodes.map(n=>[n.id,n]));
  const generated=new Set<string>();
  for (const [,statements] of [...byEvidence].sort(([a,ae],[b,be])=>be.length-ae.length || (a<b?-1:a>b?1:0))) {
    const neighbors=new Map<string,Set<string>>();
    for (const {source,target} of statements) {
      if (!available.has(source) || !available.has(target)) continue;
      if (!neighbors.has(source)) neighbors.set(source,new Set());
      if (!neighbors.has(target)) neighbors.set(target,new Set());
      neighbors.get(source)!.add(target); neighbors.get(target)!.add(source);
    }
    const seen=new Set<string>();
    for (const first of neighbors.keys()) {
      if (seen.has(first)) continue;
      const members=[first]; seen.add(first);
      for (const member of members) for (const other of neighbors.get(member)!) {
        if (!seen.has(other)) {seen.add(other); members.push(other);}
      }
      if (members.length<2 || members.length>6 || members.length===nodes.length || doc.groups.length>=30) continue;
      const kinds=new Set(edges.filter(e=>members.includes(e.source)&&members.includes(e.target)).map(e=>e.kind));
      const label=kinds.size===1?categories[[...kinds][0]]:undefined;
      let serial=doc.groups.length+1;
      while(doc.groups.some(g=>g.id==="group:source-"+serial)) serial++;
      const id="group:source-"+serial;
      doc.groups.push({id,label:label??"함께 언급된 항목",color:colors[doc.groups.length%colors.length],x:0,y:0,width:200,height:200});
      generated.add(id);
      for (const member of members) {
        const n=positions.get(member)!;
        doc.nodes[member]={x:n.x,y:n.y,...doc.nodes[member],groupId:id}; available.delete(member);
      }
    }
  }
  return generated;
}

function linksFor(ids:string[], edges:Array<{source:string;target:string}>):Link[] {
  const index=new Map(ids.map((id,i)=>[id,i]));
  const links:Link[]=[];
  for (const edge of edges) {
    const a=index.get(edge.source), b=index.get(edge.target);
    if (a!==undefined && b!==undefined && a!==b) links.push([a,b]);
  }
  return links;
}

/** Place each block using its measured footprint; a multiperson frame occupies its full width. */
function placeBlocks(rows:number[][], blocks:Size[]) {
  const limit=Math.max(3,Math.ceil(Math.sqrt(blocks.length)));
  const lines=rows.flatMap(row=>{
    const pieces:number[][]=[];
    for(let i=0;i<row.length;i+=limit) pieces.push(row.slice(i,i+limit));
    return pieces;
  });
  const widths=lines.map(line=>sum(line.map(i=>blocks[i].width))+(line.length-1)*132);
  const widest=Math.max(0,...widths), points:Point[]=[];
  let y=80;
  lines.forEach((line,row)=>{
    const height=Math.max(...line.map(i=>blocks[i].height));
    let x=64+(widest-widths[row])/2;
    for(const i of line) {
      points[i]={x:Math.round(x),y:Math.round(y+(height-blocks[i].height)/2)};
      x+=blocks[i].width+132;
    }
    y+=height+145;
  });
  return points;
}

export function structureDocument(board:{nodes:BoardNode[];edges:BoardEdge[]}, document:DiagramDocument):DiagramDocument {
  const next=structuredClone(document);
  const generated=addSourceFrames(next,board.nodes,board.edges);
  const frameIds=new Set(next.groups.map(g=>g.id));
  const unitFor=(id:string)=>{const group=next.nodes[id]?.groupId;return group && frameIds.has(group)?group:id;};
  const free=board.nodes.filter(n=>unitFor(n.id)===n.id);
  const units=[...next.groups.map(g=>g.id),...free.map(n=>n.id)];
  const boxes:Size[]=[], origins:Point[]=[];
  for (const g of next.groups) {
    const members=board.nodes.filter(n=>unitFor(n.id)===g.id);
    if (generated.has(g.id)) {
      const ids=members.map(n=>n.id);
      const order=structureOrder(ids.length,linksFor(ids,board.edges)).rows.flat();
      const cols=Math.min(3,Math.ceil(Math.sqrt(members.length)));
      g.width=92+cols*215+(cols-1)*112;
      g.height=100+Math.ceil(members.length/cols)*190+(Math.ceil(members.length/cols)-1)*82;
      order.forEach((i,k)=>{
        const p=next.nodes[members[i].id];
        p.x=154+(k%cols)*327; p.y=132+Math.floor(k/cols)*272;
      });
    }
    // Members can have been manually dragged across a frame edge; reserve space for both.
    const patches=members.map(n=>next.nodes[n.id]);
    const left=Math.min(g.x,...patches.map(p=>p.x-108)), top=Math.min(g.y,...patches.map(p=>p.y-70));
    const right=Math.max(g.x+g.width,...patches.map(p=>p.x+108)), bottom=Math.max(g.y+g.height,...patches.map(p=>p.y+122));
    origins.push({x:left,y:top}); boxes.push({width:right-left,height:bottom-top});
  }
  for (const _ of free) boxes.push({width:216,height:192});
  const links=board.edges.map(e=>({source:unitFor(e.source),target:unitFor(e.target)}));
  const rows=structureOrder(units.length,linksFor(units,links)).rows;
  const points=placeBlocks(rows,boxes);
  next.groups.forEach((g,i)=>{
    const dx=points[i].x-origins[i].x, dy=points[i].y-origins[i].y;
    g.x+=dx; g.y+=dy;
    for(const n of board.nodes.filter(n=>unitFor(n.id)===g.id)) {
      next.nodes[n.id].x+=dx; next.nodes[n.id].y+=dy;
    }
  });
  free.forEach((n,i)=>{
    const p=points[next.groups.length+i];
    next.nodes[n.id]={...next.nodes[n.id],x:p.x+108,y:p.y+70};
  });
  // Do not replace a valid hand-edited board if large pre-existing frames exceed editor limits.
  return diagramSchema.safeParse(next).success ? next : structuredClone(document);
}
