import { LEGAL_SAFETY_NOTICE } from "../../../../../domain/constants";
import { createContainer } from "../../../../../infrastructure/di/container";
import { LegalReferenceCard } from "../../../../../presentation/components/LegalReferenceCard";
import { Card } from "../../../../../presentation/components/UI";

const INCIDENT_TYPE_KEYWORDS: Record<string, string> = {
  FRAUD: "사기 재산 증거",
  VIOLENCE: "폭행 상해 진단서 증거",
  DEFAMATION: "명예훼손 모욕 게시물 증거",
  WORK: "근로 직장 임금 괴롭힘 증거",
  OTHER: "진술서 증거 사실관계",
};

export default async function LegalReferencePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const container = createContainer();
  const caseData = await container.caseService.get(caseId);
  const query = [
    caseData.title,
    caseData.description,
    ...caseData.evidences.map((evidence) => evidence.name),
    INCIDENT_TYPE_KEYWORDS[caseData.type],
  ].filter(Boolean).join(" ").slice(0, 120);
  const references = await container.legalReferenceService.retrieve({
    query: query || caseData.title,
    incidentType: INCIDENT_TYPE_KEYWORDS[caseData.type] ?? caseData.type,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">참고 법령/판례</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          내 셀프 기록과 증거명에서 나온 키워드로 공식 법령 데이터 출처를 조회합니다. 결과는 원문 확인용 참고자료입니다.
        </p>
      </div>
      <Card className="bg-stone-100 text-sm leading-6 text-slate-700">{LEGAL_SAFETY_NOTICE}</Card>
      <div className="grid gap-3">
        {references.length > 0 ? (
          references.map((reference) => (
            <LegalReferenceCard
              key={reference.id}
              title={reference.title}
              description={reference.description}
              citation={reference.citation}
              content={reference.content}
              sourceUrl={reference.sourceUrl}
            />
          ))
        ) : (
          <Card className="text-sm leading-6 text-slate-600">공식 참고자료 검색 결과가 없습니다. 셀프 기록과 증거명을 더 구체화해 주세요.</Card>
        )}
      </div>
    </div>
  );
}
