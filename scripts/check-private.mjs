import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {consentPayload} from '../src/domain/services/PrivateData.ts';
const origin=process.env.APP_URL||'http://localhost:3000',accounts=[],checks=[];
async function req(path,cookie='',body,method=body?'POST':'GET',headers={}){const r=await fetch(origin+path,{method,headers:{accept:'application/json',...(cookie?{cookie}:{}),...(body?{'content-type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return {r,d:await r.json()};}
async function ok(...args){const v=await req(...args);assert(v.r.ok,JSON.stringify(v.d));return v;}
async function account(){const email='private-test-'+randomUUID()+'@example.test',password=randomUUID()+'A1';const {r,d}=await ok('/api/auth/register','',{name:'합성 검사자',email,password});const result={email,password,cookie:r.headers.get('set-cookie').split(';')[0],id:d.user.id};accounts.push(result);assert.equal(d.user.name,'사용자');assert(!JSON.stringify(d).includes(email));await ok('/api/auth/login','',{email,password});return result;}
try{
 const owner=await account(),other=await account();checks.push('pseudonymous registration and repeat sign-in');
 for(const path of ['/api/cases','/api/life-records','/api/integrations/import','/api/cases/'+randomUUID()+'/uploads'])assert.equal((await req(path,owner.cookie,{title:'must not persist',content:'synthetic'})).r.status,403);
 checks.push('legacy cloud writes/uploads rejected before data storage');
 const initial=await ok('/api/cases',owner.cookie);assert.equal(initial.d.cases.length,0);
 const text='2026년 11월 18일 오후 3시 20분 인물A는 인물B에게 7만원을 송금했다. 인물A는 인물B를 때리지 않았다고 말했다.',referenceDate='2026-11-19';
 const body={task:'inspect',anonymousText:text,consent:true,referenceDate,digest:createHash('sha256').update(consentPayload('inspect',text,undefined,referenceDate)).digest('hex')};
 assert(!(await req('/api/private/analyze','',body)).r.ok);assert(!(await req('/api/private/analyze',owner.cookie,{...body,consent:false})).r.ok);assert(!(await req('/api/private/analyze',owner.cookie,{...body,question:'변경한 질문'})).r.ok);assert(!(await req('/api/private/analyze',owner.cookie,{...body,digest:'0'.repeat(64)})).r.ok);
 const pii='연락처 010-1234-5678';assert(!(await req('/api/private/analyze',owner.cookie,{...body,anonymousText:pii,digest:createHash('sha256').update(consentPayload('inspect',pii,undefined,referenceDate)).digest('hex')})).r.ok);checks.push('authentication, explicit consent, full-purpose digest and residual identifier guards');
 if(process.env.CHECK_AI!=='0'){const {d}=await ok('/api/private/analyze',owner.cookie,body);assert(d.result.relations.some(r=>r.amount==='7만원'&&r.actor==='인물A'&&r.target==='인물B'));assert(d.result.relations.some(r=>r.polarity==='denied'&&r.target==='인물B'));assert.equal(d.result.candidates[0].datetime,'2026-11-18T15:20:00+09:00');checks.push('real learned analysis, denial recipient, grounded timeline');
 const question='이 송금 기록만으로 사기죄가 확정되나요?',chat={...body,task:'chat',question};chat.digest=createHash('sha256').update(consentPayload(chat.task,text,question,referenceDate)).digest('hex');const response=(await ok('/api/private/analyze',owner.cookie,chat)).d.result;assert.equal(response.method,'legal-checklist');assert(response.answer.includes('단정할 수 없습니다'));checks.push('legal conclusions use source-linked questions, not generated definitions');}
 if(process.env.CHECK_AI!=='0'){
   const question='누가 누구에게 얼마를 보냈는지 한 문장으로 정리해 주세요.';
   const digest=createHash('sha256').update(consentPayload('chat',text,question,referenceDate)).digest('hex');
   const response=(await ok('/api/private/analyze',owner.cookie,{...body,task:'chat',question,digest})).d.result;
   assert.match(response.model,/Qwen3-1\.7B/);
   assert.match(response.answer,/[가-힣]/);
   assert.match(response.answer,/7\s*만|70,?000|칠\s*만/);
   checks.push('Korean LoRA generation on approved text preserves the transfer amount');
 }
 assert.equal((await ok('/api/cases',owner.cookie)).d.cases.length,0);checks.push('anonymous analysis does not create persistent server cases');
 assert(!(await req('/api/private/migrate?file=not-owned',owner.cookie)).r.ok);
if(['localhost','127.0.0.1'].includes(new URL(origin).hostname) && process.env.FACTLINE_LOCAL_STORE_PATH){const {createContainer}=await import('../src/infrastructure/di/container.ts');const container=createContainer(),c=await container.caseService.create({userId:owner.id,title:'합성 이전 자료 검증',type:'OTHER'});const content='실제 개인정보가 없는 합성 이전 원문 '+randomUUID();const evidence=await container.evidenceService.upload({caseId:c.id,name:'synthetic-legacy.txt',type:'text/plain',content});const manifest=(await ok('/api/private/migrate',owner.cookie)).d;const fileKey=evidence.fileUrl.slice(8),entry=manifest.files.find(f=>f.key===fileKey);assert(entry);const bytes=await fetch(origin+'/api/private/migrate?file='+encodeURIComponent(fileKey),{headers:{cookie:owner.cookie}}).then(r=>r.arrayBuffer());assert.equal(createHash('sha256').update(Buffer.from(bytes)).digest('hex'),entry.sha256);assert(!(await req('/api/private/migrate?file='+encodeURIComponent(fileKey),other.cookie)).r.ok);assert(!(await req('/api/private/migrate',owner.cookie,{confirm:'DELETE_SERVER_COPY',digest:'0'.repeat(64)},'DELETE')).r.ok);await ok('/api/private/migrate',owner.cookie,{confirm:'DELETE_SERVER_COPY',digest:manifest.digest},'DELETE');assert.equal((await ok('/api/cases',owner.cookie)).d.cases.length,0);await ok('/api/auth/login','',{email:owner.email,password:owner.password});const {readEncrypted}=await import('../src/infrastructure/storage/LocalEvidenceStorage.ts');await assert.rejects(readEncrypted(fileKey));checks.push('owner-only verified legacy export, digest protection, server purge retaining account');}
 console.log(JSON.stringify({passed:true,checks},null,2));
}finally{for(const account of accounts)await ok('/api/account',account.cookie,undefined,'DELETE');}
