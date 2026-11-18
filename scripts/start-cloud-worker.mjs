import { spawn, execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
process.chdir(path.resolve(import.meta.dirname, ".."));
const config = JSON.parse(await readFile(".data/cloud-worker.json", "utf8"));
const lock = createServer((_, r) => r.end("EUMLOG AI worker running"));
lock.on("error", () => {
  console.log("EUMLOG AI worker is already running.");
  process.exit(0);
});
await new Promise((resolve) => lock.listen(8767, "127.0.0.1", resolve));
await mkdir(".data", { recursive: true });
const log = createWriteStream(".data/cloud-worker.log", { flags: "a" });
const report = (message) => {
  const line = new Date().toISOString() + " " + message;
  console.log(line);
  log.write(line + "\n");
};
let bridge,
  tunnel,
  stopping = false,
  connectTimer;
function startBridge() {
  bridge = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/ai-bridge.ts"],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  bridge.stdout.on("data", (x) => log.write(x));
  bridge.stderr.on("data", (x) => log.write(x));
  bridge.on("exit", () => {
    if (!stopping) {
      report("AI bridge restarting");
      setTimeout(startBridge, 3000);
    }
  });
}
const cloudflared =
  config.cloudflared ||
  execFileSync("where.exe", ["cloudflared"], {
    windowsHide: true,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)[0];
async function register(endpoint) {
  if (stopping) return;
  try {
    const response = await fetch(config.origin + "/api/worker/connect", {
      method: "POST",
      headers: {
        authorization: "Bearer " + config.token,
        "content-type": "application/json",
      },
      body: JSON.stringify({ endpoint }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    report("Cloud analysis connection ready");
    await writeFile(
      ".data/cloud-worker-status.json",
      JSON.stringify({
        connectedAt: new Date().toISOString(),
        origin: config.origin,
        endpoint,
      }),
    );
  } catch (error) {
    report("Cloud registration waiting: " + error.message);
    connectTimer = setTimeout(() => register(endpoint), 10000);
  }
}
function startTunnel() {
  let endpoint = "",
    buffer = "";
  tunnel = spawn(
    cloudflared,
    [
      "tunnel",
      "--url",
      "http://127.0.0.1:8766",
      "--no-autoupdate",
      "--protocol",
      "http2",
    ],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  const output = (x) => {
    const text = x.toString();
    log.write(text);
    buffer = (buffer + text).slice(-6000);
    const match = buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match && !endpoint) {
      endpoint = match[0];
      report("Private tunnel created");
      register(endpoint);
    }
  };
  tunnel.stdout.on("data", output);
  tunnel.stderr.on("data", output);
  tunnel.on("exit", () => {
    clearTimeout(connectTimer);
    if (!stopping) {
      report("Tunnel restarting");
      setTimeout(startTunnel, 4000);
    }
  });
}
startBridge();
startTunnel();
function stop() {
  stopping = true;
  clearTimeout(connectTimer);
  bridge?.kill();
  tunnel?.kill();
  lock.close();
  log.end();
  process.exit();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
