import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../../infrastructure/di/container";
import { jsonError, parseRequestBody, requireSession } from "../../../_utils";

export async function POST(request: NextRequest, context: { params: Promise<{ recordId: string }> }) {
  try {
    const session = await requireSession();
    const { recordId } = await context.params;
    const body = await parseRequestBody(request);
    const record = await createContainer().lifeRecordService.link({
      recordId,
      userId: session.userId,
      caseId: body.caseId ? String(body.caseId) : null,
    });
    return NextResponse.json({ record });
  } catch (error) {
    return jsonError(error);
  }
}
