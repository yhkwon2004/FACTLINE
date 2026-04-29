import { createContainer } from "../../../../../infrastructure/di/container";
import { ReportView } from "../../../../../presentation/components/ReportView";
import { Card } from "../../../../../presentation/components/UI";

export default async function ReportPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const container = createContainer();
  const caseData = await container.caseService.get(caseId);
  const report = await container.reportService.generate(caseId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">진술서 초안 / 사건 정리</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {caseData.title}의 셀프 기록, 증거, 생활 기록, 점검 결과만 취합해 작성합니다.
        </p>
      </div>
      <Card className="bg-stone-100 text-sm leading-6 text-slate-700">
        예시 데이터는 사용하지 않습니다. 내용이 비어 있다면 셀프 기록 또는 증거를 먼저 추가해 주세요.
      </Card>
      <ReportView content={report.contentWithNotice()} />
    </div>
  );
}
