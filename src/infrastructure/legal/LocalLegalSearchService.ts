import type { ILegalSearchService } from "../../application/ports";
import { localAI, type LocalReference } from "../ai/local-worker";
export class LocalLegalSearchService implements ILegalSearchService {
  searchReferences(input: { query: string; incidentType?: string }) {
    return localAI<LocalReference[]>("search", input);
  }
}
