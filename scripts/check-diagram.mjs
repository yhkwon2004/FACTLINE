import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
const origin=process.env.APP_URL||"http://localhost:3000",accounts=[];
async function request(path,cookie="",body,method=body?"POST":"GET",headers={}){const r=await fetch(origin+path,{method,headers:{accept:"application/json",...(cookie?{cookie}:{}),...(body?{"content-type":"application/json"}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();return {r,d};}
async function ok(...args){const v=await request(...args);assert(v.r.ok,JSON.stringify(v.d));return v.d;}
async function account(){const {r,d}=await request("/api/auth/register","",{name:"관계도 합성검사",email:randomUUID()+"@example.test",password:randomUUID()+"A1"});assert(r.ok,JSON.stringify(d));const cookie=r.headers.get("set-cookie").split(";")[0];accounts.push(cookie);return cookie;}
try{
 const owner=await account(),other=await account(),created=await ok("/api/cases",owner,{title:"합성 관계도 편집 검증",type:"OTHER"}),base="/api/cases/"+created.case.id;
 const initial=await ok(base+"/diagram",owner);assert.equal(initial.revision,0);
 const document=initial.document;document.title="원본과 구분된 직접 작성";document.manualNodes=[{id:"manual:a",label:"합성 인물 A",kind:"person"},{id:"manual:b",label:"합성 인물 B",kind:"person"}];document.nodes={"manual:a":{x:160,y:180,subtitle:"합성 설명"},"manual:b":{x:600,y:430}};document.manualEdges=[{id:"manual:e",source:"manual:a",target:"manual:b",label:"직접 작성한 관계",directed:true}];document.groups=[{id:"group:a",label:"합성 묶음",x:40,y:50,width:400,height:400,color:"amber"}];
 const save=await ok(base+"/diagram",owner,{revision:0,document},"PUT");assert.equal(save.revision,1);
 const reload=await ok(base+"/diagram",owner);assert.deepEqual(reload.document,document);
 assert(!(await request(base+"/diagram",other)).r.ok);assert(!(await request(base+"/diagram",other,{revision:1,document},"PUT")).r.ok);assert(!(await request(base+"/diagram")).r.ok);
 const conflict=await request(base+"/diagram",owner,{revision:0,document},"PUT");assert.equal(conflict.r.status,409);assert.equal((await ok(base+"/diagram",owner)).revision,1);
 const concurrent=await Promise.all([request(base+"/diagram",owner,{revision:1,document:{...document,title:"첫 번째 창"}},"PUT"),request(base+"/diagram",owner,{revision:1,document:{...document,title:"두 번째 창"}},"PUT")]);assert.equal(concurrent.filter(v=>v.r.ok).length,1);assert.equal(concurrent.filter(v=>v.r.status===409).length,1);
 assert(!(await request(base+"/diagram",owner,{revision:2,document:{...document,nodes:{"manual:a":{x:0,y:0,portraitEvidenceId:randomUUID()}}}},"PUT")).r.ok);
 assert(!(await request(base+"/diagram",owner,{revision:2,document:{...document,manualNodes:Array(61).fill(document.manualNodes[0])}},"PUT")).r.ok);
 assert(!(await request(base+"/diagram",owner,{revision:2,document},"PUT",{origin:"https://untrusted.example"})).r.ok);
 await ok(base+"/lock",owner,undefined,"POST");assert((await ok(base+"/diagram",owner)).isLocked);assert(!(await request(base+"/diagram",owner,{revision:2,document},"PUT")).r.ok);
 console.log(JSON.stringify({passed:true,checks:["real diagram persistence and reload","version conflict preserves edits","concurrent windows cannot overwrite","owner-only read/write","foreign portrait rejection","bounded payload validation","origin validation","locked case read-only"]},null,2));
}finally{for(const cookie of accounts){await ok("/api/account",cookie,undefined,"DELETE");const login=await fetch(origin+"/login",{headers:{cookie}});assert.equal(login.status,200,"Revoked cookie must not cause sign-in redirect loops");}}
