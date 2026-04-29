import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../../infrastructure/di/container";
import { jsonError, requireSession } from "../../../_utils";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const searchParams = request.nextUrl.searchParams;
    const references = await createContainer().legalReferenceService.retrieve({
      query: searchParams.get("q") ?? "",
      incidentType: searchParams.get("type") ?? undefined,
    });
    return NextResponse.json({ references });
  } catch (error) {
    return jsonError(error);
  }
}

