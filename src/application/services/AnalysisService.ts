import { AnalysisResult } from "../../domain/entities";
import type { IAnalysisRepository, ICaseRepository } from "../../domain/repositories";
import { ConsistencyCheckService, MissingInfoService, RiskDetectionService } from "../../domain/services";

export class AnalysisService {
  constructor(
    private readonly cases: ICaseRepository,
    private readonly analyses: IAnalysisRepository,
    private readonly riskDetection: RiskDetectionService,
    private readonly missingInfo: MissingInfoService,
    private readonly consistency: ConsistencyCheckService,
  ) {}

  async analyze(caseId: string) {
    const caseData = await this.cases.findById(caseId);
    if (!caseData) throw new Error("사건을 찾을 수 없습니다.");

    const text = caseData.events.map((event) => `${event.rawStatement}\n${event.description}`).join("\n");
    const risks = this.riskDetection.detect(text);
    const missing = this.missingInfo.check(caseData.events);
    const contradictions = this.consistency.check(caseData.events);
    const riskLevel = risks.length + contradictions.length >= 3 ? "HIGH" : risks.length > 0 || missing.length > 0 ? "MEDIUM" : "LOW";

    const content = [
      `${caseData.title} 사건의 사용자 제공 사실을 기준으로 누락 정보와 표현 위험을 정리했습니다.`,
      `위험 표현 ${risks.length}건, 누락 정보 ${missing.length}건, 모순 가능성 ${contradictions.length}건이 확인되었습니다.`,
    ].join("\n");

    return this.analyses.save(
      new AnalysisResult({
        id: crypto.randomUUID(),
        caseId,
        riskLevel,
        risks,
        missingInfo: missing,
        contradictions,
        suggestions: [
          "정확한 날짜, 장소, 관련자, 금액 또는 피해 내용을 원자료 기준으로 보완하세요.",
          "의도나 평가 표현은 직접 인용 또는 확인 가능한 행동으로 분리하세요.",
        ],
        content,
      }),
    );
  }
}

