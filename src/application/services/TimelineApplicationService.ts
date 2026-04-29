import type { IEventRepository } from "../../domain/repositories";
import { TimelineService } from "../../domain/services";

export class TimelineApplicationService {
  constructor(
    private readonly events: IEventRepository,
    private readonly timeline: TimelineService,
  ) {}

  async generate(caseId: string) {
    return this.timeline.generate(await this.events.findByCaseId(caseId));
  }
}

