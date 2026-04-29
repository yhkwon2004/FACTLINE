import { LegalReference } from "../../domain/entities";
import type { ILegalReferenceRepository } from "../../domain/repositories";
import type { ILegalSearchService } from "../ports";

export class LegalReferenceService {
  constructor(
    private readonly repository: ILegalReferenceRepository,
    private readonly search: ILegalSearchService,
  ) {}

  async retrieve(input: { query: string; incidentType?: string }) {
    const remote = await this.search.searchReferences(input);
    if (remote.length > 0) {
      const saved = await Promise.all(
        remote.map((reference) =>
          this.repository.save(
            new LegalReference({
              ...reference,
              category: reference.category ?? input.incidentType ?? "REFERENCE",
            }),
          ),
        ),
      );
      return saved;
    }

    return this.repository.search(input.query, input.incidentType);
  }
}
