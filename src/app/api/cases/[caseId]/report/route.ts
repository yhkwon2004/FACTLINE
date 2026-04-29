import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../../infrastructure/di/container";
import { jsonError, requireSession } from "../../../_utils";

export async function GET(_request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    await requireSession();
    const params = await context.params;
    const report = await createContainer().reportService.get(params.caseId);
    return NextResponse.json({ report });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(_request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    await requireSession();
    const params = await context.params;
    const report = await createContainer().reportService.generate(params.caseId);
    return NextResponse.json({ report });
  } catch (error) {
    return jsonError(error);
  }
}
