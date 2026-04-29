import Link from "next/link";
import { cookies } from "next/headers";
import { CalendarDays, FileText, LockKeyhole, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { createContainer } from "../../../infrastructure/di/container";
import { CaseManagementList } from "../../../presentation/components/CaseManagementList";
import { Button, Card } from "../../../presentation/components/UI";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

async function getMyPageData() {
  const token = (await cookies()).get("factline_session")?.value;
  const container = createContainer();
  const session = token ? await container.sessionService.verify(token) : null;
  const cases = session?.userId ? await container.caseService.list(session.userId) : [];
  return { session, cases };
}

export default async function MyPage() {
  const { session, cases } = await getMyPageData();
  const latestUpdatedAt = cases[0]?.updatedAt;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">마이페이지</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">계정 상태와 사건 정리 작업을 한 곳에서 확인합니다.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-white">
              <UserRound size={22} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">{session?.email ?? "FACTLINE 사용자"}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {session ? "현재 로그인 세션이 활성화되어 있습니다." : "세션 정보를 확인할 수 없습니다."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-stone-100 p-3">
              <FileText className="text-emerald-800" size={18} />
              <p className="mt-3 text-xl font-bold">{cases.length}</p>
              <p className="text-xs text-slate-500">내 사건</p>
            </div>
            <div className="rounded-lg bg-stone-100 p-3">
              <CalendarDays className="text-sky-800" size={18} />
              <p className="mt-3 text-xl font-bold">{latestUpdatedAt ? formatDate(latestUpdatedAt) : "기록 없음"}</p>
              <p className="text-xs text-slate-500">최근 수정</p>
            </div>
            <div className="rounded-lg bg-stone-100 p-3">
              <ShieldCheck className="text-emerald-800" size={18} />
              <p className="mt-3 text-xl font-bold">{cases.filter((caseItem) => caseItem.isLocked).length}</p>
              <p className="text-xs text-slate-500">잠긴 사건</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-bold">계정 작업</h2>
          <Link href="/settings/security" className="flex items-center gap-3 rounded-lg border border-stone-200 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-stone-50">
            <LockKeyhole size={17} />
            보안 설정 보기
          </Link>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="outline" className="w-full">
              <LogOut size={17} />
              로그아웃
            </Button>
          </form>
          <p className="text-xs leading-5 text-slate-500">
            계정 삭제는 보안 설정 화면에서 한 번 더 확인 후 요청할 수 있습니다.
          </p>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">내 사건</h2>
          <Link href="/cases/new" className="text-sm font-semibold text-emerald-800">새 사건</Link>
        </div>
        <CaseManagementList
          initialCases={cases.map((caseItem) => ({
            id: caseItem.id,
            title: caseItem.title,
            type: caseItem.type,
            status: caseItem.status,
            updatedAt: formatDate(caseItem.updatedAt),
            isLocked: caseItem.isLocked,
          }))}
        />
      </section>
    </div>
  );
}
