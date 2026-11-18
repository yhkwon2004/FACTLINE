import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { upload } from "@vercel/blob/client";
const origin=process.env.APP_URL || "https://eumlog-evidence.vercel.app";
async function json(path,body,cookie="",method="POST") {
  const response=await fetch(origin+path,{method,headers:{accept:"application/json","content-type":"application/json",...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();assert(response.ok,JSON.stringify(data));return {response,data};
}
const registration=await json("/api/auth/register",{name:"대용량 검증",email:randomUUID()+"@example.test",password:randomUUID()+"A1"});
const cookie=registration.response.headers.get("set-cookie").split(";")[0];
try {
  const created=await json("/api/cases",{title:"대용량 업로드 자동 검사",type:"OTHER"},cookie);
  const caseId=created.data.case.id, userId=registration.data.user.id;
  const bytes=Buffer.concat([Buffer.from("2026년 5월 12일 교실에서 민수가 팔을 때렸다는 대화가 있었다. [소프트웨어 검사용 합성 자료]\n"),Buffer.alloc(5*1024*1024,10)]);
  const object=await upload("pending/"+userId+"/"+caseId+"/"+randomUUID()+"/source.txt",new File([bytes],"large-upload-check.txt",{type:"text/plain"}),{access:"private",handleUploadUrl:origin+"/api/cases/"+caseId+"/uploads",headers:{cookie},contentType:"text/plain"});
  const saved=await json("/api/cases/"+caseId+"/evidence",{pathname:object.pathname,name:"대용량 검사.txt",type:"text/plain"},cookie);
  const evidence=saved.data.evidence;
  assert.equal(evidence.fileHash,createHash("sha256").update(bytes).digest("hex"));
  const original=await fetch(origin+"/api/cases/"+caseId+"/evidence/"+evidence.id,{headers:{cookie}});
  assert(original.ok);assert.deepEqual(Buffer.from(await original.arrayBuffer()),bytes);
  let result;
  for(let attempt=0;attempt<90;attempt++) {
    result=(await json("/api/cases/"+caseId+"/evidence/"+evidence.id+"?analysis=1",null,cookie,"GET")).data;
    if(result.phase==="ready" || result.phase==="error") break;
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  assert.equal(result.phase,"ready",JSON.stringify({phase:result.phase,error:result.error}));
  assert(result.analysis.text.includes("교실에서 민수가"));
  console.log(JSON.stringify({passed:true,bytes:bytes.length,checks:["5 MB direct private upload","AES encrypted original and exact byte download","SHA-256 integrity","automatic trained-model analysis"]}));
}finally {
  await json("/api/account",null,cookie,"DELETE");
  const revoked=await json("/api/auth/me",null,cookie,"GET");assert.equal(revoked.data.session,null);
}
