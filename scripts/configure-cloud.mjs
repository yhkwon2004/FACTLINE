import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
const cli=path.join(process.env.APPDATA,"npm/node_modules/vercel/dist/index.js");
const values=JSON.parse(await readFile(".data/cloud-env.json","utf8"));
for(const [name,value] of Object.entries(values)) {
  const code=await new Promise(resolve=>{
    const child=spawn(process.execPath,[cli,"env","add",name,"production","--sensitive","--yes","--scope","yhkwon2004s-projects"],{windowsHide:true,stdio:["pipe","pipe","pipe"]});
    let output=""; child.stdout.on("data",x=>output+=x); child.stderr.on("data",x=>output+=x);
    child.stdin.end(value); child.on("exit",code=>{console.log(name+": "+(code===0?"configured":"failed"));if(code) console.error(Object.values(values).reduce((s,secret)=>s.replaceAll(secret,"[redacted]"),output));resolve(code);});
  });
  if(code) process.exit(code);
}
