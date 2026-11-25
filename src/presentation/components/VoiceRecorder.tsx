"use client";
import {useEffect, useRef, useState} from "react";
import {Mic, Square} from "lucide-react";
import {Button} from "./UI";

export function VoiceRecorder({disabled,onSave}:{disabled:boolean;onSave:(file:File)=>Promise<boolean>}) {
  const recording=useRef<MediaRecorder|null>(null), mounted=useRef(true);
  const [phase,setPhase]=useState<"idle"|"request"|"recording"|"saving">("idle");
  const [file,setFile]=useState<File|null>(null),[status,setStatus]=useState("");
  useEffect(()=>{mounted.current=true;return ()=>{
    mounted.current=false;
    const active=recording.current;
    if(active && active.state!=="inactive") active.stop();
    active?.stream.getTracks().forEach(t=>t.stop());
  };},[]);

  async function start(){
    setStatus("");setPhase("request");
    let stream:MediaStream|undefined;
    try {
      if(!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==="undefined") throw Error("이 브라우저는 녹음을 지원하지 않아요. 음성 파일을 선택해 주세요.");
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!mounted.current){stream.getTracks().forEach(t=>t.stop());return;}
      const rec=new MediaRecorder(stream), chunks:Blob[]=[];
      let size=0;
      recording.current=rec;
      const stop=()=>{if(rec.state!=="inactive")rec.stop();};
      let timer:ReturnType<typeof setTimeout>;
      rec.ondataavailable=event=>{if(event.data.size){chunks.push(event.data);size+=event.data.size;if(size>=19*1024*1024)stop();}};
      rec.onstop=()=>{
        clearTimeout(timer);rec.stream.getTracks().forEach(t=>t.stop());recording.current=null;
        if(!mounted.current)return;
        const type=rec.mimeType||chunks[0]?.type||"audio/webm",ext=type.includes("mp4")?"m4a":type.includes("ogg")?"ogg":"webm";
        const result=new File(chunks,"음성기록-"+new Date().toISOString().replace(/[:.]/g,"-")+"."+ext,{type});
        if(result.size)setFile(result);else setStatus("녹음된 소리가 없습니다. 마이크를 확인해 주세요.");
        setPhase("idle");
      };
      rec.onerror=()=>{setStatus("녹음이 중단됐어요. 저장된 구간을 확인하세요.");stop();};
      rec.start(1000);timer=setTimeout(stop,20*60*1000);setPhase("recording");
    }catch(error){
      stream?.getTracks().forEach(t=>t.stop());
      if(mounted.current){setPhase("idle");setStatus(error instanceof Error&&error.name!=="NotAllowedError"?error.message:"마이크 권한을 허용하거나 녹음 파일을 선택해 주세요.");}
    }
  }
  if(file)return <div className="record-capture"><Button disabled={disabled||phase==="saving"} onClick={async()=>{setPhase("saving");try{if(await onSave(file))setFile(null);}finally{if(mounted.current)setPhase("idle");}}}>녹음 저장·전사</Button><button disabled={phase==="saving"} onClick={()=>setFile(null)}>다시 녹음</button>
    <button type="button" onClick={()=>{const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}}>원본 다운로드</button></div>;
  return <div className="record-capture"><Button disabled={phase==="request"||(phase!=="recording"&&disabled)} variant="outline" onClick={()=>phase==="recording"?recording.current?.stop():void start()}>
    {phase==="recording"?<Square size={16}/>:<Mic size={17}/>} {phase==="recording"?"녹음 끝내기":phase==="request"?"마이크 연결 중":"직접 녹음"}</Button>{status&&<span role="status">{status}</span>}</div>;
}
