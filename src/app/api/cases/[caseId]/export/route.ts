import { type NextRequest } from "next/server";
import { requireCaseAccess, jsonError } from "../../../_utils";
import { createContainer } from "../../../../../infrastructure/di/container";
export async function GET(
  _r: NextRequest,
  c: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await c.params;
    const item = await requireCaseAccess(caseId);
    const report = await createContainer().reportService.get(caseId);
    const { userId: _, ...data } = item;
    const payload = {
      format: "EUMLOG-1",
      exportedAt: new Date().toISOString(),
      case: data,
      report: report?.content ?? null,
      notice:
        "AI 분류·생성 결과는 확인이 필요합니다. 파일 해시는 저장 이후 변경 여부만 확인합니다.",
    };
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json;charset=utf-8",
        "content-disposition": "attachment; filename=EUMLOG-case.json",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
