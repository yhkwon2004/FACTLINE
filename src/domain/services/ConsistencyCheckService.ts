import { IncidentEvent } from "../entities/IncidentEvent";
import type { ContradictionItem } from "../types";

const OVERLAP_WINDOW_MS = 60 * 60 * 1000;

export class ConsistencyCheckService {
  check(events: IncidentEvent[]): ContradictionItem[] {
    const contradictions: ContradictionItem[] = [];
    const sorted = [...events].filter((event) => event.datetime).sort((a, b) => {
      return (a.datetime?.getTime() ?? 0) - (b.datetime?.getTime() ?? 0);
    });

    for (let index = 0; index < sorted.length - 1; index += 1) {
      const current = sorted[index];
      const next = sorted[index + 1];
      const currentTime = current.datetime?.getTime() ?? 0;
      const nextTime = next.datetime?.getTime() ?? 0;

      if (nextTime < currentTime) {
        contradictions.push({
          type: "SEQUENCE",
          description: "사건 순서가 시간 흐름과 맞지 않을 수 있습니다.",
          eventIds: [current.id, next.id],
        });
      }

      if (
        current.actor &&
        next.actor &&
        current.actor === next.actor &&
        current.location &&
        next.location &&
        current.location !== next.location &&
        Math.abs(nextTime - currentTime) <= OVERLAP_WINDOW_MS
      ) {
        contradictions.push({
          type: "LOCATION",
          description: "같은 인물이 가까운 시간대에 서로 다른 장소에 있는 것으로 기록되어 있습니다.",
          eventIds: [current.id, next.id],
        });
      }
    }

    for (const event of events) {
      if (!event.actor) {
        contradictions.push({
          type: "ACTOR",
          description: "행위자가 비어 있어 사건 주체를 확인하기 어렵습니다.",
          eventIds: [event.id],
        });
      }
    }

    return contradictions;
  }
}

