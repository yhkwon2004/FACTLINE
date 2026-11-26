"use client";
import {useEffect,useMemo,useRef,useState,type PointerEvent as ReactPointerEvent,type KeyboardEvent as ReactKeyboardEvent} from "react";
import Link from "next/link";
import {ArrowUpRight,MousePointer2,Hand,UserRound,StickyNote,Link2,Group,Undo2,Redo2,Maximize2,Minimize2,Download,Save,Sparkles,ZoomIn,ZoomOut,Focus,Trash2,X,AlignHorizontalJustifyCenter,AlignVerticalJustifyCenter,Grid2X2,Network,Building2,FileText,Layers} from "lucide-react";
import {emptyDiagram,diagramColors,diagramSchema,type DiagramDocument,type DiagramSnapshot} from "../../domain/services/DiagramDocument";
import {boardBounds,boardPalette,boardRoutes,arrangeDiagram,composeBoard,proposeLayouts,wrapDiagramText,type Point,type BoardNode,type BoardEdge} from "../../domain/services/DiagramLayout";
import type {RelationshipMap} from "../../domain/services/RelationshipGraph";
import {AudioTranscript} from "./AudioTranscript";
import {Button,Field,Input,Textarea} from "./UI";

type Tool="select"|"hand"|"person"|"note"|"connect"|"group";
type Selection={kind:"node"|"edge"|"group";ids:string[]}|null;
type Camera={x:number;y:number;scale:number};
type Gesture={mode:"node"|"label"|"bend"|"group"|"resize"|"pan"|"marquee"|"frame"|"pinch";start:Point;screen:Point;before:DiagramDocument;camera:Camera;selection:Selection;id?:string;distance?:number;anchor?:Point;moved?:boolean};
const clone=(d:DiagramDocument)=>structuredClone(d);
const snap=(v:number)=>Math.round(v/20)*20;
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
function drawingBounds(nodes:BoardNode[],groups:DiagramDocument["groups"],routes:ReturnType<typeof boardRoutes>) {
 const rects=[
   ...nodes.map(n=>({x:n.x-90,y:n.y-66,w:180,h:152})),
   ...groups.map(g=>({x:g.x,y:g.y,w:g.width,h:g.height})),
   ...routes.flatMap(r=>[{x:r.label.x-r.labelWidth/2,y:r.label.y-r.labelHeight/2,w:r.labelWidth,h:r.labelHeight},
     ...r.points.map(p=>({x:p.x-9,y:p.y-9,w:18,h:18}))]),
 ];
 if(!rects.length)return boardBounds([]);
 const x=Math.min(...rects.map(r=>r.x))-30,y=Math.min(...rects.map(r=>r.y))-30;
 return {x,y,width:Math.max(...rects.map(r=>r.x+r.w))-x+30,height:Math.max(...rects.map(r=>r.y+r.h))-y+30};
}
const lineInk={mint:"#226653",slate:"#465d77",blue:"#325e98",rose:"#9c4650",amber:"#845724",violet:"#695186"};
const statement={reported:"원문 진술",denied:"부인 진술",uncertain:"전언·불확실",planned:"예정·가정"};
const toolItems:Array<{id:Tool;label:string;Icon:typeof Hand;key:string}>=[
 {id:"select",label:"선택",Icon:MousePointer2,key:"V"},{id:"hand",label:"화면 이동",Icon:Hand,key:"H"},{id:"person",label:"인물 추가",Icon:UserRound,key:"P"},{id:"note",label:"설명 카드",Icon:StickyNote,key:"T"},{id:"connect",label:"연결선",Icon:Link2,key:"C"},{id:"group",label:"묶음 영역",Icon:Group,key:"G"}
];
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function RelationshipCanvas({graph,caseId,onSelect,onAccept,syncError,busy,imageEvidence=[],transport,mediaUrl,legalHref,browseFirst=false,mobile=false}:{graph:RelationshipMap;caseId:string;onSelect:(id:string)=>void;onAccept:(evidenceId:string,candidateId:string)=>void;syncError:string;busy:boolean;transport?:(url:string,init?:RequestInit)=>Promise<Response>;mediaUrl?:(id:string)=>string|undefined;legalHref?:string;browseFirst?:boolean;mobile?:boolean;imageEvidence?:Array<{id:string;name:string}>}){
 const [stored,setDocument]=useState<DiagramDocument>(emptyDiagram),[revision,setRevision]=useState(0),[saved,setSaved]=useState(""),[loaded,setLoaded]=useState(false),[readOnly,setReadOnly]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[remote,setRemote]=useState(false),[tool,setTool]=useState<Tool>("select"),[selection,setSelection]=useState<Selection>(null),[camera,setCamera]=useState<Camera>({x:0,y:0,scale:1}),[size,setSize]=useState({width:800,height:620}),[fullscreen,setFullscreen]=useState(false),[grid,setGrid]=useState(true),[connectFrom,setConnectFrom]=useState<string|null>(null),[marquee,setMarquee]=useState<{a:Point;b:Point}|null>(null),[guides,setGuides]=useState<{x?:number;y?:number}>({}),[historyTick,setHistoryTick]=useState(0);
 // Only an edit materializes the initial structural drawing.
 const document = useMemo(() => {
   const pristine = !stored.groups.length && !stored.manualNodes.length && !stored.manualEdges.length &&
     !Object.keys(stored.nodes).length && !Object.keys(stored.edges).length;
   return pristine && graph.nodes.length ? arrangeDiagram(graph, stored) : stored;
 }, [stored, graph]);
 const storeRef = useRef(stored), gestureStart = useRef(stored);
 storeRef.current = stored;
 const stage=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null),world=useRef<SVGGElement>(null),docRef=useRef(document),savedRef=useRef(saved),revisionRef=useRef(revision),loadedRef=useRef(false),gesture=useRef<Gesture|null>(null),pointers=useRef(new Map<number,Point>()),history=useRef<{past:DiagramDocument[];future:DiagramDocument[]}>({past:[],future:[]}),fitted=useRef(false),saveRef=useRef(false),editor=useRef<HTMLElement>(null);
 docRef.current=document;savedRef.current=saved;revisionRef.current=revision;
 const dirty=loaded&&JSON.stringify(stored)!==saved;
 const board = useMemo(() => composeBoard(graph, document), [graph, document]);
 const routes = useMemo(() => boardRoutes(board.nodes,board.edges,document), [board,document]);
 const routeById = useMemo(() => new Map(routes.map(route=>[route.id,route])), [routes]);
 const gestureBoard=useRef(board), gestureRoutes=useRef(routeById);
 const bounds = useMemo(() => drawingBounds(board.nodes,document.groups,routes), [board,document,routes]);
 const selectedNode=selection?.kind==="node"&&selection.ids.length===1?board.nodes.find(n=>n.id===selection.ids[0]):null,selectedEdge=selection?.kind==="edge"?board.edges.find(e=>e.id===selection.ids[0]):null,selectedGroup=selection?.kind==="group"?document.groups.find(g=>g.id===selection.ids[0]):null;
 const transportRef=useRef(transport);transportRef.current=transport;
 const request=(url:string,init?:RequestInit)=>transportRef.current?transportRef.current(url,init):fetch(url,init);
 const sourceUrl=(id:string)=>mediaUrl?mediaUrl(id):"/api/cases/"+caseId+"/evidence/"+id+"?preview=1";
 const [browsing,setBrowsing]=useState(browseFirst);
 const editable=loaded&&!readOnly&&!browsing;
 const displayedEdge=selectedEdge??(browsing&&!selection?(board.edges.find(edge=>edge.kind==="payment")??board.edges[0]):null);
 const nodeNames=useMemo(()=>new Map(board.nodes.map(node=>[node.id,node.label])),[board]);
 const actionIds=useMemo(()=>new Set(graph.nodes.filter(node=>node.kind==="action").map(node=>node.id)),[graph]);
 const displayName=(id:string)=>nodeNames.get(id)??"";
 // A statement can be the destination itself when no recipient was named.
 function participants(edge:BoardEdge) {
   if(actionIds.has(edge.target)&&displayName(edge.target)===edge.label) return displayName(edge.source);
   return displayName(edge.source)+(edge.directed?" → ":" — ")+displayName(edge.target);
 }
 function edgeTitle(edge:BoardEdge) {return participants(edge)+" · "+edge.label;}
 function raw(next:DiagramDocument){docRef.current=next;storeRef.current=next;setDocument(next);}
 function remember(previous:DiagramDocument){history.current.past=[...history.current.past.slice(-39),clone(previous)];history.current.future=[];setHistoryTick(v=>v+1);}
 function apply(next:DiagramDocument){if(!editable||JSON.stringify(next)===JSON.stringify(docRef.current))return;remember(storeRef.current);raw(next);setError("");}
 function undo(){if(!editable)return;const previous=history.current.past.pop();if(!previous)return;history.current.future.push(clone(storeRef.current));raw(previous);setSelection(null);setConnectFrom(null);setHistoryTick(v=>v+1);}
 function redo(){if(!editable)return;const next=history.current.future.pop();if(!next)return;history.current.past.push(clone(storeRef.current));raw(next);setSelection(null);setConnectFrom(null);setHistoryTick(v=>v+1);}
 function install(snapshot:DiagramSnapshot,keepUndo=false){if(keepUndo)remember(storeRef.current);else history.current={past:[],future:[]};raw(snapshot.document);revisionRef.current=snapshot.revision;setRevision(snapshot.revision);const json=JSON.stringify(snapshot.document);savedRef.current=json;setSaved(json);loadedRef.current=true;setLoaded(true);setRemote(false);setHistoryTick(v=>v+1);}
 useEffect(()=>{let stopped=false,timer:ReturnType<typeof setTimeout>;const controller=new AbortController();
 async function poll(){try{if(!globalThis.document.hidden){const r=await request("/api/cases/"+caseId+"/diagram",{signal:controller.signal,cache:"no-store"}),d=await r.json();if(!r.ok)throw Error(d.error||"관계도를 불러오지 못했습니다.");if(stopped)return;setReadOnly(d.isLocked);if(!saveRef.current&&!gesture.current){if(!loadedRef.current)install(d);else if(d.revision>revisionRef.current){if(JSON.stringify(storeRef.current)===savedRef.current)install(d);else setRemote(true);}}}}catch(e){if(!stopped)setError(e instanceof Error?e.message:"연결 확인 실패");}finally{if(!stopped)timer=setTimeout(poll,5000);}}
 void poll();return()=>{stopped=true;controller.abort();clearTimeout(timer);};},[caseId]);
 useEffect(()=>{if(!stage.current)return;const observer=new ResizeObserver(entries=>{const r=entries[0].contentRect;setSize({width:r.width,height:r.height});});observer.observe(stage.current);return()=>observer.disconnect();},[]);
 function fit(box=bounds){const bounds=box,width=stage.current?.clientWidth||size.width,height=stage.current?.clientHeight||size.height,padding=width<500?20:48,scale=clamp(Math.min((width-padding)/bounds.width,(height-padding)/bounds.height),.005,1.4);setCamera({scale,x:width/2-(bounds.x+bounds.width/2)*scale,y:height/2-(bounds.y+bounds.height/2)*scale});fitted.current=true;}
 const phoneEdgeId=mobile&&browsing?displayedEdge?.id:undefined;
 useEffect(()=>{
   if(!loaded || !(fullscreen||browsing))return;
   const edge=phoneEdgeId&&board.edges.find(e=>e.id===phoneEdgeId);
   const route=edge&&routeById.get(edge.id);
   if(edge&&route) {
     const ends=board.nodes.filter(n=>n.id===edge.source||n.id===edge.target);
     fit(drawingBounds(ends,[],[route]));
   } else fit();
 },[loaded,fullscreen,browsing,size.width,size.height,phoneEdgeId]);
 useEffect(()=>{if(loaded&&!fitted.current&&(board.nodes.length||document.groups.length))fit();},[loaded,board.nodes.length,size.width]);
 useEffect(()=>{if(!fullscreen)return;const previous=globalThis.document.body.style.overflow;globalThis.document.body.style.overflow="hidden";return()=>{globalThis.document.body.style.overflow=previous;};},[fullscreen]);
 useEffect(()=>{if(!dirty)return;const unload=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};const navigate=(e:MouseEvent)=>{const link=(e.target as Element).closest?.("a[href]");if(link instanceof HTMLAnchorElement&&link.target!=="_blank"&&new URL(link.href).pathname!==location.pathname){e.preventDefault();e.stopPropagation();setNotice("이동하기 전에 관계도를 저장해 주세요. 변경을 취소하려면 저장된 버전 불러오기를 선택하세요.");}};window.addEventListener("beforeunload",unload);globalThis.document.addEventListener("click",navigate,true);return()=>{window.removeEventListener("beforeunload",unload);globalThis.document.removeEventListener("click",navigate,true);};},[dirty]);
 function zoom(factor:number,anchor?:Point){setCamera(c=>{const p=anchor??{x:size.width/2,y:size.height/2},scale=clamp(c.scale*factor,.005,2.5);return {scale,x:p.x-(p.x-c.x)/c.scale*scale,y:p.y-(p.y-c.y)/c.scale*scale};});}
 useEffect(()=>{const element=stage.current;if(!element)return;const wheel=(e:WheelEvent)=>{e.preventDefault();if(e.ctrlKey||e.metaKey){const r=element.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.006),{x:e.clientX-r.left,y:e.clientY-r.top});}else setCamera(c=>({...c,x:c.x-e.deltaX,y:c.y-e.deltaY}));};element.addEventListener("wheel",wheel,{passive:false});return()=>element.removeEventListener("wheel",wheel);},[size.width,size.height]);
 async function save(){if(!editable||saveRef.current||!dirty)return;setSaving(true);saveRef.current=true;setError("");const submitted=clone(docRef.current);try{const r=await request("/api/cases/"+caseId+"/diagram",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({revision:revisionRef.current,document:submitted})}),d=await r.json();if(!r.ok){if(r.status===409)setRemote(true);throw Error(d.error||"저장하지 못했습니다.");}revisionRef.current=d.revision;setRevision(d.revision);const json=JSON.stringify(submitted);savedRef.current=json;setSaved(json);setNotice("관계도를 저장했어요.");setRemote(false);}catch(e){setError(e instanceof Error?e.message:"저장 실패");}finally{setSaving(false);saveRef.current=false;}}
 async function reload(){try{const r=await request("/api/cases/"+caseId+"/diagram",{cache:"no-store"}),d=await r.json();if(!r.ok)throw Error(d.error);install(d,true);setReadOnly(d.isLocked);setError("");setNotice("저장된 버전을 불러왔어요. 이전 편집은 실행 취소로 다시 꺼낼 수 있어요.");}catch(e){setError(e instanceof Error?e.message:"불러오기 실패");}}
 function worldPoint(client:Point):Point{const matrix=world.current?.getScreenCTM();if(!matrix)return client;const p=new DOMPoint(client.x,client.y).matrixTransform(matrix.inverse());return {x:p.x,y:p.y};}
 function patchNode(id:string,patch:Partial<DiagramDocument["nodes"][string]>){const n=board.nodes.find(n=>n.id===id);if(!n)return;const next=clone(docRef.current);next.nodes[id]={x:n.x,y:n.y,...next.nodes[id],...patch};apply(next);}
 function patchEdge(id:string,patch:Partial<DiagramDocument["edges"][string]>){const next=clone(docRef.current);next.edges[id]={...next.edges[id],...patch};apply(next);}
 function patchGroup(id:string,key:"x"|"y"|"width"|"height",value:number){const next=clone(docRef.current),g=next.groups.find(g=>g.id===id);if(!g)return;const previous=g[key];g[key]=key==="width"?clamp(value,180,10000):key==="height"?clamp(value,150,10000):clamp(value,-19000,19000);if(key==="x"||key==="y")for(const n of Object.values(next.nodes))if(n.groupId===id)n[key]=clamp(n[key]+g[key]-previous,-19000,19000);apply(next);}
 function addNode(kind:"person"|"note",p:Point){const next=clone(docRef.current),id="manual:"+crypto.randomUUID();if(next.manualNodes.length>=60){setError("직접 추가하는 요소는 60개까지 사용할 수 있어요.");return;}next.manualNodes.push({id,label:kind==="person"?"새 인물":"설명 카드",kind});next.nodes[id]={x:snap(p.x),y:snap(p.y),subtitle:kind==="note"?"내용을 입력하세요.":"",color:kind==="note"?"amber":"mint"};apply(next);setSelection({kind:"node",ids:[id]});setTool("select");}
 function connect(id:string){if(!connectFrom){setConnectFrom(id);setSelection({kind:"node",ids:[id]});return;}if(connectFrom===id){setConnectFrom(null);return;}const next=clone(docRef.current),edgeId="manual:"+crypto.randomUUID();if(next.manualEdges.length>=120){setError("직접 연결하는 선은 120개까지 사용할 수 있어요.");return;}next.manualEdges.push({id:edgeId,source:connectFrom,target:id,label:"관계 입력",directed:true});apply(next);setSelection({kind:"edge",ids:[edgeId]});setConnectFrom(null);setTool("select");}
 function removeSelection(){if(!selection||!editable)return;const next=clone(docRef.current);for(const id of selection.ids){if(selection.kind==="node"){if(next.manualNodes.some(n=>n.id===id)){next.manualNodes=next.manualNodes.filter(n=>n.id!==id);next.manualEdges=next.manualEdges.filter(e=>e.source!==id&&e.target!==id);delete next.nodes[id];}else{const n=board.nodes.find(n=>n.id===id);if(n)next.nodes[id]={x:n.x,y:n.y,...next.nodes[id],hidden:true};}}else if(selection.kind==="edge"){if(next.manualEdges.some(e=>e.id===id)){next.manualEdges=next.manualEdges.filter(e=>e.id!==id);delete next.edges[id];}else next.edges[id]={...next.edges[id],hidden:true};}else{next.groups=next.groups.filter(g=>g.id!==id);for(const patch of Object.values(next.nodes))if(patch.groupId===id)patch.groupId=null;}}apply(next);setSelection(null);}
 function makeGroup(){if(selection?.kind!=="node"||selection.ids.length<2)return;const members=board.nodes.filter(n=>selection.ids.includes(n.id)),bounds=boardBounds(members),next=clone(docRef.current),id="group:"+crypto.randomUUID();if(next.groups.length>=30)return;next.groups.push({id,label:"관계 묶음",x:bounds.x+25,y:bounds.y+15,width:bounds.width-50,height:bounds.height-30,color:"amber"});for(const n of members)next.nodes[n.id]={x:n.x,y:n.y,...next.nodes[n.id],groupId:id};apply(next);setSelection({kind:"group",ids:[id]});}
 function align(axis:"x"|"y"){if(selection?.kind!=="node"||selection.ids.length<2)return;const members=board.nodes.filter(n=>selection.ids.includes(n.id)),target=members.reduce((sum,n)=>sum+n[axis],0)/members.length,next=clone(docRef.current);for(const n of members)next.nodes[n.id]={x:n.x,y:n.y,...next.nodes[n.id],[axis]:snap(target)};apply(next);}
 function arrange(name?:string) {
   if (!editable) return;
   let next: DiagramDocument;
   if (!name || name === "구조도") {
     next=arrangeDiagram(graph, storeRef.current);
   } else {
     next=clone(document);
     const groupIds=new Set(next.groups.map(g=>g.id));
     const membership=new Map(board.nodes.map(n=>[n.id,n.groupId&&groupIds.has(n.groupId)?n.groupId:n.id]));
     const free=board.nodes.filter(n=>membership.get(n.id)===n.id);
     const units=[...next.groups,...free].map(n=>({id:n.id}));
     const links=board.edges.map(e=>({source:membership.get(e.source)!,target:membership.get(e.target)!})).filter(e=>e.source!==e.target);
     const layout=proposeLayouts(units,links).find(candidate=>candidate.name===name);
     if (!layout) return;
     const scale=Math.max(1,...next.groups.map(g=>Math.max((g.width+90)/300,(g.height+90)/270)));
     for (const group of next.groups) {
       const at=layout.positions[group.id];
       const dx=at.x*scale-group.x-group.width/2, dy=at.y*scale-group.y-group.height/2;
       group.x+=dx;group.y+=dy;
       for (const n of board.nodes.filter(n=>n.groupId===group.id)) next.nodes[n.id]={...next.nodes[n.id],x:n.x+dx,y:n.y+dy};
     }
     for (const n of free) {
       const at=layout.positions[n.id];
       next.nodes[n.id]={...next.nodes[n.id],x:at.x*scale,y:at.y*scale};
     }
   }
   if (!diagramSchema.safeParse(next).success) {setError("현재 묶음 크기로는 이 배치를 적용할 수 없습니다.");return;}
   if (JSON.stringify(next)!==JSON.stringify(storeRef.current)) {remember(storeRef.current);raw(next);}
   const updated=composeBoard(graph,next);
   fit(drawingBounds(updated.nodes,next.groups,boardRoutes(updated.nodes,updated.edges,next)));
   setNotice((name??"구조도")+" 배치를 적용했어요.");
 }
 function startPointer(e:ReactPointerEvent<SVGSVGElement>){if(e.button!==0&&e.button!==1)return;editor.current?.focus({preventScroll:true});if(!pointers.current.size){gestureStart.current=storeRef.current;gestureBoard.current=board;gestureRoutes.current=routeById;}const client={x:e.clientX,y:e.clientY};pointers.current.set(e.pointerId,client);e.currentTarget.setPointerCapture(e.pointerId);
 if(pointers.current.size===2){if(gesture.current?.moved)remember(gestureStart.current);const [a,b]=[...pointers.current.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};gesture.current={mode:"pinch",start:worldPoint(mid),screen:mid,before:clone(docRef.current),camera,distance:Math.hypot(a.x-b.x,a.y-b.y),selection:null};return;}
 const p=worldPoint(client),target=e.target as Element,nodeId=target.closest("[data-node]")?.getAttribute("data-node"),labelId=target.closest("[data-label]")?.getAttribute("data-label"),bendId=target.closest("[data-bend]")?.getAttribute("data-bend"),groupId=target.closest("[data-group]")?.getAttribute("data-group"),resizeId=target.closest("[data-resize]")?.getAttribute("data-resize"),edgeId=target.closest("[data-edge]")?.getAttribute("data-edge");
 if(tool==="hand"||e.button===1){gesture.current={mode:"pan",start:p,screen:client,before:clone(docRef.current),camera,selection:null};return;}
 if(nodeId){if(tool==="connect"&&editable){connect(nodeId);return;}let picked:Selection={kind:"node",ids:[nodeId]};if(e.shiftKey&&selection?.kind==="node")picked={kind:"node",ids:selection.ids.includes(nodeId)?selection.ids.filter(id=>id!==nodeId):[...selection.ids,nodeId]};else if(selection?.kind==="node"&&selection.ids.includes(nodeId))picked=selection;setSelection(picked);if(editable)gesture.current={mode:"node",start:p,screen:client,before:clone(docRef.current),camera,selection:picked};return;}
 if(labelId||bendId||edgeId){const id=labelId??bendId??edgeId!;setSelection({kind:"edge",ids:[id]});if(editable&&(labelId||bendId))gesture.current={mode:bendId?"bend":"label",start:p,screen:client,before:clone(docRef.current),camera,selection:{kind:"edge",ids:[id]},id};return;}
 if(resizeId||groupId){const id=resizeId??groupId!;setSelection({kind:"group",ids:[id]});if(editable)gesture.current={mode:resizeId?"resize":"group",start:p,screen:client,before:clone(docRef.current),camera,selection:{kind:"group",ids:[id]},id};return;}
 if(editable&&(tool==="person"||tool==="note")){addNode(tool,p);return;}
 setSelection(null);if(tool==="connect"){setConnectFrom(null);return;}
 const mode=tool==="group"&&editable?"frame":e.pointerType==="touch"?"pan":"marquee";gesture.current={mode,start:p,screen:client,before:clone(docRef.current),camera,selection:null};if(mode==="marquee"||mode==="frame")setMarquee({a:p,b:p});
 }
 function movePointer(e:ReactPointerEvent<SVGSVGElement>){if(!pointers.current.has(e.pointerId))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const g=gesture.current;if(!g)return;
 if(g.mode==="pinch"){if(pointers.current.size<2)return;const [a,b]=[...pointers.current.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},r=stage.current!.getBoundingClientRect(),scale=clamp(g.camera.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,g.distance!),.005,2.5);setCamera({scale,x:mid.x-r.left-g.start.x*scale,y:mid.y-r.top-g.start.y*scale});return;}
 if(g.mode==="pan"){setCamera({...g.camera,x:g.camera.x+e.clientX-g.screen.x,y:g.camera.y+e.clientY-g.screen.y});return;}
 const p=worldPoint({x:e.clientX,y:e.clientY}),dx=p.x-g.start.x,dy=p.y-g.start.y;if(Math.hypot(e.clientX-g.screen.x,e.clientY-g.screen.y)<3&&!g.moved)return;g.moved=true;
 if(g.mode==="marquee"||g.mode==="frame"){setMarquee({a:g.start,b:p});return;}
 if(!editable)return;const next=clone(g.before),before=gestureBoard.current;let delta={x:grid&&!e.altKey?snap(dx):dx,y:grid&&!e.altKey?snap(dy):dy};setGuides({});
 if(g.mode==="node"||g.mode==="group"){const ids=g.mode==="group"?before.nodes.filter(n=>n.groupId===g.id).map(n=>n.id):g.selection?.ids??[],moving=before.nodes.filter(n=>ids.includes(n.id));
 if(moving.length===1&&!e.altKey){const n=moving[0],other=before.nodes.filter(v=>!ids.includes(v.id)),x=other.find(v=>Math.abs(v.x-n.x-dx)<8),y=other.find(v=>Math.abs(v.y-n.y-dy)<8);if(x)delta.x=x.x-n.x;if(y)delta.y=y.y-n.y;setGuides({x:x?.x,y:y?.y});}
 for(const n of moving)next.nodes[n.id]={x:n.x+delta.x,y:n.y+delta.y,...next.nodes[n.id]};for(const n of moving){next.nodes[n.id].x=clamp(n.x+delta.x,-19000,19000);next.nodes[n.id].y=clamp(n.y+delta.y,-19000,19000);}
 if(g.mode==="group"){const frame=next.groups.find(v=>v.id===g.id)!;frame.x+=delta.x;frame.y+=delta.y;}
 for(const edge of before.edges)if(ids.includes(edge.source)&&ids.includes(edge.target)){const patch=next.edges[edge.id];if(patch){if(patch.labelX!==undefined)patch.labelX+=delta.x;if(patch.labelY!==undefined)patch.labelY+=delta.y;if(patch.viaX!==undefined)patch.viaX+=delta.x;if(patch.viaY!==undefined)patch.viaY+=delta.y;}}
 }else if(g.mode==="resize"){const frame=next.groups.find(v=>v.id===g.id)!;frame.width=clamp(frame.width+delta.x,180,10000);frame.height=clamp(frame.height+delta.y,150,10000);
 }else{const route=gestureRoutes.current.get(g.id!)!;next.edges[g.id!]={...next.edges[g.id!]};if(g.mode==="label"){next.edges[g.id!].labelX=clamp(route.label.x+delta.x,-19000,19000);next.edges[g.id!].labelY=clamp(route.label.y+delta.y,-19000,19000);}else{next.edges[g.id!].viaX=clamp(route.handle.x+delta.x,-19000,19000);next.edges[g.id!].viaY=clamp(route.handle.y+delta.y,-19000,19000);}}
 raw(next);
 }
 function endPointer(e:ReactPointerEvent<SVGSVGElement>,cancelled=false){pointers.current.delete(e.pointerId);const g=gesture.current;if(!g)return;if(g.mode==="pinch"){if(pointers.current.size===1){const p=[...pointers.current.values()][0];gesture.current={...g,mode:"pan",screen:p,camera};}else gesture.current=null;return;}
 if(cancelled){if(g.moved)raw(gestureStart.current);}else if(g.mode==="marquee"&&marquee){const left=Math.min(marquee.a.x,marquee.b.x),right=Math.max(marquee.a.x,marquee.b.x),top=Math.min(marquee.a.y,marquee.b.y),bottom=Math.max(marquee.a.y,marquee.b.y);const ids=board.nodes.filter(n=>n.x>=left&&n.x<=right&&n.y>=top&&n.y<=bottom).map(n=>n.id);setSelection(ids.length?{kind:"node",ids}:null);
 }else if(g.mode==="frame"&&marquee&&g.moved&&editable){const next=clone(g.before),id="group:"+crypto.randomUUID(),x=Math.min(marquee.a.x,marquee.b.x),y=Math.min(marquee.a.y,marquee.b.y),width=Math.max(180,Math.abs(marquee.b.x-marquee.a.x)),height=Math.max(150,Math.abs(marquee.b.y-marquee.a.y));if(next.groups.length<30){next.groups.push({id,label:"관계 묶음",x,y,width,height,color:"amber"});for(const n of board.nodes.filter(n=>n.x>x&&n.x<x+width&&n.y>y&&n.y<y+height))next.nodes[n.id]={x:n.x,y:n.y,...next.nodes[n.id],groupId:id};apply(next);setSelection({kind:"group",ids:[id]});}setTool("select");
 }else if(g.moved&&!["pan","pinch"].includes(g.mode)&&JSON.stringify(docRef.current)!==JSON.stringify(g.before))remember(gestureStart.current);
 gesture.current=null;setMarquee(null);setGuides({});
 }
 function keyDown(e:ReactKeyboardEvent){const typing=(e.target as HTMLElement).closest("input,textarea,select,[contenteditable=true]");if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();void save();return;}if(typing)return;if(e.key==="Escape"){setSelection(null);setConnectFrom(null);setTool("select");if(fullscreen)setFullscreen(false);return;}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();if(e.shiftKey)redo();else undo();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="a"){e.preventDefault();setSelection({kind:"node",ids:board.nodes.map(n=>n.id)});return;}
 if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();removeSelection();return;}
 if(selection?.kind==="node"&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)&&editable){e.preventDefault();const next=clone(docRef.current),amount=e.shiftKey?20:1;for(const n of board.nodes.filter(n=>selection.ids.includes(n.id)))next.nodes[n.id]={x:n.x,y:n.y,...next.nodes[n.id],[e.key==="ArrowLeft"||e.key==="ArrowRight"?"x":"y"]:(e.key==="ArrowLeft"||e.key==="ArrowRight"?n.x:n.y)+(["ArrowLeft","ArrowUp"].includes(e.key)?-amount:amount)};apply(next);return;}
 const t=toolItems.find(t=>t.key.toLowerCase()===e.key.toLowerCase());if(t){setTool(t.id);setConnectFrom(null);}if(e.key==="0"){e.preventDefault();fit();}}
 async function exportSvg(){if(!svg.current)return;setError("");try{
   const copy=svg.current.cloneNode(true) as SVGSVGElement;
   copy.querySelectorAll("[data-editor-only]").forEach(element=>element.remove());
   copy.removeAttribute("role");copy.removeAttribute("class");
   const group=copy.querySelector("[data-world]")!;
   group.removeAttribute("transform");
   const width=Math.max(470,bounds.width);
   const titles=wrapDiagramText(document.title,Math.floor((width-52)/24),8);
   const top=bounds.y-28*titles.length-10, height=bounds.height+28*titles.length+48;
   copy.setAttribute("viewBox",[bounds.x,top,width,height].join(" "));
   copy.setAttribute("width",String(width));copy.setAttribute("height",String(height));
   const ns="http://www.w3.org/2000/svg";
   const paper=globalThis.document.createElementNS(ns,"rect");paper.setAttribute("x",String(bounds.x));paper.setAttribute("y",String(top));paper.setAttribute("width",String(width));paper.setAttribute("height",String(height));paper.setAttribute("fill","#fff");group.prepend(paper);
   const heading=globalThis.document.createElementNS(ns,"title");heading.textContent=document.title;copy.prepend(heading);
   function caption(text:string,y:number,size:number,weight:string,color:string){
     const line=globalThis.document.createElementNS(ns,"text");line.setAttribute("x",String(bounds.x+24));line.setAttribute("y",String(y));line.setAttribute("font-size",String(size));line.setAttribute("font-weight",weight);line.setAttribute("fill",color);line.textContent=text;group.append(line);
   }
   titles.forEach((line,i)=>caption(line,top+30+28*i,24,"700","#182435"));
   caption("관계도를 해석할 때는 연결된 원문과 진술 방식을 함께 확인하세요.",top+height-16,12,"400","#475569");
 let imageBytes=0;for(const image of Array.from(copy.querySelectorAll("image"))){const href=image.getAttribute("href");if(!href||(!href.startsWith("blob:")&&!href.startsWith("/api/cases/"+caseId+"/evidence/")))continue;const r=href.startsWith("blob:")?await fetch(href):await request(href);if(!r.ok)throw Error("사진 원본을 읽지 못했습니다.");const data=new Uint8Array(await r.arrayBuffer());imageBytes+=data.length;if(imageBytes>30*1024*1024)throw Error("사진을 포함한 SVG는 총 30MB까지 내보낼 수 있어요.");let binary="";for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));image.setAttribute("href","data:"+r.headers.get("content-type")+";base64,"+btoa(binary));}
 download(new Blob([new XMLSerializer().serializeToString(copy)],{type:"image/svg+xml;charset=utf-8"}),(document.title||"관계도")+".svg");setNotice("요소를 편집할 수 있는 SVG로 저장했어요.");}catch(e){setError(e instanceof Error?e.message:"내보내기 실패");}}
 const toolHint=readOnly?"잠긴 사건 · 관계도 읽기 전용":tool==="connect"?(connectFrom?"도착할 인물을 선택하세요.":"출발할 인물 → 도착할 인물을 선택하세요."):tool==="group"?"배경을 드래그해 묶음 영역을 그려 주세요.":tool==="person"||tool==="note"?"캔버스를 눌러 추가하세요.":"끌어서 배치하세요.";
 const colorControls=(value:string,onChange:(value:string)=>void)=><div className="diagram-swatches" aria-label="색상">{diagramColors.map(c=><button type="button" key={c} title={c} aria-label={c+" 색상"} aria-pressed={value===c} disabled={!editable} style={{background:boardPalette[c].fill,borderColor:boardPalette[c].stroke}} onClick={()=>onChange(c)}/>)}</div>;
 return <section ref={editor} tabIndex={-1} onKeyDown={keyDown} className={"diagram-editor"+(browsing?" is-reading":"")+(fullscreen?" is-fullscreen":"")} aria-label="관계도 편집기" data-history={historyTick}>
 <header className="diagram-header"><div className="min-w-0">{browsing?<h2>{document.title}</h2>:<input aria-label="관계도 제목" value={document.title} disabled={!editable} maxLength={120} onChange={e=>{const next=clone(document);next.title=e.target.value||"사건 관계도";apply(next);}}/>}<span className="diagram-save-status" role="status">{!loaded?"불러오는 중":saving?"저장 중":dirty?"저장하지 않은 변경":revision?"저장됨 · v"+revision:"새 관계도"}{syncError?" · 연결 확인 중":""}</span></div><div className="diagram-header-actions">{browseFirst&&<button className="diagram-mode" disabled={!loaded||dirty} title={dirty?"편집을 저장하면 관계를 읽을 수 있어요.":undefined} onClick={()=>{setBrowsing(!browsing);setTool("select");setSelection(null);}}>{browsing?"관계도 편집":"읽기 화면"}</button>}<button type="button" onClick={()=>void exportSvg()} disabled={!loaded} title="편집 가능한 SVG 저장" aria-label="SVG 내보내기"><Download size={17}/><span>SVG</span></button><button type="button" onClick={()=>setFullscreen(v=>!v)} title="넓게 편집" aria-label={fullscreen?"전체 화면 닫기":"전체 화면 편집"}>{fullscreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button><Button onClick={()=>void save()} disabled={!editable||!dirty||saving}><Save size={16}/><span>저장</span></Button></div></header>
 <div className="diagram-toolbar" aria-label="관계도 도구"><div className="diagram-toolset">{toolItems.map(({id,label,Icon,key})=><button type="button" key={id} aria-label={label} title={label+" ("+key+")"} aria-pressed={tool===id} disabled={!loaded||(!editable&&!["select","hand"].includes(id))} onClick={()=>{setTool(id);setConnectFrom(null);}}><Icon size={19}/><span>{label}</span></button>)}</div><div className="diagram-toolset"><button type="button" aria-label="실행 취소" title="실행 취소 (Ctrl+Z)" disabled={!editable||!history.current.past.length} onClick={undo}><Undo2 size={18}/></button><button type="button" aria-label="다시 실행" title="다시 실행 (Ctrl+Shift+Z)" disabled={!editable||!history.current.future.length} onClick={redo}><Redo2 size={18}/></button><button type="button" className="diagram-ai" disabled={!editable||!board.nodes.length} onClick={()=>arrange()}><Sparkles size={16}/><span>AI 정렬</span></button></div></div>
 {(error||remote)&&<div className="diagram-banner" role="alert"><span>{error||(remote?"다른 화면에서 새 버전을 저장했어요. 현재 편집은 보존하고 있습니다.":"")}</span><button type="button" onClick={()=>void reload()}>저장된 버전 불러오기</button></div>}
 {notice&&<div className="diagram-banner is-notice" role="status"><span>{notice}</span><button type="button" aria-label="알림 닫기" onClick={()=>setNotice("")}><X size={14}/></button></div>}
 <div className="diagram-body"><div className="diagram-stage-wrap"><div className="diagram-stage" ref={stage}>
 <svg ref={svg} width="100%" height="100%" viewBox={"0 0 "+size.width+" "+size.height} aria-label="관계도 캔버스" className={"tool-"+tool} onPointerDown={startPointer} onPointerMove={movePointer} onPointerUp={e=>endPointer(e)} onPointerCancel={e=>endPointer(e,true)} onContextMenu={e=>e.preventDefault()} role="application">
 <defs>
   {diagramColors.map(c=><marker key={c} id={"arrow-"+c+"-"+caseId} viewBox="0 0 16 16" markerUnits="userSpaceOnUse" markerWidth="17" markerHeight="17" refX="15" refY="8" orient="auto">
     <path d="M1 1 L15 8 L1 15 L4.5 8 Z" fill={lineInk[c]}/>
   </marker>)}
   <pattern id={"dots-"+caseId} width={20*camera.scale} height={20*camera.scale} patternUnits="userSpaceOnUse" x={camera.x} y={camera.y}><circle cx="1" cy="1" r=".7" fill="#c9d2df"/></pattern>
 </defs>
 <rect data-editor-only="grid" width="100%" height="100%" fill={!browsing&&grid?"url(#dots-"+caseId+")":"#ffffff"}/>
 <g ref={world} data-world="" transform={"translate("+camera.x+","+camera.y+") scale("+camera.scale+")"} fontFamily="Pretendard, 'Malgun Gothic', sans-serif">
 {document.groups.map(group=>{
   const ink=lineInk[group.color], active=selection?.kind==="group"&&selection.ids[0]===group.id;
   return <g key={group.id} data-group={group.id}>
     <rect x={group.x} y={group.y} width={group.width} height={group.height} rx="14" fill={boardPalette[group.color].fill} fillOpacity=".64" stroke={ink} strokeOpacity=".28" strokeWidth="1.6"/>
     <path d={`M${group.x+16},${group.y+48}h${group.width-32}`} fill="none" stroke={ink} strokeOpacity=".18"/>
     <Layers x={group.x+18} y={group.y+13} width={21} height={21} stroke={ink} strokeWidth={2.2}/>
     <text x={group.x+49} y={group.y+32} fill={ink} fontSize="20" fontWeight="750">
       {wrapDiagramText(group.label,Math.max(4,Math.floor((group.width-64)/20)),1)[0]}
     </text>
     {active&&editable&&<g data-editor-only=""><rect x={group.x} y={group.y} width={group.width} height={group.height} rx="14" fill="none" stroke="#195bb6" strokeWidth="2"/><rect data-resize={group.id} x={group.x+group.width-9} y={group.y+group.height-9} width="18" height="18" fill="#fff" stroke="#195bb6" strokeWidth="2" rx="3" style={{cursor:"nwse-resize"}}/></g>}
   </g>;
 })}
 {board.edges.map(edge=>{
   const r=routeById.get(edge.id)!, selected=displayedEdge?.id===edge.id, ink=lineInk[edge.color as keyof typeof lineInk];
   return <g key={edge.id} data-edge={edge.id} style={{cursor:"pointer"}}>
     <title>{edgeTitle(edge)}</title>
     <path d={r.path} fill="none" stroke="transparent" strokeWidth="20" data-editor-only=""/>
     {selected&&<path data-editor-only="" d={r.path} fill="none" stroke={ink} strokeOpacity=".14" strokeWidth="10" strokeLinejoin="round"/>}
     <path d={r.path} fill="none" stroke={ink} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
       strokeDasharray={edge.dashed?"9 6":undefined} markerEnd={edge.directed?"url(#arrow-"+edge.color+"-"+caseId+")":undefined}/>
     {selected&&editable&&edge.route==="elbow"&&<circle data-editor-only="" data-bend={edge.id} cx={r.handle.x} cy={r.handle.y} r="10" fill="#fff" stroke="#195bb6" strokeWidth="2" style={{cursor:"move"}}/>}
   </g>;
 })}
 <g aria-hidden="true" pointerEvents="none" strokeWidth="1.3" strokeOpacity=".55">
   {board.edges.map(edge=>{
     const r=routeById.get(edge.id)!;
     return <line key={edge.id} x1={r.anchor.x} y1={r.anchor.y} x2={r.label.x} y2={r.label.y} stroke={lineInk[edge.color as keyof typeof lineInk]}/>;
   })}
 </g>
 {board.nodes.map((node,index)=>{
   const group=document.groups.find(g=>g.id===node.groupId);
   const color=document.nodes[node.id]?.color??group?.color??node.color;
   const ink=lineInk[color as keyof typeof lineInk], fill=boardPalette[color as keyof typeof boardPalette].fill;
   const picked=selection?.kind==="node"&&selection.ids.includes(node.id);
   const portrait=node.portraitEvidenceId?sourceUrl(node.portraitEvidenceId):null;
   const clipId="portrait-"+caseId+"-"+index, Icon=node.kind==="person"?UserRound:node.kind==="organization"?Building2:FileText;
   const names=wrapDiagramText(node.label,7,2), info=wrapDiagramText(node.subtitle,11,names.length>1?1:2).filter(Boolean);
   const first=names.length>1?12:23, caption=first+(names.length-1)*23+22;
   return <g key={node.id} data-node={node.id} transform={"translate("+node.x+","+node.y+")"} className="diagram-node" style={{cursor:tool==="connect"?"crosshair":editable?"grab":"pointer"}}>
     <title>{[node.label,node.subtitle,group?.label].filter(Boolean).join(" · ")}</title>
     <rect x="-90" y="-66" width="180" height="152" rx={node.kind==="note"?8:14} fill="#ffffff" stroke={ink} strokeWidth="1.7"/>
     {node.kind==="person"?<circle cy="-30" r="26" fill={fill} stroke={ink} strokeWidth="1.5"/>:
       <rect x="-24" y="-54" width="48" height="48" rx={node.kind==="organization"?10:6} fill={fill}/>}
     {portrait&&node.kind==="person"?<>
       <clipPath id={clipId}><circle cy="-30" r="24.8"/></clipPath>
       <image href={portrait} x="-25" y="-55" width="50" height="50" preserveAspectRatio="xMidYMid slice" clipPath={"url(#"+clipId+")"}/>
     </>:<Icon x={-17} y={-47} width={34} height={34} stroke={ink} strokeWidth={1.9}/>}
     {names.map((line,i)=><text key={i} textAnchor="middle" y={first+i*23} fill="#182435" fontSize="23" fontWeight="750">{line}</text>)}
     {info.map((line,i)=><text key={i} textAnchor="middle" y={caption+i*17} fill="#475569" fontSize="14">{line}</text>)}
     {(picked||connectFrom===node.id)&&<rect data-editor-only="" pointerEvents="none" x="-94" y="-70" width="188" height="160" rx="17" fill="none" stroke="#195bb6" strokeWidth="2.5" strokeDasharray="7 4"/>}
   </g>;
 })}
 {board.edges.map(edge=>{
   const r=routeById.get(edge.id)!, ink=lineInk[edge.color as keyof typeof lineInk], selected=displayedEdge?.id===edge.id;
   const qualifier=edge.manual?"직접 작성":edge.polarity!=="reported"?statement[edge.polarity]:"";
   const top=r.label.y-r.labelHeight/2, textX=r.label.x, textY=top+22;
   return <g key={"label-"+edge.id} data-label={edge.id} style={{cursor:editable?"grab":"pointer"}}>
     <title>{[edge.label,edge.detail,qualifier].filter(Boolean).join(" · ")}</title>
     <rect x={textX-r.labelWidth/2} y={top} width={r.labelWidth} height={r.labelHeight} rx="7" fill="#ffffff" stroke={ink} strokeOpacity=".42" strokeWidth="1.3"/>
     {selected&&<rect data-editor-only="" x={textX-r.labelWidth/2} y={top} width={r.labelWidth} height={r.labelHeight} rx="7" fill="none" stroke={ink} strokeWidth="2.4"/>}
     {r.labelLines.map((line,i)=><text key={i} x={textX} y={textY+i*22} textAnchor="middle" fill="#1f2937" fontSize="18" fontWeight="700">{line}</text>)}
     {r.detailLine&&<text x={textX} y={top+14+r.labelLines.length*22+6} textAnchor="middle" fill={ink} fontSize="14" fontWeight="650">{r.detailLine}</text>}
     {qualifier&&<text x={textX} y={top+r.labelHeight-6} textAnchor="middle" fill="#475569" fontSize="13">{qualifier}</text>}
   </g>;
 })}
 {(guides.x!==undefined||guides.y!==undefined)&&<g data-editor-only="" pointerEvents="none" stroke="#59aa91" strokeWidth="1" strokeDasharray="4 4">{guides.x!==undefined&&<line x1={guides.x} x2={guides.x} y1="-20000" y2="20000"/>}{guides.y!==undefined&&<line x1="-20000" x2="20000" y1={guides.y} y2={guides.y}/>}</g>}
 {marquee&&<rect data-editor-only="" x={Math.min(marquee.a.x,marquee.b.x)} y={Math.min(marquee.a.y,marquee.b.y)} width={Math.abs(marquee.a.x-marquee.b.x)} height={Math.abs(marquee.a.y-marquee.b.y)} fill="#cce9df" fillOpacity=".4" stroke="#2d8c74" strokeDasharray="5 4"/>}
 </g></svg>
 {!board.nodes.length&&!document.groups.length&&<div className="diagram-empty"><Network size={35}/><h3>사람과 사건을 한눈에</h3><p>자료에서 추출한 관계가 여기에 나타나요.<br/>인물과 설명 카드를 직접 추가할 수도 있어요.</p>{editable&&<button type="button" onClick={()=>addNode("person",worldPoint({x:stage.current!.getBoundingClientRect().left+size.width/2,y:stage.current!.getBoundingClientRect().top+size.height/2}))}>첫 인물 추가</button>}</div>}
<div className="diagram-camera" aria-label="확대와 이동"><button type="button" aria-label="축소" onClick={()=>zoom(1/1.2)}><ZoomOut size={17}/></button><span>{Math.round(camera.scale*100)}%</span><button type="button" aria-label="확대" onClick={()=>zoom(1.2)}><ZoomIn size={17}/></button><button type="button" className={mobile&&browsing?"diagram-overview":undefined} aria-label={mobile&&browsing?"전체 보기":"전체 맞춤"} title="전체 맞춤 (0)" onClick={()=>fit()}><Focus size={17}/>{mobile&&browsing&&"전체 보기"}</button>{!browsing&&<button type="button" aria-label="격자 맞춤" aria-pressed={grid} onClick={()=>setGrid(v=>!v)}><Grid2X2 size={16}/></button>}</div>
 </div><footer className="diagram-stage-footer"><span>{toolHint}</span><span>{board.nodes.length} 요소 · {board.edges.length} 연결</span></footer></div>
 {browsing?<aside className="relation-reader" aria-label="관계 원문">
   <label>연결 살펴보기<select aria-label="확인할 연결" value={displayedEdge?.id??""} onChange={e=>setSelection({kind:"edge",ids:[e.target.value]})}>
     <option value="" disabled>연결을 선택하세요</option>
     {board.edges.map(edge=><option key={edge.id} value={edge.id}>{edgeTitle(edge)}</option>)}
   </select></label>
   {displayedEdge?<div aria-live="polite">
     <p className="relation-kind">{displayedEdge.manual?"직접 작성":statement[displayedEdge.polarity]}</p>
     <h3>{participants(displayedEdge)}</h3>
     <p className="relation-summary"><strong>{displayedEdge.label}</strong>{displayedEdge.detail&&<span>{displayedEdge.detail}</span>}</p>
     {displayedEdge.quote&&<blockquote>{displayedEdge.quote}</blockquote>}
     <div className="relation-actions">
       {displayedEdge.evidenceId&&<button onClick={()=>onSelect(displayedEdge.evidenceId!)}>근거 원문 보기 <ArrowUpRight size={15}/></button>}
       <button onClick={()=>{
         const at=routeById.get(displayedEdge.id)!.label, scale=Math.max(camera.scale,1.2);
         setCamera({scale,x:size.width/2-at.x*scale,y:size.height/2-at.y*scale});
         stage.current?.scrollIntoView({block:"nearest"});
       }}><ZoomIn size={15}/>설명 확대</button>
     </div>
   </div>:selectedNode?<div aria-live="polite">
     <h3>{selectedNode.label}</h3><p>{selectedNode.subtitle}</p>
     {board.edges.filter(edge=>edge.source===selectedNode.id||edge.target===selectedNode.id).map(edge=>
       <button key={edge.id} className="relation-neighbour" onClick={()=>setSelection({kind:"edge",ids:[edge.id]})}>
         {edgeTitle(edge)}
       </button>)}
   </div>:<p>{selectedGroup?.label} · 연결선을 선택해 원문을 확인하세요.</p>}
 </aside>:<aside className="diagram-inspector" aria-label="관계도 속성"><div className="diagram-inspector-title"><h3>{selectedNode?"요소 편집":selectedEdge?"연결 편집":selectedGroup?"묶음 편집":selection?.ids.length?"선택한 요소":"구성 요소"}</h3>{selection&&<button type="button" aria-label="선택 해제" onClick={()=>setSelection(null)}><X size={16}/></button>}</div>
 {selectedNode?<div className="diagram-fields"><Field label="표시 이름"><Input aria-label="표시 이름" value={selectedNode.label} maxLength={80} disabled={!editable} onChange={e=>patchNode(selectedNode.id,{label:e.target.value})}/></Field><Field label="설명"><Textarea aria-label="요소 설명" value={selectedNode.subtitle} maxLength={240} disabled={!editable} onChange={e=>patchNode(selectedNode.id,{subtitle:e.target.value})}/></Field><Field label="모양"><select value={selectedNode.kind} disabled={!editable} onChange={e=>patchNode(selectedNode.id,{shape:e.target.value as BoardNode["kind"]})}><option value="person">인물 카드</option><option value="organization">기관 카드</option><option value="note">설명 카드</option></select></Field>{colorControls(selectedNode.color,color=>patchNode(selectedNode.id,{color:color as DiagramDocument["nodes"][string]["color"]}))}
 {selectedNode.kind==="person"&&<Field label="인물 사진"><select value={selectedNode.portraitEvidenceId??""} disabled={!editable} onChange={e=>patchNode(selectedNode.id,{portraitEvidenceId:e.target.value||null})}><option value="">기본 실루엣</option>{imageEvidence.map(image=><option key={image.id} value={image.id}>{image.name}</option>)}</select></Field>}
 <Field label="소속 묶음"><select aria-label="소속 묶음" value={selectedNode.groupId??""} disabled={!editable} onChange={e=>patchNode(selectedNode.id,{groupId:e.target.value||null})}><option value="">묶음 없음</option>{document.groups.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></Field>
 <div className="diagram-position">{(["x","y"] as const).map(axis=><Field key={axis} label={axis.toUpperCase()}><Input type="number" aria-label={axis.toUpperCase()+" 좌표"} value={Math.round(selectedNode[axis])} min={-19000} max={19000} disabled={!editable} onChange={e=>patchNode(selectedNode.id,{[axis]:clamp(Number(e.target.value),-19000,19000)})}/></Field>)}</div><p className="diagram-note">{selectedNode.manual?"직접 추가한 설명 요소입니다. 사실 확인과 구분해 주세요.":"원문 이름: "+selectedNode.originalLabel+". 표시 이름을 바꿔도 원본 사실은 유지됩니다."}</p></div>
 :selectedEdge?<div className="diagram-fields"><p className="diagram-connection-names">{board.nodes.find(n=>n.id===selectedEdge.source)?.label} → {board.nodes.find(n=>n.id===selectedEdge.target)?.label}</p><Field label="행위·관계"><Input aria-label="행위·관계" value={selectedEdge.label} maxLength={120} disabled={!editable} onChange={e=>patchEdge(selectedEdge.id,{label:e.target.value})}/></Field><Field label="금액·부연 설명"><Input aria-label="금액·부연 설명" value={selectedEdge.detail} maxLength={160} disabled={!editable} onChange={e=>patchEdge(selectedEdge.id,{detail:e.target.value})}/></Field>{colorControls(selectedEdge.color,color=>patchEdge(selectedEdge.id,{color:color as DiagramDocument["edges"][string]["color"]}))}<Field label="연결선 모양"><select value={selectedEdge.route} disabled={!editable} onChange={e=>patchEdge(selectedEdge.id,{route:e.target.value as "elbow"|"straight"})}><option value="elbow">꺾은선</option><option value="straight">직선</option></select></Field><label className="diagram-check"><input type="checkbox" checked={selectedEdge.dashed} disabled={!editable} onChange={e=>patchEdge(selectedEdge.id,{dashed:e.target.checked})}/>점선으로 표시</label>
 <details className="diagram-options"><summary>라벨·꺾임 위치</summary><div className="diagram-position">{(["labelX","labelY","viaX","viaY"] as const).filter(key=>selectedEdge.route==="elbow"||!key.startsWith("via")).map(key=>{const route=routeById.get(selectedEdge.id)!,value=document.edges[selectedEdge.id]?.[key]??(key==="labelX"?route.label.x:key==="labelY"?route.label.y:key==="viaX"?route.handle.x:route.handle.y);return <Field key={key} label={{labelX:"라벨 X",labelY:"라벨 Y",viaX:"꺾임 X",viaY:"꺾임 Y"}[key]}><Input type="number" aria-label={key+" 좌표"} value={Math.round(value)} disabled={!editable} onChange={e=>patchEdge(selectedEdge.id,{[key]:clamp(Number(e.target.value),-19000,19000)})}/></Field>;})}</div></details><div className="diagram-source"><strong>{selectedEdge.manual?"직접 작성 · 근거 미연결":statement[selectedEdge.polarity]+" · "+(selectedEdge.confirmed?"사용자 확인":"자동 추출")}</strong>{selectedEdge.quote?<><blockquote>{selectedEdge.quote}</blockquote><p>표시 문구와 색은 원문이나 확인 상태를 변경하지 않습니다.</p></>:<p>직접 연결한 선은 원문에서 확인된 사실로 처리되지 않습니다.</p>}{selectedEdge.evidenceId&&<button type="button" onClick={()=>onSelect(selectedEdge.evidenceId!)}>근거 원본 선택 <ArrowUpRight size={13}/></button>}{selectedEdge.evidenceId&&selectedEdge.candidateId&&!selectedEdge.confirmed&&<Button disabled={busy||dirty} title={dirty?"관계도 편집을 먼저 저장해 주세요.":undefined} onClick={()=>onAccept(selectedEdge.evidenceId!,selectedEdge.candidateId!)}>원문 확인·반영</Button>}{selectedEdge.audioRange&&selectedEdge.evidenceId&&<AudioTranscript src={sourceUrl(selectedEdge.evidenceId)??""} segments={[{...selectedEdge.audioRange,text:"근거 녹음 재생"}]}/>}</div><Link href={legalHref??"/cases/"+caseId+"/legal-reference"} className="diagram-legal">법령·판례 보기 <ArrowUpRight size={14}/></Link></div>
 :selectedGroup?<div className="diagram-fields"><Field label="묶음 이름"><Input value={selectedGroup.label} aria-label="묶음 이름" maxLength={80} disabled={!editable} onChange={e=>{const next=clone(document);next.groups.find(g=>g.id===selectedGroup.id)!.label=e.target.value||"관계 묶음";apply(next);}}/></Field>{colorControls(selectedGroup.color,color=>{const next=clone(document);next.groups.find(g=>g.id===selectedGroup.id)!.color=color as typeof selectedGroup.color;apply(next);})}<details className="diagram-options"><summary>크기·위치</summary><div className="diagram-position">{(["x","y","width","height"] as const).map(key=><Field key={key} label={{x:"X",y:"Y",width:"너비",height:"높이"}[key]}><Input type="number" aria-label={"묶음 "+key} value={Math.round(selectedGroup[key])} disabled={!editable} onChange={e=>patchGroup(selectedGroup.id,key,Number(e.target.value))}/></Field>)}</div></details><p className="diagram-note">배경을 옮기면 묶음에 속한 요소가 함께 이동합니다. 오른쪽 아래 손잡이로 크기를 조절하세요.</p></div>
 :selection?.kind==="node"&&selection.ids.length>1?<div className="diagram-fields"><p>{selection.ids.length}개 요소 선택</p><Button disabled={!editable} variant="outline" onClick={makeGroup}><Group size={16}/>묶음 만들기</Button><div className="diagram-align"><button type="button" disabled={!editable} onClick={()=>align("x")}><AlignHorizontalJustifyCenter size={16}/>세로 정렬</button><button type="button" disabled={!editable} onClick={()=>align("y")}><AlignVerticalJustifyCenter size={16}/>가로 정렬</button></div></div>
 :<div className="diagram-layers"><p className="sr-only">카드와 연결선을 선택해 편집하세요. 여러 요소는 Shift+클릭 또는 배경 드래그로 선택합니다.</p>{document.groups.map(g=><button type="button" key={g.id} onClick={()=>setSelection({kind:"group",ids:[g.id]})}><Group size={14}/><span>{g.label}</span></button>)}{board.nodes.map(n=><button type="button" key={n.id} onClick={()=>setSelection({kind:"node",ids:[n.id]})}>{n.kind==="person"?<UserRound size={14}/>:<StickyNote size={14}/>}<span>{n.label}</span></button>)}{board.edges.map(e=><button type="button" key={e.id} onClick={()=>setSelection({kind:"edge",ids:[e.id]})}><Link2 size={14}/><span>{e.label}</span></button>)}</div>}
 {selection&&<button type="button" disabled={!editable} className="diagram-delete" onClick={removeSelection}><Trash2 size={15}/>{selectedGroup?"묶음 해제":selectedNode&&!selectedNode.manual||selectedEdge&&!selectedEdge.manual?"관계도에서 숨기기":"선택 요소 삭제"}</button>}
 <details className="diagram-options"><summary>정렬·버전</summary><label>배치 방식<select aria-label="배치 방식" defaultValue="" disabled={!editable} onChange={e=>{if(e.target.value)arrange(e.target.value);e.target.value="";}}><option value="">배치 선택</option>{["구조도","인물 중심","사건 흐름","균등 격자","원형 연결","두 줄 구성","가로 흐름"].map(v=><option key={v}>{v}</option>)}</select></label><button type="button" disabled={!editable||![...Object.values(document.nodes),...Object.values(document.edges)].some(p=>p.hidden)} onClick={()=>{const next=clone(document);for(const p of [...Object.values(next.nodes),...Object.values(next.edges)])delete p.hidden;apply(next);}}>숨긴 원본 요소 다시 표시</button><p>내장 학습 랭커가 겹침·교차·간격을 비교합니다. 새 자료가 들어와도 저장한 위치는 유지됩니다.</p><button type="button" onClick={()=>void reload()} disabled={!loaded}>저장된 버전 불러오기</button><p>직접 작성·표시 편집은 원본 증거나 AI의 근거 판단을 바꾸지 않습니다.</p></details>
 </aside>}</div>
 </section>;
}
