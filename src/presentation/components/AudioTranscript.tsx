"use client";
import {useRef} from "react";
export type AudioSegment={start:number;end:number;text:string;approximate?:boolean};
export function AudioTranscript({src,segments=[]}:{src:string;segments?:AudioSegment[]}) {
 const audio=useRef<HTMLAudioElement>(null);
 const clock=(n:number)=>Math.floor(n/60)+":"+String(Math.floor(n%60)).padStart(2,"0");
 return <div className="space-y-3"><audio ref={audio} controls preload="metadata" src={src} className="w-full" aria-label="녹음 원본 재생"/>
 {segments.length>0&&<><p className="text-xs text-slate-500">녹음 안의 대략적인 위치입니다. 사건 발생 시각이 아닙니다.</p><div className="max-h-64 overflow-auto space-y-1">{segments.map((s,i)=><button type="button" key={i} className="flex w-full gap-3 rounded-xl p-3 text-left text-sm hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-600" onClick={()=>{if(audio.current){audio.current.currentTime=s.start;void audio.current.play().catch(()=>{});}}}><span className="shrink-0 font-mono text-emerald-700">{clock(s.start)}</span><span>{s.text}</span></button>)}</div></>}
 </div>;
}
