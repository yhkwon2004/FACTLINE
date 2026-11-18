import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../infrastructure/di/container";
import {
  jsonError,
  parseRequestBody,
  redirectToPath,
  requireSession,
} from "../_utils";
import type { IncidentType } from "../../../domain/types";

export async function GET() {
  try {
    const session = await requireSession();
    const cases = await createContainer().caseService.list(session.userId);
    return NextResponse.json({ cases });
  } catch (error) {
    return jsonError(error, 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await parseRequestBody(request);
    if (
      typeof body.title !== "string" ||
      body.title.trim().length < 2 ||
      body.title.length > 120
    )
      throw new Error("사건 이름은 2~120자로 입력해 주세요.");
    if (
      !["FRAUD", "VIOLENCE", "DEFAMATION", "WORK", "OTHER"].includes(
        String(body.type),
      )
    )
      throw new Error("사건 유형을 선택해 주세요.");
    const caseData = await createContainer().caseService.create({
      userId: session.userId,
      title: String(body.title),
      type: String(body.type) as IncidentType,
      description: body.description ? String(body.description) : null,
    });

    const acceptsJson = request.headers
      .get("accept")
      ?.includes("application/json");
    return acceptsJson
      ? NextResponse.json({ case: caseData })
      : redirectToPath(request, `/cases/${caseData.id}/interview`);
  } catch (error) {
    return jsonError(error);
  }
}
