import Link from "next/link";
import { MissingInfoCard } from "../../../../../presentation/components/MissingInfoCard";
import { RiskWarningCard } from "../../../../../presentation/components/RiskWarningCard";
import { Button } from "../../../../../presentation/components/UI";

export default async function AnalysisPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">누락 및 위험 표현 점검</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">판단이 아니라 상담 전 확인할 항목을 표시합니다.</p>
      </div>
      <div className="grid gap-3">
        <RiskWarningCard phrase="분명히" reason="단정 표현으로 읽힐 수 있습니다." suggestion="확인 가능한 발언이나 문서 내용으로 바꾸세요." />
        <RiskWarningCard phrase="고의로" reason="상대방의 의도를 판단하는 표현입니다." suggestion="연락 시도 횟수와 응답 여부를 날짜별로 적으세요." />
        <MissingInfoCard label="증거" reason="입금 요청과 실제 이체 내역을 연결할 자료가 필요합니다." />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Link href={`/cases/${caseId}/legal-reference`}>
          <Button variant="outline" className="w-full">참고 자료 보기</Button>
        </Link>
        <Link href={`/cases/${caseId}/report`}>
          <Button className="w-full">보고서 생성</Button>
        </Link>
      </div>
    </div>
  );
}
