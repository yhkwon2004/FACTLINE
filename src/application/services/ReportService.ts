import { Report } from "../../domain/entities";
import { LEGAL_SAFETY_NOTICE } from "../../domain/constants";
import type { IAnalysisRepository, ICaseRepository, ILifeRecordRepository, IReportRepository } from "../../domain/repositories";
import type { IAIService } from "../ports";
import type { LegalReferenceService } from "./LegalReferenceService";

const INCIDENT_TYPE_KEYWORDS: Record<string, string> = {
  FRAUD: "사기 재산 증거",
  VIOLENCE: "폭행 상해 진단서 증거",
  DEFAMATION: "명예훼손 모욕 게시물 증거",
  WORK: "근로 직장 임금 괴롭힘 증거",
  OTHER: "진술서 증거 사실관계",
};

export class ReportService {
  constructor(
    private readonly cases: ICaseRepository,
    private readonly analyses: IAnalysisRepository,
    private readonly reports: IReportRepository,
    private readonly lifeRecords: ILifeRecordRepository,
    private readonly ai: IAIService,
    private readonly legalReferences: LegalReferenceService,
  ) {}

  async generate(caseId: string) {
    const caseData = await this.cases.findById(caseId);
    if (!caseData) throw new Error("사건을 찾을 수 없습니다.");
    const analysis = await this.analyses.findByCaseId(caseId);
    const lifeRecords = await this.lifeRecords.findByCaseId(caseId);
    const evidenceById = new Map(caseData.evidences.map((evidence) => [evidence.id, evidence]));
    const legalQuery = [
      caseData.title,
      caseData.description,
      ...caseData.evidences.map((evidence) => evidence.name),
      INCIDENT_TYPE_KEYWORDS[caseData.type],
    ].filter(Boolean).join(" ").slice(0, 80);
    const references = await this.legalReferences.retrieve({ query: legalQuery || caseData.title, incidentType: INCIDENT_TYPE_KEYWORDS[caseData.type] ?? caseData.type });
    const statementDraft = await this.ai.generateStatementDraft({
      caseTitle: caseData.title,
      caseDescription: caseData.description,
      events: caseData.events.map((event) => ({
        title: event.title,
        rawStatement: event.rawStatement,
        description: event.description,
        datetime: event.datetime?.toISOString() ?? event.approximateTimeText,
        approximateTimeText: event.approximateTimeText,
        location: event.location,
        actor: event.actor,
        action: event.action,
        damage: event.damage,
        evidenceCount: event.evidenceIds.length,
        evidenceNames: event.evidenceIds.map((id) => evidenceById.get(id)?.name).filter(Boolean) as string[],
        checklist: [
          event.datetime || event.approximateTimeText ? null : "시점 확인 필요",
          event.location ? null : "장소/매체 확인 필요",
          event.actor ? null : "관련자/제3자 확인 필요",
          event.evidenceIds.length > 0 ? null : "증거 연결 필요",
        ].filter(Boolean) as string[],
      })),
      evidences: caseData.evidences.map((evidence) => ({
        name: evidence.name,
        type: evidence.type,
        description: evidence.description,
        fileHash: evidence.fileHash,
      })),
      lifeRecords: lifeRecords.map((record) => ({
        title: record.title,
        content: record.content,
        datetime: record.occurredAt?.toISOString() ?? record.approximateTimeText,
        location: record.location,
        people: record.people,
        tags: record.tags,
      })),
    });

    const content = [
      "# 진술서 작성 준비 문서",
      "",
      "이 문서는 사용자가 직접 입력한 셀프 기록, 업로드한 증거 메타데이터, 연결한 생활 기록만 취합해 작성됩니다.",
      "",
      "## 사건 개요",
      caseData.description ?? caseData.title,
      "",
      "## 행위 단위 타임라인",
      ...(caseData.events.length > 0
        ? caseData.events
            .slice()
            .sort((a, b) => (a.datetime?.getTime() ?? a.createdAt.getTime()) - (b.datetime?.getTime() ?? b.createdAt.getTime()))
            .map((event, index) => {
              const evidenceNames = event.evidenceIds.map((id) => evidenceById.get(id)?.name).filter(Boolean);
              return [
                `${index + 1}. ${event.datetime?.toISOString() ?? event.approximateTimeText ?? "시점 확인 필요"}`,
                `   - 사건 요약: ${event.description}`,
                `   - 관련자/제3자: ${event.actor ?? "확인 필요"}`,
                `   - 장소/매체: ${event.location ?? "확인 필요"}`,
                `   - 증거 여부: ${evidenceNames.length > 0 ? evidenceNames.join(", ") : "연결 필요"}`,
              ].join("\n");
            })
        : ["- 아직 셀프 기록이 없습니다."]),
      "",
      "## 육하원칙",
      `- 누가: ${caseData.events.map((event) => event.actor).filter(Boolean).join(", ") || "확인 필요"}`,
      `- 어디서: ${caseData.events.map((event) => event.location).filter(Boolean).join(", ") || "확인 필요"}`,
      `- 무엇을/어떻게: ${caseData.events.map((event) => event.action).filter(Boolean).join(", ") || "확인 필요"}`,
      "",
      "## 피해 내용",
      caseData.events.map((event) => event.damage).filter(Boolean).join("\n") || "확인 필요",
      "",
      "## 증거 목록",
      ...(caseData.evidences.length > 0
        ? caseData.evidences.map((evidence) => `- ${evidence.name} (${evidence.fileHash ?? "hash 생성 전"})\n  ${evidence.description ?? "설명 확인 필요"}`)
        : ["- 등록된 증거 없음"]),
      "",
      "## 연결된 생활 기록/일정",
      ...(lifeRecords.length > 0
        ? lifeRecords.map((record) => `- ${record.occurredAt?.toISOString() ?? record.approximateTimeText ?? "시점 확인 필요"}: ${record.title} - ${record.content}`)
        : ["- 연결된 생활 기록 없음"]),
      "",
      "## 누락 정보",
      ...(analysis?.missingInfo.map((item) => `- ${item.label}: ${item.reason}`) ?? ["- 분석 전"]),
      "",
      "## 위험 표현",
      ...(analysis?.risks.map((item) => `- ${item.phrase}: ${item.safeRewriteSuggestion}`) ?? ["- 분석 전"]),
      "",
      "## 참고 법령/판례",
      ...(references.length > 0
        ? references.map((reference) => `- ${reference.title}${reference.citation ? ` (${reference.citation})` : ""}: ${reference.sourceUrl ?? "공식 원문 링크 확인 필요"}`)
        : ["- 공식 참고자료 검색 결과 없음"]),
      "",
      "## 상담 준비 질문",
      "- 원자료로 확인 가능한 날짜와 장소는 무엇인가요?",
      "- 피해 금액 또는 손해 내용을 입증할 자료가 있나요?",
      "- 상대방 발언의 직접 인용과 해석을 분리했나요?",
      "",
      "## 진술서 초안",
      statementDraft,
      "",
      "## 법적 고지",
      LEGAL_SAFETY_NOTICE,
    ].join("\n");

    return this.reports.save(new Report({ id: crypto.randomUUID(), caseId, content }));
  }

  async get(caseId: string) {
    return this.reports.findByCaseId(caseId);
  }
}
