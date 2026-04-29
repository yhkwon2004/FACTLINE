import Link from "next/link";
import { cookies } from "next/headers";
import { FileCheck2, ListChecks, NotebookPen } from "lucide-react";
import { createContainer } from "../../../infrastructure/di/container";
import { CaseCard } from "../../../presentation/components/CaseCard";
import { Badge, Button, Card } from "../../../presentation/components/UI";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

async function getDashboardData() {
  const token = (await cookies()).get("factline_session")?.value;
  const container = createContainer();
  const session = token ? await container.sessionService.verify(token) : null;
  if (!session?.userId) return { cases: [], evidenceCount: 0, lifeRecordCount: 0 };

  const cases = await container.caseService.list(session.userId);
  const lifeRecords = await container.lifeRecordService.list(session.userId);
  return {
    cases,
    evidenceCount: cases.reduce((count, caseItem) => count + caseItem.evidences.length, 0),
    lifeRecordCount: lifeRecords.length,
  };
}

export default async function DashboardPage() {
  const { cases, evidenceCount, lifeRecordCount } = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge tone="green">FACTLINE</Badge>
          <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">기록 현황</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">평소 기록을 쌓아 두고, 필요할 때 관련 내용을 사건에 연결합니다.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <ListChecks className="text-emerald-800" size={20} />
          <p className="mt-3 text-2xl font-bold">{cases.length}</p>
          <p className="text-sm text-slate-500">내 사건</p>
        </Card>
        <Card>
          <NotebookPen className="text-emerald-800" size={20} />
          <p className="mt-3 text-2xl font-bold">{lifeRecordCount}</p>
          <p className="text-sm text-slate-500">일상 기록</p>
        </Card>
        <Card>
          <FileCheck2 className="text-sky-800" size={20} />
          <p className="mt-3 text-2xl font-bold">{evidenceCount}</p>
          <p className="text-sm text-slate-500">증거 연결 항목</p>
        </Card>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">최근 사건</h2>
        <div className="grid gap-3">
          {cases.length > 0 ? (
            cases.map((caseItem) => (
              <CaseCard
                key={caseItem.id}
                id={caseItem.id}
                title={caseItem.title}
                type={caseItem.type}
                status={caseItem.status}
                updatedAt={formatDate(caseItem.updatedAt)}
                isLocked={caseItem.isLocked}
              />
            ))
          ) : (
            <Card className="space-y-3 text-sm leading-6 text-slate-600">
              <p>아직 정리 중인 사건이 없습니다. 사건명과 유형만 먼저 저장하고 셀프 기록에서 세부 사실을 채워 넣을 수 있습니다.</p>
              <Link href="/cases/new">
                <Button type="button">첫 사건 만들기</Button>
              </Link>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
