import { readFile, access } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
const origin = process.env.APP_URL || "http://localhost:3000";
const results = [];
const loopback = await fetch(origin + "/", {
  headers: { "x-forwarded-proto": "http" },
  redirect: "manual",
});
if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) assert.ok(!loopback.headers.get("location")?.startsWith("https:"));
async function request(path, options = {}, cookie = "") {
  const r = await fetch(origin + path, {
    ...options,
    headers: {
      accept: "application/json",
      ...options.headers,
      ...(cookie ? { cookie } : {}),
    },
  });
  const type = r.headers.get("content-type") ?? "";
  const data = type.includes("json") ? await r.json() : await r.text();
  return { r, data };
}
async function account() {
  const { r, data } = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "자동검증",
      email: randomUUID() + "@example.test",
      password: randomUUID() + "A1",
    }),
  });
  assert.equal(r.status, 200);
  return r.headers.get("set-cookie").split(";")[0];
}
const owner = await account(),
  other = await account();
let testFileId = "";
try {
  const { data: created } = await request(
    "/api/cases",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "합성 검증 사건",
        type: "VIOLENCE",
        description: "실제 인물·사건이 없는 소프트웨어 검사 자료",
      }),
    },
    owner,
  );
  assert.ok(created.case?.id);
  const id = created.case.id;
  const raw =
    "소프트웨어 검사용 합성 기록입니다.\n2026년 5월 12일 교실에서 민수가 팔을 때렸다.\n2026년 5월 13일 복도에서 지훈이가 욕설을 했다.\nThe message says: I will hurt you.\n날짜를 기억하지 못하는 대화도 있다.";
  const bytes = Buffer.from(raw);
  const f = new FormData();
  f.set("file", new File([bytes], "합성-대화기록.txt", { type: "text/plain" }));
  const { r: up, data: uploaded } = await request(
    "/api/cases/" + id + "/evidence",
    { method: "POST", body: f },
    owner,
  );
  assert.equal(up.status, 200, JSON.stringify(uploaded));
  const e = uploaded.evidence;
  testFileId = e.fileUrl.slice(8);
  assert.equal(e.fileHash, createHash("sha256").update(bytes).digest("hex"));
  results.push("actual bytes uploaded and SHA-256 verified");
  const download = await fetch(
    origin + "/api/cases/" + id + "/evidence/" + e.id,
    { headers: { cookie: owner } },
  );
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
  results.push("encrypted original round-trip");
  let inspected;
  for(let attempt=0;attempt<120;attempt++) {
    inspected=await request("/api/cases/"+id+"/evidence/"+e.id+"?analysis=1",{},owner);
    if(inspected.data.phase==="error") throw new Error(inspected.data.error);
    if(inspected.data.analysis && (!inspected.data.phase || inspected.data.phase==="ready")) break;
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  assert.equal(inspected.r.status,200,JSON.stringify(inspected.data));
  assert(inspected.data.analysis,"Automatic analysis must complete");
  assert.equal(inspected.data.analysis.text, raw);
  assert.ok(inspected.data.analysis.tokens.length);
  assert.ok(inspected.data.analysis.classification.length);
  assert.ok(
    inspected.data.analysis.references.every((x) =>
      x.sourceUrl.startsWith("https://"),
    ),
  );
  results.push(
    "local extraction, trained classification, morphology and source retrieval",
  );
  const candidate = inspected.data.analysis.candidates.find((x) =>
    x.quote.includes("2026년 5월 12일"),
  );
  assert.ok(candidate);
  for (const expected of [1, 0]) {
    const accept = await request(
      "/api/cases/" + id + "/evidence/" + e.id + "/accept",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateIds: [candidate.id] }),
      },
      owner,
    );
    assert.equal(accept.r.status, 200, JSON.stringify(accept.data));
    assert.equal(accept.data.count, expected);
  }
  results.push("source approval and duplicate prevention");
  const timeline = await request("/api/cases/" + id + "/timeline", {}, owner);
  assert.equal(timeline.r.status, 200);
  assert.ok(JSON.stringify(timeline.data).includes("민수"));
  results.push("persistent timeline");
  const review = await request(
    "/api/cases/" + id + "/analysis",
    { method: "POST" },
    owner,
  );
  assert.equal(review.r.status, 200, JSON.stringify(review.data));
  assert.ok(review.data.local.inspection);
  results.push("case correlation and missing-information analysis");
  const chat = await request(
    "/api/cases/" + id + "/assistant",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question: "2026년 5월 12일 기록의 관련자와 행동을 알려줘.",
      }),
    },
    owner,
  );
  assert.equal(chat.r.status, 200, JSON.stringify(chat.data));
  assert.ok(chat.data.answer.length > 10);
  assert.ok(chat.data.answer.includes("민수") && chat.data.answer.includes("팔"), chat.data.answer);
  results.push("local source-grounded LLM generation: " + chat.data.answer.slice(0, 100));
  const report = await request(
    "/api/cases/" + id + "/report",
    { method: "POST" },
    owner,
  );
  assert.equal(report.r.status, 200, JSON.stringify(report.data));
  assert.ok(report.data.report.content.includes(e.fileHash));
  results.push("report includes original hash");
  const exported = await request("/api/cases/" + id + "/export", {}, owner);
  assert.equal(exported.r.status, 200);
  assert.equal(exported.data.format, "EUMLOG-1");
  assert.ok(!JSON.stringify(exported.data).includes("passwordHash"));
  results.push("portable case export");
  for (const suffix of [
    "",
    "/evidence",
    "/timeline",
    "/report",
    "/export",
    "/evidence/" + e.id,
    "/evidence/" + e.id + "?analysis=1",
  ]) {
    const denied = await request("/api/cases/" + id + suffix, {}, other);
    assert.ok(denied.r.status >= 400, "cross-account path " + suffix);
  }
  const deniedPost = await request(
    "/api/cases/" + id + "/analysis",
    { method: "POST" },
    other,
  );
  assert.ok(deniedPost.r.status >= 400);
  results.push("cross-account reads/writes denied");
  const anonymous = await request("/api/cases/" + id + "/evidence/" + e.id);
  assert.ok(anonymous.r.status >= 400);
  results.push("anonymous download denied");
  const lock = await request(
    "/api/cases/" + id + "/lock",
    { method: "POST" },
    owner,
  );
  assert.equal(lock.r.status, 200);
  const locked = await request(
    "/api/cases/" + id + "/analysis",
    { method: "POST" },
    owner,
  );
  assert.ok(locked.r.status >= 400);
  const unlock = await request(
    "/api/cases/" + id + "/lock",
    { method: "DELETE" },
    owner,
  );
  assert.equal(unlock.r.status, 200);
  results.push("case locking and unlocking");
  if (process.env.CHECK_CLOUD!=="1") {
    const store = await readFile(".factline-local-store.json", "utf8");
    assert.ok(store.startsWith("EUMLOG1:"));assert.ok(!store.includes(raw));results.push("encrypted case metadata");
  }
  const concurrent=await Promise.all([1,2,3,4].map(n=>request("/api/cases",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:"동시 저장 검사 "+n,type:"OTHER"})},owner)));
  assert(concurrent.every(x=>x.r.ok),JSON.stringify(concurrent));
  const all=await request("/api/cases",{},owner);
  assert(concurrent.every(x=>all.data.cases.some(c=>c.id===x.data.case.id)),"Every concurrent write must persist");
  results.push("concurrent cloud writes preserve all cases");
  const second=await request("/api/cases/"+id+"/evidence",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:"교실 목격 메모.txt",content:"2026년 5월 12일 교실에서 민수가 팔을 때렸다. 같은 장소에서 이 장면을 보았다."})},owner);
  assert(second.r.ok,JSON.stringify(second.data));
  let live;
  for(let attempt=0;attempt<100;attempt++) {
    live=await request("/api/cases/"+id+"/live",{},owner);
    assert(live.r.ok,JSON.stringify(live.data));
    if(live.data.items.find(x=>x.id===second.data.evidence.id)?.phase==="ready") break;
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  assert.equal(live.data.items.length,2);
  assert.equal(live.data.items[0].id,second.data.evidence.id,"Newest evidence must appear first");
  assert(live.data.graph.edges.some(x=>x.kind==="semantic"),"Actual learned similarity must form an edge");
  assert.equal(live.data.graph.nodes.filter(x=>x.kind==="person"&&x.label==="민수").length,1);
  assert(live.data.graph.nodes.some(x=>x.kind==="fact"&&x.confirmed));
  const otherView=await request("/api/cases/"+id+"/live",{},owner);
  assert.deepEqual(otherView.data.graph,live.data.graph);
  const unchanged=await request("/api/cases/"+id+"/live",{headers:{"if-none-match":otherView.r.headers.get("etag")}},owner);
  assert.equal(unchanged.r.status,304);
  const leaked=await request("/api/cases/"+id+"/live",{},other);assert(leaked.r.status>=400);
  results.push("automatic source graph, shared entities, learned similarity, separate-view synchronization and ETag");
  const csrf = await request(
    "/api/cases",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://untrusted.example",
      },
      body: JSON.stringify({ title: "should fail", type: "OTHER" }),
    },
    owner,
  );
  assert.ok(csrf.r.status >= 400);
  results.push("cross-origin mutation rejected");
} catch(error) {
  console.error("Failed after checks:",results,error);throw error;
} finally {
  const deleted = await request("/api/account", { method: "DELETE" }, owner);
  assert.equal(deleted.r.status, 200, JSON.stringify(deleted.data));
  const revoked = await request("/api/auth/me", {}, owner);
  assert.equal(revoked.data.session, null);
  if (testFileId && process.env.CHECK_CLOUD!=="1") {
    await assert.rejects(access(path.join(".data/evidence", testFileId)));
    results.push("account deletion purges originals and revokes sessions");
  }
  await request("/api/account", { method: "DELETE" }, other);
}

console.log(JSON.stringify({ passed: results.length, results }, null, 2));
