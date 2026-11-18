import { NextResponse } from "next/server";
import { createContainer } from "../../../infrastructure/di/container";
import { jsonError, requireSession, SESSION_COOKIE } from "../_utils";

export async function DELETE() {
  try {
    const session = await requireSession();
    await createContainer().securityAuditService.deleteAccount(session.userId);
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  } catch (error) {
    return jsonError(error, 401);
  }
}
