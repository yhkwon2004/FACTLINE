import { cloudStorage, writeVault } from "../storage/PrivateVault";
import { randomUUID } from "node:crypto";
import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { seal } from "../storage/LocalEvidenceStorage";
import { getPrismaClient } from "../prisma-client";

export class SecurityAuditWriter {
  async record(input: {
    userId?: string;
    action: string;
    target?: string;
    metadata?: unknown;
  }) {
    if (cloudStorage()) {
      await writeVault("audit/" + Date.now() + "-" + randomUUID(), seal(Buffer.from(JSON.stringify({...input,at:new Date().toISOString()}))));
      return;
    }
    if (
      process.env.FACTLINE_STORAGE_MODE === "local" ||
      !process.env.DATABASE_URL
    ) {
      await mkdir(path.join(process.cwd(), ".data"), { recursive: true });
      await appendFile(
        path.join(process.cwd(), ".data/audit.log"),
        seal(
          Buffer.from(
            JSON.stringify({ ...input, at: new Date().toISOString() }),
          ),
        ).toString("base64") + "\n",
        { mode: 0o600 },
      );
      return;
    }
    try {
      await getPrismaClient().auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          target: input.target,
          metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
        },
      });
    } catch {
      // Audit logging must never break the user flow. Infrastructure monitoring should catch this in production.
    }
  }
}
