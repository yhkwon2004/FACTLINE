import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { parseRequestBody, requireSession, jsonError } from "../../_utils";
import { localAI } from "../../../../infrastructure/ai/local-worker";
import {
  residualIdentifiers,
  consentPayload,
} from "../../../../domain/services/PrivateData";
export const maxDuration = 300;
const schema = z
  .object({
    task: z.enum(["inspect", "chat", "legal"]),
    anonymousText: z.string().min(1).max(20000),
    question: z.string().max(1000).optional(),
    consent: z.literal(true),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    referenceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();
export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const input = schema.parse(await parseRequestBody(request));
    if (
      createHash("sha256")
        .update(
          consentPayload(
            input.task,
            input.anonymousText,
            input.question,
            input.referenceDate,
          ),
        )
        .digest("hex") !== input.digest
    )
      throw Error("검토한 본문이 변경되었습니다. 다시 확인해 주세요.");
    if (
      residualIdentifiers(input.anonymousText + (input.question ?? "")).length
    )
      throw Error(
        "연락처 등 식별 정보가 남아 있습니다. 기기에서 다시 가려 주세요.",
      );
    const payload =
      input.task === "inspect"
        ? { text: input.anonymousText, referenceDate: input.referenceDate }
        : input.task === "chat"
          ? {
              question:
                input.question ||
                "기록의 관계와 확인할 내용을 자연스러운 한국어로 설명해 주세요.",
              context: input.anonymousText,
            }
          : { text: input.anonymousText };
    const result = await localAI(input.task, payload);
    return NextResponse.json(
      { result },
      { headers: { "cache-control": "no-store, private" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}
