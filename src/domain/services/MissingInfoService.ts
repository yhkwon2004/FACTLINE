import { IncidentEvent } from "../entities/IncidentEvent";
import type { MissingInfoItem } from "../types";

const LABELS = {
  when: "언제",
  where: "어디서",
  who: "누가",
  action: "무엇을/어떻게",
  damage: "피해 내용",
  evidence: "증거",
} as const;

export class MissingInfoService {
  check(events: IncidentEvent[]): MissingInfoItem[] {
    const missing: MissingInfoItem[] = [];

    for (const event of events) {
      if (!event.datetime && !event.approximateTimeText) {
        missing.push(this.item("when", "발생 시점이 비어 있습니다.", event.id));
      }
      if (!event.location) {
        missing.push(this.item("where", "발생 장소 또는 매체가 비어 있습니다.", event.id));
      }
      if (!event.actor) {
        missing.push(this.item("who", "행위자 또는 관련자가 비어 있습니다.", event.id));
      }
      if (!event.action) {
        missing.push(this.item("action", "구체적인 행위가 비어 있습니다.", event.id));
      }
      if (!event.damage) {
        missing.push(this.item("damage", "피해 내용 또는 영향이 비어 있습니다.", event.id));
      }
      if (event.evidenceIds.length === 0) {
        missing.push(this.item("evidence", "연결된 증거가 없습니다.", event.id));
      }
    }

    return missing;
  }

  private item(field: MissingInfoItem["field"], reason: string, eventId: string): MissingInfoItem {
    return { field, label: LABELS[field], reason, eventId };
  }
}

