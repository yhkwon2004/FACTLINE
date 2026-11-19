"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {Mic,Check,ArrowUpRight} from "lucide-react";
import {Button,Card,Field,Input} from "./UI";
import {evidenceUpload} from "./upload-evidence";
import {phaseLabel} from "./EvidenceGraph";
import {AudioTranscript,type AudioSegment} from "./AudioTranscript";
import type {Inspection} from "../../infrastructure/ai/local-worker";
type Result={phase:string;error?:string;analysis?:Inspection;extraction?:{segments?:AudioSegment[]}};
export function DailyVoiceJournal({cases,cloudUpload}:{cases:Array<{id:string;title:string}>;cloudUpload:boolean}) {
 const router=useRouter(),[date,setDate]=useState(()=>new Date().toLocaleDateString("sv-SE")),[caseId,setCaseId]=useState(""),[source,setSource]=useState<{id:string;caseId:string;name:string;date:string}|null>(null),[result,setResult]=useState<Result|null>(null),[checked,setChecked]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState(false);
 async function json(url:string,init?:RequestInit){const r=await fetch(url,init),d=await r.json();if(!r.ok)throw new Error(d.error||"처리하지 못했습니다.");return d;}
 async function upload(file?:File){if(!file||busy)return;setBusy(true);setError("");setSaved(false);setResult(null);setSource(null);try{
 if(file.size>20*1024*1024)throw new Error("녹음은 20MB 이하로 선택해 주세요.");
 let id=caseId;const title=date+" 하루 기록";
 if(!id)id=cases.find(c=>c.title===title)?.id??(await json("/api/cases",{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({title,type:"OTHER"})})).case.id;
 const d=await evidenceUpload(id,file,cloudUpload,date);setCaseId(id);setSource({id:d.evidence.id,caseId:id,name:file.name,date});setChecked([]);
 }catch(e){setError(e instanceof Error?e.message:"업로드 실패");}finally{setBusy(false);}}
 useEffect(()=>{if(!source)return;let stopped=false,timer:ReturnType<typeof setTimeout>;const controller=new AbortController();
 async function poll(){try{if(!document.hidden){await fetch("/api/cases/"+source!.caseId+"/live",{signal:controller.signal});const d=await json("/api/cases/"+source!.caseId+"/evidence/"+source!.id+"?analysis=1",{signal:controller.signal});if(stopped)return;setResult(d);if(d.analysis){setChecked(d.analysis.candidates.map((c:{id:string})=>c.id));return;}}}catch(e){if(!stopped)setError(e instanceof Error?e.message:"상태 확인 실패");}if(!stopped)timer=setTimeout(poll,2500);}
 void poll();return()=>{stopped=true;controller.abort();clearTimeout(timer);};},[source]);
 async function save(){if(!source)return;setBusy(true);setError("");try{await json("/api/life-records/from-evidence",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({caseId:source.caseId,evidenceId:source.id,date:source.date,candidateIds:checked})});setSaved(true);router.refresh();}catch(e){setError(e instanceof Error?e.message:"저장 실패");}finally{setBusy(false);}}
 return <Card className="voice-journal"><div className="flex items-center gap-3"><span className="voice-symbol"><Mic size={24}/></span><div><h2>녹음으로 하루 정리</h2><p className="muted mt-1">녹음을 고르면 기록으로 정리해요.</p></div></div>
 <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="녹음 기준일"><Input type="date" required value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/></Field><Field label="묶을 기록"><select className="w-full min-h-11 rounded-xl border border-stone-200 bg-white px-3" value={caseId} onChange={e=>setCaseId(e.target.value)} disabled={busy}><option value="">새 하루 기록</option>{cases.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}{caseId&&!cases.some(c=>c.id===caseId)&&<option value={caseId}>{source?.date} 하루 기록</option>}</select></Field></div>
 <label className={"voice-upload-action "+(busy?"opacity-50":"")}><Mic size={18}/>{busy?"보관하는 중…":"녹음 파일 선택"}<input type="file" className="sr-only" accept="audio/*,.m4a,.mp3,.wav,.webm,.aac,.flac,.ogg,.opus,.3gp,.mp4" disabled={busy||!date} onChange={e=>{void upload(e.target.files?.[0]);e.target.value="";}}/></label><p className="mt-2 text-xs text-slate-500">M4A·MP3·WAV 등 · 20MB / 20분 이내</p>
 {error&&<p role="alert" className="notice error">{error}</p>}{source&&<div className="mt-5 space-y-4"><p className="text-sm break-all">{source.name} · {phaseLabel[result?.phase??"queued"]}</p>{result?.error&&<p className="notice">{result.error}</p>}
 {result?.analysis&&<><AudioTranscript src={"/api/cases/"+source.caseId+"/evidence/"+source.id+"?preview=1"} segments={result.extraction?.segments}/><h3 className="font-semibold">보관할 문장</h3><p className="text-xs text-slate-500">자동 변환 오류는 원본과 대조해 주세요. 선택한 원문만 보관합니다.</p><div className="max-h-80 overflow-auto">{result.analysis.candidates.map(c=><label className="flex gap-3 border-b border-stone-100 py-3 text-sm" key={c.id}><input type="checkbox" className="mt-1 size-5 shrink-0 accent-emerald-800" checked={checked.includes(c.id)} onChange={e=>setChecked(old=>e.target.checked?[...old,c.id]:old.filter(id=>id!==c.id))}/><span>{c.quote}</span></label>)}</div><Button disabled={busy||!checked.length} onClick={save}><Check size={16}/>{saved?"하루 기록에 보관됨":"선택한 문장 보관"}</Button></>}
 <Link href={"/cases/"+source.caseId+"/evidence"} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800">실시간 관계도 열기 <ArrowUpRight size={16}/></Link></div>}
 </Card>;
}
