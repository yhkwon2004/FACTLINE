import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { requireSession, parseRequestBody, jsonError } from "../../_utils";
import {
  legacySnapshot,
  LocalJsonUserRepository,
} from "../../../../infrastructure/repositories/local-json-repositories";
import { readEncrypted } from "../../../../infrastructure/storage/LocalEvidenceStorage";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  try {
    const user = await requireSession(),
      snapshot = await legacySnapshot(user.userId),
      key = request.nextUrl.searchParams.get("file");
    if (key) {
      if (!snapshot.fileIds.includes(key))
        throw Error("허용하지 않는 자료입니다.");
      return new Response(await readEncrypted(key), {
        headers: {
          "content-type": "application/octet-stream",
          "cache-control": "no-store, private",
        },
      });
    }
    const files = [];
    for (const key of snapshot.fileIds) {
      try {
        const bytes = await readEncrypted(key);
        files.push({
          key,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          size: bytes.length,
        });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
    }
    return NextResponse.json(
      { ...snapshot, files },
      { headers: { "cache-control": "no-store, private" } },
    );
  } catch (e) {
    return jsonError(e);
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireSession(),
      body = await parseRequestBody(request);
    if (
      body.confirm !== "DELETE_SERVER_COPY" ||
      !/^[a-f0-9]{64}$/.test(body.digest)
    )
      throw Error("기기 저장과 백업을 확인해 주세요.");
    await new LocalJsonUserRepository().delete(user.userId, true, body.digest);
    return NextResponse.json(
      { ok: true },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return jsonError(e, 409);
  }
}
