import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { timingSafeEqual, createHash } from "node:crypto";
import { localAI } from "../src/infrastructure/ai/local-worker";
process.loadEnvFile(".env.local");
process.env.FACTLINE_STORAGE_MODE = "local";
const config = JSON.parse(await readFile(".data/cloud-worker.json", "utf8"));
const secret = createHash("sha256")
  .update("Bearer " + config.token)
  .digest();
const tasks = new Set([
  "status",
  "extract",
  "inspect",
  "compare",
  "history",
  "legal",
  "structure",
  "chat",
  "draft",
  "search",
]);
const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  if (
    !timingSafeEqual(
      secret,
      createHash("sha256")
        .update(request.headers.authorization ?? "")
        .digest(),
    )
  ) {
    response.writeHead(401).end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }
  if (request.url === "/health" && request.method === "GET") {
    response.end(
      JSON.stringify({
        ready:
          existsSync("ai/models/cache") &&
          existsSync("ai/models/semantic_classifier.pkl"),
      }),
    );
    return;
  }
  if (request.url !== "/run" || request.method !== "POST") {
    response.writeHead(404).end("{}");
    return;
  }
  try {
    let size = 0;
    const parts: Buffer[] = [];
    for await (const part of request) {
      size += part.length;
      if (size > 29 * 1024 * 1024) throw new Error("Request too large");
      parts.push(part);
    }
    const body = JSON.parse(Buffer.concat(parts).toString());
    if (
      !tasks.has(body.task) ||
      !body.payload ||
      typeof body.payload !== "object" ||
      Array.isArray(body.payload)
    )
      throw new Error("Invalid task");
    const result = await localAI(body.task, body.payload);
    response.end(JSON.stringify({ result }));
  } catch (error) {
    response
      .writeHead(503)
      .end(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Analysis failed",
        }),
      );
  }
});
server.requestTimeout = 250000;
server.listen(8766, "127.0.0.1", () =>
  console.log("Private AI bridge ready on 127.0.0.1:8766"),
);
