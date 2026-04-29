import { Evidence } from "../../domain/entities";
import type { IEvidenceRepository } from "../../domain/repositories";
import type { EvidenceInput } from "../dtos";
import type { IStorageService } from "../ports";

export class EvidenceService {
  constructor(
    private readonly evidences: IEvidenceRepository,
    private readonly storage: IStorageService,
  ) {}

  async list(caseId: string) {
    return this.evidences.findByCaseId(caseId);
  }

  async upload(input: EvidenceInput) {
    const savedFile = input.fileHash
      ? { fileUrl: `mock://evidence/${encodeURIComponent(input.name)}`, fileHash: input.fileHash }
      : await this.storage.save({
          name: input.name,
          type: input.type,
          content: input.content ?? `${input.name}:${input.description ?? ""}`,
        });

    const evidence = new Evidence({
      id: crypto.randomUUID(),
      caseId: input.caseId,
      name: input.name,
      type: input.type,
      fileUrl: savedFile.fileUrl,
      fileHash: savedFile.fileHash,
      description: input.description,
    });

    return this.evidences.save(evidence);
  }

  async link(evidenceId: string, eventId: string) {
    await this.evidences.linkToEvent(evidenceId, eventId);
  }

  async unlink(evidenceId: string, eventId: string) {
    await this.evidences.unlinkFromEvent(evidenceId, eventId);
  }
}
