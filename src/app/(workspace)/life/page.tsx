import { cookies } from "next/headers";
import { NotebookPen } from "lucide-react";
import { createContainer } from "../../../infrastructure/di/container";
import { LifeRecordForm } from "../../../presentation/components/LifeRecordForm";
import { Badge } from "../../../presentation/components/UI";

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
      <div>
        <Badge tone="green">생활 기록</Badge>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <NotebookPen size={23} />
          일상 기록
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          법률 문제를 전제로 하지 않고 평소 생활, 일정, 불편한 일, 기억할 일을 남깁니다. 필요할 때만 관련 기록을 사건에 연결해 시간순으로 정리합니다.
        </p>
      </div>
      <LifeRecordForm
        initialRecords={records.map(serializeRecord)}
        cases={cases.map((caseItem) => ({ id: caseItem.id, title: caseItem.title }))}
      />
    </div>
  );
}
