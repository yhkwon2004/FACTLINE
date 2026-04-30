import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../infrastructure/di/container";
import { jsonError, parseRequestBody, requireSession } from "../../_utils";
import { parseIntegrationProvider, parseStringArray } from "../_providers";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await parseRequestBody(request);
    const source = await createContainer().memoryIntegrationService.connect({
      userId: session.userId,
      provider: parseIntegrationProvider(body.provider),
      displayName: body.displayName ? String(body.displayName) : undefined,
      consentScopes: parseStringArray(body.consentScopes),
    });
    return NextResponse.json({ source });
  } catch (error) {
    return jsonError(error);
  }
}
