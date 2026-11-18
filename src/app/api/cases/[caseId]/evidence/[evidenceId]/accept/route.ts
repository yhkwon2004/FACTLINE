import { NextResponse, type NextRequest } from "next/server";
import {
  requireCaseAccess,
  parseRequestBody,
  jsonError,
} from "../../../../../_utils";
import { createContainer } from "../../../../../../../infrastructure/di/container";
import { readEncrypted } from "../../../../../../../infrastructure/storage/LocalEvidenceStorage";
import type { Inspection } from "../../../../../../../infrastructure/ai/local-worker";
export async function POST(
  r: NextRequest,
  c: { params: Promise<{ caseId: string; evidenceId: string }> },
) {
  try {
    const { caseId, evidenceId } = await c.params;
    const item = await requireCaseAccess(caseId, true);
    if (!item.evidences.some((x) => x.id === evidenceId))
      throw new Error("자료를 찾을 수 없습니다.");
    const body = await parseRequestBody(r);
    if (
      !Array.isArray(body.candidateIds) ||
      !body.candidateIds.length ||
      body.candidateIds.length > 90
    )
      throw new Error("연결할 문장을 선택해 주세요.");
    const stored = JSON.parse(
      (await readEncrypted(evidenceId + ".analysis")).toString("utf8"),
    ) as { analysis: Inspection };
    if (!stored.analysis) throw new Error("본문 분석이 끝난 후 선택해 주세요.");
    const candidates = stored.analysis.candidates.filter((x) =>
      body.candidateIds.includes(x.id),
    );
    if (candidates.length !== new Set(body.candidateIds).size)
      throw new Error("분석 결과의 문장만 연결할 수 있습니다.");
    let count = 0;
    for (const x of candidates) {
      if (
        item.events.some(
          (e) =>
            e.rawStatement === x.quote && e.evidenceIds.includes(evidenceId),
        )
      )
        continue;
      await createContainer().interviewService.saveAnswer({
        caseId,
        source: "EVIDENCE",
        isApproximateTime: x.isApproximateTime ?? true,
        answer: x.quote,
        evidenceIds: [evidenceId],
        datetime: x.datetime,
        approximateTimeText: x.approximateTimeText,
        location: x.location,
        actor: x.actor,
        action: x.action,
      });
      count++;
    }
    return NextResponse.json({ count });
  } catch (e) {
    return jsonError(e);
  }
}
