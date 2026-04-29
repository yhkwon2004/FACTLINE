import { cookies } from "next/headers";
import { InterviewChat } from "../../../../../presentation/components/InterviewChat";
import { createContainer } from "../../../../../infrastructure/di/container";

function serializeLifeRecord(record: any) {
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

function serializeEvidence(evidence: any, caseTitle: string) {
  return {
    id: evidence.id,
    caseId: evidence.caseId,
    caseTitle,
    name: evidence.name,
    type: evidence.type,
    description: evidence.description,
    fileHash: evidence.fileHash,
    createdAt: evidence.createdAt.toISOString(),
  };
}

export default async function InterviewPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const token = (await cookies()).get("factline_session")?.value;
  const container = createContainer();
  const session = token ? await container.sessionService.verify(token) : null;
  const [initialQuestion] = await container.interviewService.getQuestionTree();
  const caseData = await container.caseService.get(caseId);
  const [cases, lifeRecords] = session?.userId
    ? await Promise.all([
        container.caseService.list(session.userId),
        container.lifeRecordService.list(session.userId),
      ])
    : [[caseData], []];
  const evidenceResources = cases.flatMap((caseItem) =>
    caseItem.evidences.map((evidence) => serializeEvidence(evidence, caseItem.title)),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">셀프 기록</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">원문 기록은 보존하고, 시간·장소·관련자·증거 여부를 행위 단위로 분리합니다.</p>
      </div>
      <InterviewChat
        caseId={caseId}
        caseTitle={caseData.title}
        initialQuestion={initialQuestion}
        lifeRecords={lifeRecords.map(serializeLifeRecord)}
        evidences={evidenceResources}
      />
    </div>
  );
}
