import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../../infrastructure/di/container";
import { jsonError, parseRequestBody, requireSession } from "../../../_utils";

function parseStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

export async function GET() {
  return NextResponse.json({ questions: await createContainer().interviewService.getQuestionTree() });
}

export async function POST(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    const session = await requireSession();
    const params = await context.params;
    const body = await parseRequestBody(request);
    const previousQuestions = parseStringArray(body.previousQuestions);
    const evidenceIds = parseStringArray(body.evidenceIds);
    const lifeRecordIds = parseStringArray(body.lifeRecordIds);
    const container = createContainer();
    const result = await container.interviewService.saveAnswer({
      caseId: params.caseId,
      answer: String(body.answer),
      previousQuestions,
      evidenceIds,
      lifeRecordIds,
      datetime: body.datetime ? String(body.datetime) : null,
      approximateTimeText: body.approximateTimeText ? String(body.approximateTimeText) : null,
      location: body.location ? String(body.location) : null,
      actor: body.actor ? String(body.actor) : null,
      action: body.action ? String(body.action) : null,
      damage: body.damage ? String(body.damage) : null,
    });

    await Promise.all(
      lifeRecordIds.map((recordId) =>
        container.lifeRecordService.link({
          recordId,
          userId: session.userId,
          caseId: params.caseId,
        }),
      ),
    );

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
