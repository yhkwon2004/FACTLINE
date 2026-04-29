import { Badge, Card } from "./UI";

export interface TimelineCardProps {
  title: string;
  datetime: string;
  description: string;
  actor?: string | null;
  location?: string | null;
  source?: string;
  evidenceCount?: number;
  caseEvidenceCount?: number;
  checklist?: string[];
}

export function TimelineCard(props: TimelineCardProps) {
  const hasEvidence = (props.evidenceCount ?? 0) > 0;

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">{props.datetime}</p>
            <h3 className="mt-1 text-base font-bold text-slate-900">{props.title}</h3>
          </div>
          <Badge tone={props.source === "EVIDENCE" ? "green" : props.source === "LIFE" ? "blue" : "slate"}>
            {props.source === "EVIDENCE" ? "증거 기반" : props.source === "LIFE" ? "생활 기록" : "셀프 기록"}
          </Badge>
        </div>
        <div className="rounded-lg bg-stone-50 p-3">
          <p className="text-xs font-semibold text-slate-500">사건 요약</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{props.description}</p>
        </div>
        <div className="grid gap-2 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-stone-200 p-3">
            <p className="text-xs font-semibold text-slate-500">관련자/제3자</p>
            <p className="mt-1 font-semibold text-slate-900">{props.actor || "확인 필요"}</p>
          </div>
          <div className="rounded-lg border border-stone-200 p-3">
            <p className="text-xs font-semibold text-slate-500">장소/매체</p>
            <p className="mt-1 font-semibold text-slate-900">{props.location || "확인 필요"}</p>
          </div>
          <div className="rounded-lg border border-stone-200 p-3">
            <p className="text-xs font-semibold text-slate-500">증거 여부</p>
            <p className={hasEvidence ? "mt-1 font-semibold text-emerald-800" : "mt-1 font-semibold text-amber-800"}>
              {hasEvidence ? `연결됨 ${props.evidenceCount}건` : props.caseEvidenceCount ? `사건 증거 ${props.caseEvidenceCount}건 중 연결 필요` : "등록/연결 필요"}
            </p>
          </div>
        </div>
        {props.checklist?.length ? (
          <div className="flex flex-wrap gap-2">
            {props.checklist.map((item) => <Badge key={item} tone="amber">{item}</Badge>)}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
