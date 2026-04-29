import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../infrastructure/di/container";
import { jsonError, parseRequestBody, requireSession } from "../_utils";
import type { LifeRecordType } from "../../../domain/types";

function parseTags(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string") return [];
  return value.split(",").map((tag) => tag.trim()).filter(Boolean);
}

export async function GET() {
  try {
    const session = await requireSession();
    const records = await createContainer().lifeRecordService.list(session.userId);
    return NextResponse.json({ records });
  } catch (error) {
    return jsonError(error, 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await parseRequestBody(request);
    const record = await createContainer().lifeRecordService.create({
      userId: session.userId,
      caseId: body.caseId ? String(body.caseId) : null,
      type: (body.type ? String(body.type) : "NOTE") as LifeRecordType,
      title: String(body.title),
      content: String(body.content),
      occurredAt: body.occurredAt ? String(body.occurredAt) : null,
      approximateTimeText: body.approximateTimeText ? String(body.approximateTimeText) : null,
      location: body.location ? String(body.location) : null,
      people: body.people ? String(body.people) : null,
      tags: parseTags(body.tags),
    });
    return NextResponse.json({ record });
  } catch (error) {
    return jsonError(error);
  }
}
