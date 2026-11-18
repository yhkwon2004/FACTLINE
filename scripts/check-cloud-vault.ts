import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { readVault, writeVault, deleteVault, writeConflict } from "../src/infrastructure/storage/PrivateVault";
import { seal, unseal } from "../src/infrastructure/storage/LocalEvidenceStorage";
process.loadEnvFile(".env.vercel.local");Object.assign(process.env,JSON.parse(await readFile(".data/cloud-env.json","utf8")));
const name="checks/"+randomUUID();
try {
  await writeVault(name,seal(Buffer.from("first".repeat(1000))),null);
  const a=await readVault(name);assert(a);assert.equal(unseal(a.bytes).toString(),"first".repeat(1000));assert(!a.bytes.includes(Buffer.from("first")));
  await writeVault(name,seal(Buffer.from("second")),a.etag);
  let blocked=false;
  try {await writeVault(name,seal(Buffer.from("stale")),a.etag);}catch(e){blocked=writeConflict(e);}
  assert(blocked,"A stale writer must fail");assert.equal(unseal((await readVault(name))!.bytes).toString(),"second");
  const fresh=await readVault(name);assert(fresh);
  const race=await Promise.allSettled([writeVault(name,seal(Buffer.from("A")),fresh.etag),writeVault(name,seal(Buffer.from("B")),fresh.etag)]);
  assert.equal(race.filter(x=>x.status==="fulfilled").length,1,"Only one concurrent writer can win");
  console.log("PASS private encrypted Blob read/write, stale-write rejection and concurrent CAS");
}finally{await deleteVault(name);}
