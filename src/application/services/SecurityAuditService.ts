import type { IUserRepository, ICaseRepository } from "../../domain/repositories";
import { SecurityAuditWriter } from "../../infrastructure/security/SecurityAuditWriter";

export class SecurityAuditService {
  constructor(
    private readonly users: IUserRepository,
    private readonly cases: ICaseRepository,
    private readonly writer: SecurityAuditWriter,
  ) {}

  async record(userId: string | undefined, action: string, target?: string, metadata?: unknown) {
    await this.writer.record({ userId, action, target, metadata });
  }

  async deleteAccount(userId: string) {
    await this.users.delete(userId);
    await this.writer.record({ userId, action: "ACCOUNT_DELETE", target: userId });
  }
}

