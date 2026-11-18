import { createHash, timingSafeEqual } from "node:crypto";
import { readVault, writeVault } from "../storage/PrivateVault";
import { seal, unseal } from "../storage/LocalEvidenceStorage";
export function workerAuthorized(header: string | null) {
  const secret = process.env.AI_WORKER_TOKEN;
  return (
    !!secret &&
    timingSafeEqual(
      createHash("sha256")
        .update(header ?? "")
        .digest(),
      createHash("sha256")
        .update("Bearer " + secret)
        .digest(),
    )
  );
}
export function workerUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.trycloudflare\.com$/.test(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("허용되지 않은 분석기 주소입니다.");
  return url.origin;
}
export async function connectWorker(endpoint: string) {
  const origin = workerUrl(endpoint);
  const health = await fetch(origin + "/health", {
    headers: { authorization: "Bearer " + process.env.AI_WORKER_TOKEN },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!health.ok || !(await health.json()).ready)
    throw new Error("분석기 연결을 확인할 수 없습니다.");
  await writeVault(
    "system/worker.bin",
    seal(
      Buffer.from(
        JSON.stringify({
          endpoint: origin,
          connectedAt: new Date().toISOString(),
        }),
      ),
    ),
  );
}
export async function remoteAI<T>(task: string, payload: unknown): Promise<T> {
  const record = await readVault("system/worker.bin");
  if (!record || !process.env.AI_WORKER_TOKEN)
    throw new Error(
      "분석기가 오프라인입니다. PC의 분석기를 켜면 이어서 처리합니다.",
    );
  const endpoint = workerUrl(
    JSON.parse(unseal(record.bytes).toString()).endpoint,
  );
  let response: Response;
  try {
    response = await fetch(endpoint + "/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + process.env.AI_WORKER_TOKEN,
      },
      body: JSON.stringify({ task, payload }),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(240000),
    });
  } catch {
    throw new Error(
      "분석기에 연결할 수 없습니다. 원본은 보관되어 있으며 연결 후 재시도합니다.",
    );
  }
  if (!response.ok)
    throw new Error("분석기에 연결할 수 없습니다. 연결 후 다시 시도합니다.");
  const data = await response.json();
  if (data.error) throw new Error(data.error || "분석기가 응답하지 않습니다.");
  return data.result as T;
}
