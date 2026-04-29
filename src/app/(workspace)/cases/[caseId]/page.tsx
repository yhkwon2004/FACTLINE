import Link from "next/link";
import { BookOpenText, FileText, Scale, ShieldCheck, Timer } from "lucide-react";
import { createContainer } from "../../../../infrastructure/di/container";
import { CaseDetailActions } from "../../../../presentation/components/CaseDetailActions";
import { Badge, Card } from "../../../../presentation/components/UI";

const steps = [
  { href: "interview", label: "셀프 기록", icon: FileText, text: "행위 단위로 기억과 확인자료를 차근차근 기록합니다." },
  { href: "timeline", label: "타임라인", icon: Timer, text: "시간, 요약, 제3자, 증거 여부를 한 블록으로 정렬합니다." },
  { href: "evidence", label: "증거", icon: ShieldCheck, text: "증거와 기존 일상 기록을 참고 자료로 연결합니다." },
  { href: "analysis", label: "분석", icon: Scale, text: "누락 정보와 위험 표현을 점검합니다." },
  { href: "legal-reference", label: "참고자료", icon: BookOpenText, text: "공식 법령/판례 출처를 원문 확인용으로 조회합니다." },
  { href: "report", label: "진술서 초안", icon: FileText, text: "셀프 기록과 증거를 취합해 시간순 진술서 초안을 만듭니다." },
];

export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const caseData = await createContainer().caseService.get(caseId);
  const actors = Array.from(new Set(caseData.events.map((event) => event.actor).filter(Boolean)));
  const times = caseData.events
    .map((event) => event.datetime?.toLocaleString("ko-KR") ?? event.approximateTimeText)
    .filter(Boolean);
  const places = Array.from(new Set(caseData.events.map((event) => event.location).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div>
        <Badge tone={caseData.status === "OPEN" ? "green" : "amber"}>{caseData.status === "OPEN" ? "열림" : "정리 중"}</Badge>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{caseData.title}</h1>
        {caseData.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{caseData.description}</p> : null}
        <p className="mt-2 text-sm leading-6 text-slate-600">사건 ID: {caseId}</p>
      </div>
      <CaseDetailActions caseId={caseId} initialTitle={caseData.title} />
      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">WHO</p>
            <p className="mt-1 text-sm font-bold">{actors.length > 0 ? actors.join(", ") : "셀프 기록에서 확인 필요"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">WHEN</p>
            <p className="mt-1 text-sm font-bold">{times.length > 0 ? times.slice(0, 2).join(", ") : "셀프 기록에서 확인 필요"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">WHERE</p>
            <p className="mt-1 text-sm font-bold">{places.length > 0 ? places.join(", ") : "셀프 기록에서 확인 필요"}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 border-t border-stone-200 pt-4 text-sm text-slate-600 md:grid-cols-3">
          <p>이벤트 {caseData.events.length}건</p>
          <p>증거 {caseData.evidences.length}건</p>
          <p>일상 기록은 증거 화면에서 참고</p>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link key={step.href} href={`/cases/${caseId}/${step.href}`}>
              <Card className="h-full transition hover:border-emerald-300">
                <Icon className="text-emerald-800" size={20} />
                <h2 className="mt-3 font-bold">{step.label}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
