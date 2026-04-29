import { cookies } from "next/headers";
import { EvidenceUploader } from "../../../../../presentation/components/EvidenceUploader";
import { createContainer } from "../../../../../infrastructure/di/container";

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

export default async function EvidencePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const token = (await cookies()).get("factline_session")?.value;
  const container = createContainer();
  const session = token ? await container.sessionService.verify(token) : null;
  const caseData = await container.caseService.get(caseId);
  if (!session?.userId || caseData.userId !== session.userId) throw new Error("사건을 찾을 수 없습니다.");

  const [evidence, lifeRecords] = await Promise.all([
    container.evidenceService.list(caseId),
    container.lifeRecordService.list(session.userId),
  ]);
  const initialItems = evidence.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    description: item.description,
    fileHash: item.fileHash,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">증거 업로드 및 연결</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">파일 증거와 함께 기존 일상 기록을 참고 항목으로 불러와 정리할 수 있습니다.</p>
      </div>
      <EvidenceUploader caseId={caseId} initialItems={initialItems} lifeRecords={lifeRecords.map(serializeRecord)} />
    </div>
  );
}
