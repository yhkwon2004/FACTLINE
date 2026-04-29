import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../../infrastructure/di/container";
import { jsonError, requireSession } from "../../../_utils";

export async function POST(_request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    await requireSession();
    const params = await context.params;
    await createContainer().caseService.lock(params.caseId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
