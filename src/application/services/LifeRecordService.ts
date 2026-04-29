import { LifeRecord } from "../../domain/entities";
import type { ICaseRepository, ILifeRecordRepository } from "../../domain/repositories";
import type { LifeRecordInput } from "../dtos";

export class LifeRecordService {
  constructor(
    private readonly records: ILifeRecordRepository,
    private readonly cases: ICaseRepository,
  ) {}

  async list(userId: string) {
    return this.records.findAllByUserId(userId);
  }

  async listByCase(caseId: string) {
    return this.records.findByCaseId(caseId);
  }

  async create(input: LifeRecordInput) {
    if (input.caseId) {
      const caseData = await this.cases.findById(input.caseId);
      if (!caseData || caseData.userId !== input.userId) throw new Error("연결할 사건을 찾을 수 없습니다.");
    }

    return this.records.save(
      new LifeRecord({
        id: crypto.randomUUID(),
        userId: input.userId,
        caseId: input.caseId,
        type: input.type ?? "NOTE",
        title: input.title,
        content: input.content,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : null,
        approximateTimeText: input.approximateTimeText,
        location: input.location,
        people: input.people,
        tags: input.tags,
      }),
    );
  }

  async link(input: { recordId: string; userId: string; caseId: string | null }) {
    const record = await this.records.findById(input.recordId);
    if (!record || record.userId !== input.userId) throw new Error("기록을 찾을 수 없습니다.");

    if (input.caseId) {
      const caseData = await this.cases.findById(input.caseId);
      if (!caseData || caseData.userId !== input.userId) throw new Error("연결할 사건을 찾을 수 없습니다.");
    }

    record.linkToCase(input.caseId);
    return this.records.save(record);
  }
}
