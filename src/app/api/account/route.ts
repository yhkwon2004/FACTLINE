import { NextResponse } from "next/server";
import { createContainer } from "../../../infrastructure/di/container";
import { jsonError, requireSession } from "../_utils";

export async function DELETE() {
  try {
    const session = await requireSession();
    await createContainer().securityAuditService.deleteAccount(session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, 401);
  }
}

