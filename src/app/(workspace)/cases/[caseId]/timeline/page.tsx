import { TimelineCard } from "../../../../../presentation/components/TimelineCard";
import { createContainer } from "../../../../../infrastructure/di/container";
import { Card } from "../../../../../presentation/components/UI";

function formatEventTime(event: { datetime: Date | null; approximateTimeText: string | null; createdAt: Date }) {
  return event.datetime?.toLocaleString("ko-KR") ?? event.approximateTimeText ?? `시점 확인 필요 (${event.createdAt.toLocaleDateString("ko-KR")} 입력)`;
}

export default async function TimelinePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const events = await createContainer().timelineService.generate(caseId);
  const caseData = await createContainer().caseService.get(caseId);
  const rows = events
    .map((event) => ({
      id: `event-${event.id}`,
      timeValue: event.datetime?.getTime() ?? event.createdAt.getTime(),
      title: event.title,
      datetime: formatEventTime(event),
      description: event.description,
      actor: event.actor,
      location: event.location,
      source: event.source,
      evidenceCount: event.evidenceIds.length,
      caseEvidenceCount: caseData.evidences.length,
      checklist: [
        event.datetime || event.approximateTimeText ? null : "시점 확인",
        event.actor ? null : "관련자 확인",
        event.location ? null : "장소 확인",
        event.evidenceIds.length > 0 ? null : "증거 연결",
      ].filter(Boolean) as string[],
    }))
    .sort((left, right) => left.timeValue - right.timeValue);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">타임라인</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">시간, 사건 요약, 관련자/제3자, 증거 여부, 셀프 점검 항목을 한 블록으로 시간순 정렬합니다.</p>
      </div>
      <div className="space-y-3">
        {rows.length > 0 ? (
          rows.map((event) => (
            <TimelineCard
              key={event.id}
              title={event.title}
              datetime={event.datetime}
              description={event.description}
              actor={event.actor}
              location={event.location}
              source={event.source}
              evidenceCount={event.evidenceCount}
              caseEvidenceCount={event.caseEvidenceCount}
              checklist={event.checklist}
            />
          ))
        ) : (
          <Card className="text-sm leading-6 text-slate-600">아직 타임라인에 올릴 셀프 기록이 없습니다. 확인 가능한 사실을 먼저 입력해 주세요.</Card>
        )}
      </div>
    </div>
  );
}
