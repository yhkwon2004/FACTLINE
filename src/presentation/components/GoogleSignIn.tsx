"use client";
import {notifyAuthChange} from "./auth-notify";
import Script from "next/script";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {Field,Input} from "./UI";
type GoogleClient={accounts:{id:{initialize:(options:{client_id:string;nonce:string;callback:(value:{credential:string})=>void;auto_select:boolean})=>void;renderButton:(element:HTMLElement,options:Record<string,string|number>)=>void}}};
declare global {interface Window {google?:GoogleClient}}
export function GoogleSignIn({next="/dashboard",link=false}:{next?:string;link?:boolean}) {
 const router=useRouter(),container=useRef<HTMLDivElement>(null),passwordValue=useRef("");
 const [config,setConfig]=useState<{configured:boolean;clientId?:string;nonce?:string}|null>(null);
 const [ready,setReady]=useState(false),[error,setError]=useState(""),[busy,setBusy]=useState(false),[password,setPassword]=useState("");
 useEffect(()=>{const controller=new AbortController();fetch("/api/auth/google/config",{cache:"no-store",signal:controller.signal}).then(r=>r.json()).then(setConfig).catch(e=>{if(e.name!=="AbortError")setError("로그인 설정을 불러오지 못했습니다.");});return()=>controller.abort();},[]);
 useEffect(()=>{
  if(!ready||!config?.clientId||!config.nonce||!container.current||!window.google)return;
  window.google.accounts.id.initialize({client_id:config.clientId,nonce:config.nonce,auto_select:false,callback:async value=>{
   setBusy(true);setError("");
   try{
    const response=await fetch("/api/auth/google",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({credential:value.credential,nonce:config.nonce,next,link,password:link?passwordValue.current:undefined})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||"Google 로그인에 실패했습니다.");
    notifyAuthChange(data.user.id);
    router.push(link?"/mypage":data.next);router.refresh();
   }catch(e){setError(e instanceof Error?e.message:"로그인에 실패했습니다.");}finally{setBusy(false);}
  }});
  container.current.replaceChildren();
  window.google.accounts.id.renderButton(container.current,{type:"standard",theme:"outline",size:"large",shape:"pill",text:"continue_with",locale:"ko",width:Math.min(380,Math.max(200,container.current.clientWidth))});
 },[ready,config,link,next,router]);
 if(config&&!config.configured)return <p className="text-xs leading-5 text-stone-500">Google 로그인은 연결 준비 중입니다. 기존 이메일로 계속할 수 있어요.</p>;
 return <div className={"google-sign-in "+(link?"is-link ":"")+(busy?"is-signing":"")} aria-busy={busy}>
  {config?.configured?<Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={()=>setReady(true)} onError={()=>setError("Google 로그인 창을 불러오지 못했습니다.")}/>:null}
  {link?<Field label="현재 비밀번호"><Input type="password" autoComplete="current-password" value={password} onChange={e=>{setPassword(e.target.value);passwordValue.current=e.target.value;}} placeholder="기존 계정 확인 후 Google 연결"/></Field>:null}
  <div ref={container} className={"google-button-container "+(ready?"is-ready":"")} inert={busy||(link&&password.length<8)?true:undefined}/>
  {!ready?<div role="status" aria-label="Google 로그인 준비 중" className="auth-skeleton"><span/><span/><span/></div>:null}
  {busy?<p role="status" className="auth-progress"><span/>보관함으로 연결하는 중…</p>:null}
  {error?<p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>:null}
 </div>;
}
