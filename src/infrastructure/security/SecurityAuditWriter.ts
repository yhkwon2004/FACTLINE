import { getPrismaClient } from "../prisma-client";

export class SecurityAuditWriter {
  async record(input: { userId?: string; action: string; target?: string; metadata?: unknown }) {
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
