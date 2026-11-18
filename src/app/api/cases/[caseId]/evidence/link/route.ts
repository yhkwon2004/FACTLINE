import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../../../infrastructure/di/container";
import {
  jsonError,
  parseRequestBody,
  requireCaseAccess,
} from "../../../../_utils";
async function update(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
  unlink = false,
) {
  try {
    const { caseId } = await context.params;
    const c = await requireCaseAccess(caseId, true);
    const b = await parseRequestBody(request);
    if (
      !c.evidences.some((x) => x.id === b.evidenceId) ||
      !c.events.some((x) => x.id === b.eventId)
    )
      throw new Error("이 사건의 자료와 기록을 선택해 주세요.");
    const service = createContainer().evidenceService;
    if (unlink) await service.unlink(b.evidenceId, b.eventId);
    else await service.link(b.evidenceId, b.eventId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
export const POST = (
  r: NextRequest,
  c: { params: Promise<{ caseId: string }> },
) => update(r, c);
export const DELETE = (
  r: NextRequest,
  c: { params: Promise<{ caseId: string }> },
) => update(r, c, true);
