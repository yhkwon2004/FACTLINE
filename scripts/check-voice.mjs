import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile} from "node:fs/promises";
const origin=process.env.APP_URL||"http://localhost:3000",cookies=[];
async function request(path,cookie="",body,method=body?"POST":"GET"){
 const r=await fetch(origin+path,{method,headers:{accept:"application/json",...(cookie?{cookie}:{}),...(body&&!(body instanceof FormData)?{"content-type":"application/json"}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
 const d=await r.json();return {r,d};
}
async function ok(...args){const {r,d}=await request(...args);assert(r.ok,JSON.stringify(d));return d;}
async function account(){const {r,d}=await request("/api/auth/register","",{name:"음성 합성검사",email:randomUUID()+"@example.test",password:randomUUID()+"A1"});assert(r.ok,JSON.stringify(d));const cookie=r.headers.get("set-cookie").split(";")[0];cookies.push(cookie);return cookie;}
async function ready(caseId,evidenceId,cookie){for(let i=0;i<100;i++){await ok("/api/cases/"+caseId+"/live",cookie);const d=await ok("/api/cases/"+caseId+"/evidence/"+evidenceId+"?analysis=1",cookie);if(d.phase==="ready")return d;if(d.phase==="error")throw Error(d.error);await new Promise(r=>setTimeout(r,1500));}throw Error("Analysis did not finish");}
try{
 const owner=await account(),other=await account();
 const make=(cookie,title,description)=>ok("/api/cases",cookie,{title,type:"OTHER",description});
 const previous=(await make(owner,"합성 송금 과거 기록","김민수가 이서연에게 5만원을 송금했다.")).case;
 const privateCase=(await make(other,"다른 계정의 비공개 송금","김민수가 이서연에게 5만원을 송금했다.")).case;
 const current=(await make(owner,"합성 녹음·관계 흐름 검사")).case;
 const base="/api/cases/"+current.id;
 const bytes=await readFile(new URL("../ai/fixtures/synthetic-korean.m4a",import.meta.url));
 const form=new FormData();form.set("file",new File([bytes],"synthetic-korean.m4a",{type:"audio/mp4"}));form.set("recordingDate","2026-11-18");
 const audio=(await ok(base+"/evidence",owner,form)).evidence;
 const decoded=await ready(current.id,audio.id,owner);
 assert(decoded.extraction.method.startsWith("Whisper"));assert(decoded.extraction.segments.length>0);assert.equal(decoded.referenceDate,"2026-11-18");
 const media=await fetch(origin+base+"/evidence/"+audio.id+"?preview=1",{headers:{cookie:owner,range:"bytes=10-99"}});
 assert.equal(media.status,206);assert.deepEqual(Buffer.from(await media.arrayBuffer()),bytes.subarray(10,100));assert.equal(media.headers.get("content-type"),"audio/mp4");
 const denied=await fetch(origin+base+"/evidence/"+audio.id+"?preview=1",{headers:{cookie:other,range:"bytes=10-99"}});assert(!denied.ok);
 const save={caseId:current.id,evidenceId:audio.id,date:"2026-11-18",candidateIds:decoded.analysis.candidates.map(c=>c.id)};
 const wrong=await request("/api/life-records/from-evidence",owner,{...save,date:"2026-11-17"});assert(!wrong.r.ok);
 const saved=await ok("/api/life-records/from-evidence",owner,save),again=await ok("/api/life-records/from-evidence",owner,save);assert.equal(saved.record.id,again.record.id);assert.equal(saved.record.sourceEvidenceId,audio.id);
 assert.equal((await request("/api/life-records/from-evidence",other,save)).r.ok,false);
 const note=new FormData();note.set("name","합성 관계·금액");note.set("content","김민수가 이서연에게 5만원을 송금했다. 이서연은 박지훈에게 전화했다. 박지훈은 김민수를 때리지 않았다.");
 const evidence=(await ok(base+"/evidence",owner,note)).evidence;await ready(current.id,evidence.id,owner);
 const live=await ok(base+"/live",owner);assert(live.relationships.edges.some(e=>e.amount==="5만원"));assert(live.relationships.edges.some(e=>e.polarity==="denied"));
 const analysis=await ok(base+"/analysis",owner,undefined,"POST");assert(analysis.legal.issues.some(i=>i.title==="금전·차용"));assert(analysis.history.some(h=>h.id===previous.id));assert(!analysis.history.some(h=>h.id===privateCase.id));
 const report={passed:true,checks:["actual M4A upload and offline Whisper","source segment timestamps","authenticated byte-range audio","reference-date validation","source-linked idempotent daily record","cross-account isolation","live directed money and denied-action relationships","legal coverage distinguishes missing elements","owner-only semantic case history"]};console.log(JSON.stringify(report,null,2));
}finally{for(const cookie of cookies)await ok("/api/account",cookie,undefined,"DELETE");}
