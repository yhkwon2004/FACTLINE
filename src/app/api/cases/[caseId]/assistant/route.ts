import { NextResponse, type NextRequest } from "next/server";
import {
  requireCaseAccess,
  jsonError,
  parseRequestBody,
} from "../../../_utils";
import { readEncrypted } from "../../../../../infrastructure/storage/LocalEvidenceStorage";
import { localAI } from "../../../../../infrastructure/ai/local-worker";
export const maxDuration=300;
export async function POST(
  r: NextRequest,
  c: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await c.params;
    const item = await requireCaseAccess(caseId);
    const body = await parseRequestBody(r);
    if (
      typeof body.question !== "string" ||
      !body.question.trim() ||
      body.question.length > 1800
    )
      throw new Error("질문은 1~1800자로 입력해 주세요.");
    const context = [
      item.title,
      item.description,
      ...item.events.map((x) => x.rawStatement),
    ]
      .filter(Boolean)
      .join("\n");
    const documents: Array<{ name: string; text: string }> = [];
    for (const e of item.evidences) {
      try {
        const stored = JSON.parse(
          (await readEncrypted(e.id + ".analysis")).toString("utf8"),
        );
        if (stored.analysis?.text) documents.push({ name: e.name, text: stored.analysis.text });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    return NextResponse.json(
      await localAI("chat", { question: body.question, context, documents }),
    );
  } catch (e) {
    return jsonError(e);
  }
}
