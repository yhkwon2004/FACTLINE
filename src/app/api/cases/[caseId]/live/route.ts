import {relationshipGraph} from "../../../../../domain/services/RelationshipGraph";
import { after, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { requireCaseAccess, jsonError } from "../../../_utils";
import {
  evidenceProgress,
  needsAnalysis,
  analyzeEvidence,
} from "../../../../../infrastructure/ai/evidence-pipeline";
import { evidenceGraph } from "../../../../../domain/services/EvidenceGraph";
export const maxDuration = 300;
export async function GET(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await context.params;
    const item = await requireCaseAccess(caseId);
    const files = await Promise.all(
      [...item.evidences].sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime()).map(async (e) => ({
        ...e,
        ...(await evidenceProgress(e.id)),
      })),
    );
    const waiting = files.find((x) => needsAnalysis(x));
    if (waiting && !item.isLocked)
      after(async () => {
        await analyzeEvidence(item.evidences.find((x) => x.id === waiting.id)!);
      });
    const graph = evidenceGraph(files, item.events);
    const data = {
      items: files.map(
        ({ analysis, extraction, matches, lease, ...file }) => file,
      ),
      graph,
      relationships:relationshipGraph(files,item.events),
    };
    const etag =
      '"' +
      createHash("sha256").update(JSON.stringify(data)).digest("hex") +
      '"';
    const headers = {
      etag,
      "cache-control": "private, no-cache, no-store",
      vary: "Cookie",
    };
    if (request.headers.get("if-none-match") === etag)
      return new Response(null, { status: 304, headers });
    return NextResponse.json(data, { headers });
  } catch (error) {
    return jsonError(error);
  }
}
