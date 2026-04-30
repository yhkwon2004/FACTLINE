import { cookies } from "next/headers";
import { Link2 } from "lucide-react";
import { createContainer } from "../../../infrastructure/di/container";
import { IntegrationCenter } from "../../../presentation/components/IntegrationCenter";
import { Badge } from "../../../presentation/components/UI";

function serializeSource(source: any) {
  return {
    id: source.id,
    provider: source.provider,
    displayName: source.displayName,
    status: source.status,
    consentScopes: source.consentScopes,
    consentedAt: source.consentedAt?.toISOString() ?? null,
    lastSyncedAt: source.lastSyncedAt?.toISOString() ?? null,
  };
}

function serializeRecord(record: any) {
  return {
    id: record.id,
    provider: record.provider,
    kind: record.kind,
    participantName: record.participantName,
    participantHandle: record.participantHandle,
    direction: record.direction,
    content: record.content,
    occurredAt: record.occurredAt?.toISOString() ?? null,
    approximateTimeText: record.approximateTimeText,
    location: record.location,
    metadata: record.metadata,
    attachmentNames: record.attachmentNames,
    fileHash: record.fileHash,
    createdAt: record.createdAt.toISOString(),
  };
}

export default async function IntegrationsPage() {
  const token = (await cookies()).get("factline_session")?.value;
  const container = createContainer();
  const session = token ? await container.sessionService.verify(token) : null;
  const data = session?.userId
    ? await container.memoryIntegrationService.list(session.userId)
    : { connectors: [], sources: [], records: [], summary: null };

  return (
    <div className="space-y-6">
      <div>
        <Badge tone="blue">기억 연동</Badge>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Link2 size={23} />
          메시지와 자료 가져오기
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          카카오톡, 이메일, 문자, 인스타그램처럼 흩어진 기록을 사용자가 동의한 범위에서 가져오고, 실제 원문만 시간순 기억 자료로 정리합니다.
        </p>
      </div>
      <IntegrationCenter
        initialData={{
          connectors: data.connectors,
          sources: data.sources.map(serializeSource),
          records: data.records.map(serializeRecord),
          summary: data.summary,
        }}
      />
    </div>
  );
}
