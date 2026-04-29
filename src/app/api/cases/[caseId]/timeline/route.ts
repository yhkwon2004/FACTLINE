import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../../infrastructure/di/container";
import { jsonError, requireSession } from "../../../_utils";

export async function GET(_request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    await requireSession();
    const params = await context.params;
    const timeline = await createContainer().timelineService.generate(params.caseId);
    return NextResponse.json({ timeline });
  } catch (error) {
    return jsonError(error);
  }
}
