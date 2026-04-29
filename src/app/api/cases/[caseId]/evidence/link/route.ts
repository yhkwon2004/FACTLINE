import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../../../infrastructure/di/container";
import { jsonError, parseRequestBody, requireSession } from "../../../../_utils";

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await parseRequestBody(request);
    await createContainer().evidenceService.link(String(body.evidenceId), String(body.eventId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireSession();
    const body = await parseRequestBody(request);
    await createContainer().evidenceService.unlink(String(body.evidenceId), String(body.eventId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

