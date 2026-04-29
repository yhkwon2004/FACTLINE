import { Evidence } from "../entities/Evidence";
import { IncidentEvent } from "../entities/IncidentEvent";

export class EvidenceLinkService {
  link(event: IncidentEvent, evidence: Evidence) {
    return event.withEvidenceIds([...new Set([...event.evidenceIds, evidence.id])]);
  }

  unlink(event: IncidentEvent, evidenceId: string) {
    return event.withEvidenceIds(event.evidenceIds.filter((id) => id !== evidenceId));
  }
}

