import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../infrastructure/di/container";
import { jsonError, parseRequestBody, requireSession } from "../../_utils";

export async function GET(_request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    const session = await requireSession();
    const params = await context.params;
    const caseData = await createContainer().caseService.get(params.caseId);
    if (caseData.userId !== session.userId) throw new Error("사건을 찾을 수 없습니다.");
    return NextResponse.json({ case: caseData });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    const session = await requireSession();
    const params = await context.params;
    const body = await parseRequestBody(request);
    const caseData = await createContainer().caseService.rename({
      caseId: params.caseId,
      userId: session.userId,
      title: String(body.title ?? ""),
    });
    return NextResponse.json({ case: caseData });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    const session = await requireSession();
    const params = await context.params;
    await createContainer().caseService.deleteForUser({ caseId: params.caseId, userId: session.userId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
