import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {
  requireCaseAccess,
  requireSession,
  parseRequestBody,
  jsonError,
} from "../../../_utils";
export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await context.params;
    const body = (await parseRequestBody(
      request as import("next/server").NextRequest,
    )) as HandleUploadBody;
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const session = await requireSession();
        await requireCaseAccess(caseId, true);
        const prefix = "pending/" + session.userId + "/" + caseId + "/";
        if (
          !pathname.startsWith(prefix) ||
          !/^[a-f0-9-]{36}\/[a-zA-Z0-9._-]{1,100}$/.test(
            pathname.slice(prefix.length),
          )
        )
          throw new Error("잘못된 업로드 경로입니다.");
        return {
          maximumSizeInBytes: 20 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: false,
          validUntil: Date.now() + 600000,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
