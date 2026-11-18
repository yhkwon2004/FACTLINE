import { cookies } from "next/headers";
import { DailyVoiceJournal } from "../../../presentation/components/DailyVoiceJournal";
import { cloudStorage } from "../../../infrastructure/storage/PrivateVault";
import { createContainer } from "../../../infrastructure/di/container";
import { LifeRecordForm } from "../../../presentation/components/LifeRecordForm";


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
      <div className="page-heading"><div><h1>오늘의 기록</h1><p>녹음 속 기억을 날짜와 사람으로 연결해요.</p></div></div>
      <DailyVoiceJournal cases={cases.map(c=>({id:c.id,title:c.title}))} cloudUpload={cloudStorage()} />
      <details className="rounded-2xl border border-stone-200 bg-white p-5"><summary className="cursor-pointer font-semibold">직접 쓰기 · 캘린더 · 지난 기록</summary><div className="mt-5">
      <LifeRecordForm
        initialRecords={records.map(serializeRecord)}
        cases={cases.map((caseItem) => ({ id: caseItem.id, title: caseItem.title }))}
      />
      </div></details>
    </div>
  );
}
