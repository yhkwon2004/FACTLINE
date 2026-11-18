import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../../infrastructure/di/container";
import { requireCaseAccess, jsonError, requireSession } from "../../../_utils";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    await requireSession();
    const params = await context.params;
    await requireCaseAccess(params.caseId);
    await createContainer().caseService.lock(params.caseId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await context.params;
    await requireCaseAccess(caseId);
    await createContainer().caseService.unlock(caseId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
