import {byteRange} from "../../../../../../infrastructure/storage/byte-range";
import { analyzeEvidence } from "../../../../../../infrastructure/ai/evidence-pipeline";
export const maxDuration=300;
import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import {
  localAI,
  type Inspection,
} from "../../../../../../infrastructure/ai/local-worker";
import {
  readEncrypted,
  saveEncrypted,
} from "../../../../../../infrastructure/storage/LocalEvidenceStorage";
import { requireCaseAccess, jsonError } from "../../../../_utils";
type Context = { params: Promise<{ caseId: string; evidenceId: string }> };
async function getEvidence(context: Context, write = false) {
  const { caseId, evidenceId } = await context.params;
  const c = await requireCaseAccess(caseId, write);
  const e = c.evidences.find((x) => x.id === evidenceId);
  if (!e || !e.fileUrl?.startsWith("local://"))
    throw new Error(
      "원본 파일이 없습니다. 기존 메타데이터 자료는 다시 올려 주세요.",
    );
  return { e, fileId: e.fileUrl.slice(8) };
}
export async function GET(request: NextRequest, context: Context) {
  try {
    const { e, fileId } = await getEvidence(context);
    if (request.nextUrl.searchParams.has("analysis")) {
      try {
        return NextResponse.json(
          JSON.parse(
            (await readEncrypted(e.id + ".analysis")).toString("utf8"),
          ),
        );
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT")
          return NextResponse.json({ analysis: null });
        throw err;
      }
    }
    const bytes = await readEncrypted(fileId);
    if (createHash("sha256").update(bytes).digest("hex") !== e.fileHash)
      throw new Error("파일 무결성 확인에 실패했습니다.");
    const preview = request.nextUrl.searchParams.has("preview");
    const imageType = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : bytes[0] === 255 && bytes[1] === 216
        ? "image/jpeg"
        : bytes.subarray(0, 4).toString() === "RIFF" &&
            bytes.subarray(8, 12).toString() === "WEBP"
          ? "image/webp"
          : null;
    const audioType: Record<string, string> = {
      wav: "audio/wav",
      mp3: "audio/mpeg",
      flac: "audio/flac",
      ogg: "audio/ogg",m4a:"audio/mp4",mp4:"audio/mp4",aac:"audio/aac",webm:"audio/webm",opus:"audio/ogg","3gp":"audio/3gpp",
    };
    const mime = preview
      ? (imageType ??
        audioType[e.name.split(".").at(-1)?.toLowerCase() ?? ""] ??
        "application/octet-stream")
      : "application/octet-stream";
    const range=byteRange(request.headers.get("range"),bytes.length);
    if(range==="invalid")return new Response(null,{status:416,headers:{"content-range":"bytes */"+bytes.length,"cache-control":"no-store"}});
    const payload=range?bytes.subarray(range.start,range.end+1):bytes;
    return new Response(new Uint8Array(payload), {
      status:range?206:200,
      headers: {
        "content-type": mime,
        "accept-ranges":"bytes",
        ...(range?{"content-range":`bytes ${range.start}-${range.end}/${bytes.length}`,"content-length":String(payload.length)}:{}),
        "content-disposition":
          (preview && mime !== "application/octet-stream"
            ? "inline"
            : "attachment") +
          "; filename*=UTF-8''" +
          encodeURIComponent(e.name),
        "x-content-type-options": "nosniff",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
export async function POST(_request: NextRequest, context: Context) {
  try {
    const {e}=await getEvidence(context,true);
    const result=await analyzeEvidence(e,true);
    return NextResponse.json(result, {status: result.phase==="error"?422:200});
  } catch (e) {
    return jsonError(e);
  }
}
