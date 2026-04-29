import { IncidentEvent } from "../entities/IncidentEvent";

export class TimelineService {
  generate(events: IncidentEvent[]) {
    return [...events].sort((left, right) => {
      const leftTime = left.datetime?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightTime = right.datetime?.getTime() ?? Number.MAX_SAFE_INTEGER;

      if (leftTime !== rightTime) return leftTime - rightTime;
      if (left.isApproximateTime !== right.isApproximateTime) {
        return left.isApproximateTime ? 1 : -1;
      }
      return left.createdAt.getTime() - right.createdAt.getTime();
    });
  }
}

