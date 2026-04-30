import { cookies } from "next/headers";
import { CalendarDays, NotebookPen, SearchCheck } from "lucide-react";
import { createContainer } from "../../../infrastructure/di/container";
import { LifeRecordForm } from "../../../presentation/components/LifeRecordForm";
import { Badge, Card } from "../../../presentation/components/UI";

function serializeRecord(record: any) {
  return {
    id: record.id,
    caseId: record.caseId,
    type: record.type,
    title: record.title,
    content: record.content,
    occurredAt: record.occurredAt?.toISOString() ?? null,
    approximateTimeText: record.approximateTimeText,
    location: record.location,
    people: record.people,
    tags: record.tags,
    createdAt: record.createdAt.toISOString(),
  };
}

export default async function LifePage() {
  const token = (await cookies()).get("factline_session")?.value;
  const container = createContainer();
  const session = token ? await container.sessionService.verify(token) : null;
  const records = session?.userId ? await container.lifeRecordService.list(session.userId) : [];
  const cases = session?.userId ? await container.caseService.list(session.userId) : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div>
          <Badge tone="green">라이프 다이어리</Badge>
          <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <NotebookPen size={23} />
            오늘의 일과 기억
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            일상, 일정, 대화에서 기억해둘 일, 불편했던 일을 편하게 남깁니다. 나중에 필요해지면 날짜와 사람, 장소를 기준으로 관련 기록만 골라 사건 정리에 연결할 수 있습니다.
          </p>
        </div>
        <Card className="bg-emerald-50 shadow-none">
          <p className="text-sm font-bold text-emerald-950">기록 방식</p>
          <p className="mt-1 text-xs leading-5 text-emerald-900">
            확실한 사실은 그대로, 애매한 기억은 “대략”, “기억상”처럼 표시해 두면 나중에 더 안전하게 정리할 수 있습니다.
          </p>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { icon: NotebookPen, title: "매일 짧게 남기기", description: "오늘 있었던 일, 대화, 감정이 섞인 기억을 원문 그대로 보관합니다." },
          { icon: CalendarDays, title: "날짜별로 다시 보기", description: "캘린더에서 기록 종류별 색상을 보고 흐름을 빠르게 파악합니다." },
          { icon: SearchCheck, title: "필요할 때만 묶기", description: "문제가 생기면 사람, 장소, 키워드로 찾아 사건 기록에 연결합니다." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="shadow-none">
              <Icon size={20} className="text-emerald-800" />
              <h2 className="mt-3 text-sm font-bold text-slate-900">{item.title}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
            </Card>
          );
        })}
      </div>
      <LifeRecordForm
        initialRecords={records.map(serializeRecord)}
        cases={cases.map((caseItem) => ({ id: caseItem.id, title: caseItem.title }))}
      />
    </div>
  );
}
