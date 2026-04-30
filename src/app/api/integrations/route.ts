import { NextResponse } from "next/server";
import { createContainer } from "../../../infrastructure/di/container";
import { jsonError, requireSession } from "../_utils";

export async function GET() {
  try {
    const session = await requireSession();
    const data = await createContainer().memoryIntegrationService.list(session.userId);
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error, 401);
  }
}
