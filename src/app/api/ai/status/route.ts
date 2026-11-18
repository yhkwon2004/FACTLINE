import { NextResponse } from "next/server";
import { requireSession, jsonError } from "../../_utils";
import { localAI } from "../../../../infrastructure/ai/local-worker";
export async function GET() {
  try {
    await requireSession();
    return NextResponse.json(await localAI("status"));
  } catch (e) {
    return jsonError(e);
  }
}
