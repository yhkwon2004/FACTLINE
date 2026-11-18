import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../../infrastructure/di/container";
import {
  localAI,
  type Inspection,
} from "../../../../../infrastructure/ai/local-worker";
import {
  readEncrypted,
  saveEncrypted,
} from "../../../../../infrastructure/storage/LocalEvidenceStorage";
import { requireCaseAccess, jsonError } from "../../../_utils";
type Context = { params: Promise<{ caseId: string }> };
export async function GET(_r: NextRequest, c: Context) {
  try {
    const { caseId } = await c.params;
    await requireCaseAccess(caseId);
    try {
      return NextResponse.json(
        JSON.parse(
          (await readEncrypted(caseId + ".analysis")).toString("utf8"),
        ),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT")
        return NextResponse.json({ local: null });
      throw e;
    }
  } catch (e) {
    return jsonError(e);
  }
}
export const maxDuration=300;
export async function POST(_r: NextRequest, c: Context) {
  try {
    const { caseId } = await c.params;
    const item = await requireCaseAccess(caseId, true);
    const documents: Array<{ id: string; name: string; text: string }> = [];
    for (const e of item.evidences) {
      try {
        const stored = JSON.parse(
          (await readEncrypted(e.id + ".analysis")).toString("utf8"),
        ) as { analysis: Inspection };
        if (stored.analysis?.text) documents.push({ id: e.id, name: e.name, text: stored.analysis.text });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    documents.push(
      ...item.events.map((e) => ({
        id: e.id,
        name: e.title,
        text: e.rawStatement,
      })),
    );
    if (!documents.length)
      throw new Error("증거 본문을 분석하거나 기록을 먼저 남겨 주세요.");
    if (documents.length > 60)
      throw new Error("한 번에 60개 자료까지 분석할 수 있습니다.");
    const local = await localAI("compare", { documents });
    const analysis = await createContainer().analysisService.analyze(caseId);
    const text=documents.map(d=>d.text).join("\n").slice(0,60000);
    const legal=await localAI("legal",{text});
    const service=createContainer().caseService;
    const previous=(await service.list(item.userId)).filter(c=>c.id!==caseId&&!c.isLocked).slice(0,30);
    const historical=[];
    for(const row of previous){const full=await service.get(row.id);historical.push({id:full.id,name:full.title,text:[full.description,...full.events.map(e=>e.rawStatement)].filter(Boolean).join("\n").slice(0,3000)});}
    const history=await localAI("history",{query:text,documents:historical.filter(d=>d.text)});
    const result = {
      analysis,
      local,
      legal,
      history,
      analyzedAt: new Date().toISOString(),
      documentCount: documents.length,
    };
    await saveEncrypted(
      caseId + ".analysis",
      Buffer.from(JSON.stringify(result)),
    );
    return NextResponse.json(result);
  } catch (e) {
    return jsonError(e);
  }
}
