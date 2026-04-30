import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../infrastructure/di/container";
import { jsonError, parseRequestBody, requireSession } from "../../_utils";
import { parseIntegrationProvider } from "../_providers";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await parseRequestBody(request);
    const rawText = String(body.rawText ?? "").trim();
    if (!rawText) throw new Error("가져올 원문을 입력해 주세요.");

    const result = await createContainer().memoryIntegrationService.importText({
      userId: session.userId,
      provider: parseIntegrationProvider(body.provider),
      sourceName: body.sourceName ? String(body.sourceName) : null,
      rawText,
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
