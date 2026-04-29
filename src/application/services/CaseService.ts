import { Case } from "../../domain/entities";
import type { ICaseRepository } from "../../domain/repositories";
import type { CreateCaseInput } from "../dtos";

export class CaseService {
  constructor(private readonly cases: ICaseRepository) {}

  async list(userId: string) {
    return this.cases.findAllByUserId(userId);
  }

  async get(caseId: string) {
    const caseData = await this.cases.findById(caseId);
    if (!caseData) throw new Error("사건을 찾을 수 없습니다.");
    return caseData;
  }

  async create(input: CreateCaseInput) {
    return this.cases.save(
      new Case({
        id: crypto.randomUUID(),
        title: input.title,
        type: input.type,
        userId: input.userId,
        description: input.description,
      }),
    );
  }

  async rename(input: { caseId: string; userId: string; title: string }) {
    const title = input.title.trim();
    if (title.length < 2) throw new Error("사건 이름은 2자 이상 입력해 주세요.");

    const caseData = await this.get(input.caseId);
    if (caseData.userId !== input.userId) throw new Error("사건을 찾을 수 없습니다.");

    caseData.title = title;
    caseData.updatedAt = new Date();
    return this.cases.save(caseData);
  }

  async lock(caseId: string) {
    await this.cases.lock(caseId);
  }

  async delete(caseId: string) {
    await this.cases.delete(caseId);
  }

  async deleteForUser(input: { caseId: string; userId: string }) {
    const caseData = await this.get(input.caseId);
    if (caseData.userId !== input.userId) throw new Error("사건을 찾을 수 없습니다.");
    await this.cases.delete(input.caseId);
  }
}
