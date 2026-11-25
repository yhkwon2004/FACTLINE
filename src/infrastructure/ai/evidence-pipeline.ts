import {localPrivacy} from "../security/AccountPrivacy";
import { createHash, randomUUID } from "node:crypto";
import { createContainer } from "../di/container";
import {
  readEncrypted,
  updateEncrypted,
} from "../storage/LocalEvidenceStorage";
import { localAI, type Inspection } from "./local-worker";
import type { Evidence } from "../../domain/entities";
export type Match = {
  source: string;
  target: string;
  sourceName: string;
  targetName: string;
  score: number;
  shared: string[];
};
export type EvidenceProgress = {
  analysis: Inspection | null;
  referenceDate?:string;
  phase: "queued" | "extracting" | "linking" | "ready" | "waiting" | "error";
  updatedAt: string;
  analyzedAt?: string;
  lease?: string;
  leaseUntil?: number;
  retryAt?: number;
  error?: string;
  extraction?: { text: string; method: string; warnings: string[];segments?:Array<{start:number;end:number;text:string;approximate?:boolean}>;duration?:number };
  matches?: Match[];
};
const initial = (): EvidenceProgress => ({
  analysis: null,
  phase: "queued",
  updatedAt: new Date().toISOString(),
});
export async function evidenceProgress(id: string): Promise<EvidenceProgress> {
  try {
    const value = JSON.parse(
      (await readEncrypted(id + ".analysis")).toString(),
    );
    return {
      ...value,
      phase: value.phase ?? (value.analysis ? "ready" : "queued"),
      updatedAt: value.updatedAt ?? value.analyzedAt,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return initial();
    throw error;
  }
}
export async function queueEvidence(e: Evidence,referenceDate?:string) {
  await updateEncrypted<EvidenceProgress>(
    e.id + ".analysis",
    initial(),
    (x) => ({...x,...(referenceDate?{referenceDate}:{})}),
  );
}
export function needsAnalysis(p: EvidenceProgress) {
  return (
    ((p.phase === "ready" && p.analysis?.schemaVersion!==2) || p.phase === "queued" ||
      p.phase === "waiting" ||
      p.phase === "extracting" ||
      p.phase === "linking") &&
    (!p.retryAt || p.retryAt <= Date.now()) &&
    (!p.leaseUntil || p.leaseUntil < Date.now())
  );
}
export async function analyzeEvidence(
  e: Evidence,
  force = false,
): Promise<EvidenceProgress> {
  if(localPrivacy())throw Error("이전 원본의 서버 분석을 중단했습니다. 기기 보관함으로 가져와 주세요.");
  const lease = randomUUID();
  let job:EvidenceProgress;
  try {
    job=await updateEncrypted<EvidenceProgress>(
      e.id + ".analysis",
      initial(),
      (p) => {
        if (
          (p.analysis?.schemaVersion===2 && (!p.phase || p.phase === "ready") && !force) ||
          (p.leaseUntil && p.leaseUntil > Date.now())
        )
          throw Object.assign(
            new Error("Analysis already exists or is running"),
            { code: "BUSY" },
          );
        return {
          ...p,
          phase: "extracting",
          error: undefined,
          retryAt: undefined,
          lease,
          leaseUntil: Date.now() + 280000,
          updatedAt: new Date().toISOString(),
        };
      },
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "BUSY")
      return evidenceProgress(e.id);
    throw error;
  }
  async function progress(patch: Partial<EvidenceProgress>) {
    const item = await createContainer().caseService.get(e.caseId);
    if (!item.evidences.some((x) => x.id === e.id))
      throw new Error("자료가 삭제되었습니다.");
    return updateEncrypted<EvidenceProgress>(
      e.id + ".analysis",
      initial(),
      (p) => {
        if (p.lease !== lease) throw new Error("분석 작업이 갱신되었습니다.");
        return { ...p, ...patch, updatedAt: new Date().toISOString() };
      },
    );
  }
  try {
    if (!e.fileUrl?.startsWith("local://"))
      throw new Error("원본 파일이 없습니다.");
    const bytes = await readEncrypted(e.fileUrl.slice(8));
    if (createHash("sha256").update(bytes).digest("hex") !== e.fileHash)
      throw new Error("파일 무결성 확인에 실패했습니다.");
    const extraction = await localAI<
      NonNullable<EvidenceProgress["extraction"]>
    >("extract", {
      content: bytes.toString("base64"),
      name: e.name,
      type: e.type,
    });
    if (!extraction.text.trim())
      throw new Error(
        extraction.warnings.join(" ") || "본문을 찾을 수 없습니다.",
      );
    const analysis = await localAI<Inspection>("inspect", {
      text: extraction.text,
      referenceDate:job.referenceDate,
      segments:extraction.segments,
    });
    await progress({ analysis, extraction, phase: "linking" });
    const item = await createContainer().caseService.get(e.caseId);
    const documents = [{ id: e.id, name: e.name, text: analysis.text }];
    for (const other of item.evidences
      .filter((x) => x.id !== e.id)
      .slice(0, 59)) {
      const p = await evidenceProgress(other.id);
      if (p.analysis)
        documents.push({
          id: other.id,
          name: other.name,
          text: p.analysis.text,
        });
    }
    let matches: Match[] = [];
    if (documents.length > 1)
      matches = (
        await localAI<{ matches: Match[] }>("compare", { documents })
      ).matches.filter((x) => x.source === e.id || x.target === e.id);
    return await progress({
      phase: "ready",
      matches,
      analyzedAt: new Date().toISOString(),
      leaseUntil: 0,
      lease: undefined,
      error: undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "분석에 실패했습니다.";
    const waiting =
      /연결|오프라인|다른 자료|시간.*초과|응답|503|502|fetch/i.test(message);
    try {
      return await progress({
        phase: waiting ? "waiting" : "error",
        error: message,
        retryAt: waiting ? Date.now() + 30000 : undefined,
        leaseUntil: 0,
        lease: undefined,
      });
    } catch {
      return { ...initial(), phase: "error", error: message };
    }
  }
}
