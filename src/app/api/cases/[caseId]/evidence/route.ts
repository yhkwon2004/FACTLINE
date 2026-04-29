import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../../infrastructure/di/container";
import { jsonError, parseRequestBody, requireSession } from "../../../_utils";

export async function GET(_request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    await requireSession();
    const params = await context.params;
    const evidence = await createContainer().evidenceService.list(params.caseId);
    return NextResponse.json({ evidence });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  try {
    await requireSession();
    const params = await context.params;
    const body = await parseRequestBody(request);
    const evidence = await createContainer().evidenceService.upload({
      caseId: params.caseId,
      name: String(body.name),
      type: String(body.type ?? "application/octet-stream"),
      content: body.content ? String(body.content) : undefined,
      fileHash: body.fileHash ? String(body.fileHash) : null,
      description: body.description ? String(body.description) : null,
    });
    return NextResponse.json({ evidence });
  } catch (error) {
    return jsonError(error);
  }
}
