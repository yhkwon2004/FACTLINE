import { get, del } from "@vercel/blob";
import { after, NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../../infrastructure/di/container";
import {
  jsonError,
  parseRequestBody,
  requireCaseAccess,
  requireSession,
} from "../../../_utils";
import {
  queueEvidence,
  analyzeEvidence,
} from "../../../../../infrastructure/ai/evidence-pipeline";
export const maxDuration = 300;
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await context.params;
    const item = await requireCaseAccess(caseId);
    return NextResponse.json({ evidence: item.evidences });
  } catch (e) {
    return jsonError(e);
  }
}
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await context.params;
    await requireCaseAccess(caseId, true);
    if (Number(request.headers.get("content-length") ?? 0) > 21 * 1024 * 1024)
      throw new Error("20MB 이하 파일을 올려 주세요.");
    const body = await parseRequestBody(request);
    const referenceDate=body.recordingDate?String(body.recordingDate):undefined;
    if(referenceDate && (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)||Number.isNaN(Date.parse(referenceDate))||new Date(referenceDate).toISOString().slice(0,10)!==referenceDate))throw new Error("녹음 기준일을 확인해 주세요.");

    const file = body.file instanceof File ? body.file : null;
    if (file && (file.size > 20 * 1024 * 1024 || file.size === 0))
      throw new Error("파일은 1바이트 이상, 20MB 이하여야 합니다.");
    const name = String(body.name || file?.name || "").trim();
    if (!name || name.length > 240)
      throw new Error("자료 이름은 1~240자로 입력해 주세요.");
    let pending: string | undefined;
    let directBytes: Buffer | undefined;
    if (body.pathname) {
      const session = await requireSession();
      const prefix = "pending/" + session.userId + "/" + caseId + "/";
      pending = String(body.pathname);
      if (
        !pending.startsWith(prefix) ||
        !/^[a-f0-9-]{36}\/[a-zA-Z0-9._-]{1,100}$/.test(
          pending.slice(prefix.length),
        )
      )
        throw new Error("잘못된 업로드 경로입니다.");
      const blob = await get(pending, {
        access: "private",
        useCache: false,
        headers: { "accept-encoding": "identity" },
        abortSignal: AbortSignal.timeout(30000),
      });
      if (!blob || blob.statusCode !== 200 || blob.blob.size > 20 * 1024 * 1024)
        throw new Error("파일은 1바이트 이상, 20MB 이하여야 합니다.");
      directBytes = Buffer.from(await new Response(blob.stream).arrayBuffer());
      if (!directBytes.length || directBytes.length > 20 * 1024 * 1024)
        throw new Error("파일은 1바이트 이상, 20MB 이하여야 합니다.");
    }
    const content = directBytes
      ? directBytes.toString("base64")
      : file
        ? Buffer.from(await file.arrayBuffer()).toString("base64")
        : String(body.content ?? body.description ?? "");
    if (!content) throw new Error("파일이나 메모를 추가해 주세요.");
    const evidence = await createContainer().evidenceService.upload({
      caseId,
      name: file?.name || name,
      type:
        file?.type ||
        (directBytes
          ? String(body.type || "application/octet-stream").slice(0, 160)
          : "text/plain"),
      content,
      encoding: file || directBytes ? "base64" : undefined,
      description: String(body.description ?? "").slice(0, 10000),
    });
    if (pending)
      await del(pending).catch(() =>
        console.error("Pending evidence cleanup failed"),
      );
    await queueEvidence(evidence,referenceDate);
    after(async () => {
      await analyzeEvidence(evidence);
    });
    return NextResponse.json({ evidence });
  } catch (e) {
    return jsonError(e);
  }
}
