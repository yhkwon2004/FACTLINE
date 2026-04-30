import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  CalendarDays,
  FileCheck2,
  Link2,
  ListChecks,
  MessageSquareText,
  NotebookPen,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { createContainer } from "../../../infrastructure/di/container";
import { CaseCard } from "../../../presentation/components/CaseCard";
import { Badge, Card } from "../../../presentation/components/UI";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

async function getDashboardData() {
  const token = (await cookies()).get("factline_session")?.value;
  const container = createContainer();
  const session = token ? await container.sessionService.verify(token) : null;
  if (!session?.userId) return { cases: [], lifeRecords: [], evidenceCount: 0, lifeRecordCount: 0, memoryRecordCount: 0 };

  const cases = await container.caseService.list(session.userId);
  const lifeRecords = await container.lifeRecordService.list(session.userId);
  const memoryData = await container.memoryIntegrationService.list(session.userId);
  return {
    cases,
    lifeRecords: lifeRecords.slice(0, 5),
    evidenceCount: cases.reduce((count, caseItem) => count + caseItem.evidences.length, 0),
    lifeRecordCount: lifeRecords.length,
    memoryRecordCount: memoryData.records.length,
  };
}

export default async function DashboardPage() {
  const { cases, lifeRecords, evidenceCount, lifeRecordCount, memoryRecordCount } = await getDashboardData();

  const quickActions = [
    {
      href: "/life",
      title: "오늘 다이어리",
      description: "일상, 일정, 불편했던 일, 기억할 사람과 장소를 빠르게 남깁니다.",
      icon: NotebookPen,
      badge: "평소 사용",
    },
    {
      href: "/integrations",
      title: "대화 가져오기",
      description: "카카오톡 내보내기, 이메일, 문자 등 흩어진 기록을 시간순으로 모읍니다.",
      icon: Link2,
      badge: "자료 연결",
    },
    {
      href: "/cases/new",
      title: "문제 정리 시작",
      description: "필요한 순간에 관련 기록과 증거를 골라 하나의 사건 흐름으로 묶습니다.",
      icon: Plus,
      badge: "사건 생성",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <Badge tone="green">maze_FACTLINE</Badge>
          <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">오늘의 기록 허브</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            평소에는 다이어리처럼 기록하고, 문제가 생겼을 때만 필요한 대화와 증거를 불러와 시간순으로 정리합니다.
          </p>
        </div>
        <Card className="bg-slate-900 text-white shadow-none">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 text-emerald-200" size={22} />
            <div>
              <p className="text-sm font-bold">사실 기반 정리 원칙</p>
              <p className="mt-1 text-xs leading-5 text-slate-200">
                AI는 판단하지 않고 사용자가 남긴 기록, 대화, 증거 메타데이터만 정리합니다.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-slate-900">
                  <Icon size={20} />
                </div>
                <Badge tone="slate">{action.badge}</Badge>
              </div>
              <h2 className="mt-4 font-bold text-slate-950">{action.title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{action.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-800">
                열기
                <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <ListChecks className="text-emerald-800" size={20} />
            <Badge tone="green">사건</Badge>
          </div>
          <p className="mt-3 text-2xl font-bold">{cases.length}</p>
          <p className="text-sm text-slate-500">정리 중인 사건</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <NotebookPen className="text-emerald-800" size={20} />
            <Badge tone="green">다이어리</Badge>
          </div>
          <p className="mt-3 text-2xl font-bold">{lifeRecordCount}</p>
          <p className="text-sm text-slate-500">일상 기록</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <MessageSquareText className="text-sky-800" size={20} />
            <Badge tone="blue">대화</Badge>
          </div>
          <p className="mt-3 text-2xl font-bold">{memoryRecordCount}</p>
          <p className="text-sm text-slate-500">가져온 메시지/자료</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <FileCheck2 className="text-sky-800" size={20} />
            <Badge tone="blue">증거</Badge>
          </div>
          <p className="mt-3 text-2xl font-bold">{evidenceCount}</p>
          <p className="text-sm text-slate-500">사건 연결 항목</p>
        </Card>
      </div>

      <Card className="space-y-4 bg-stone-100 shadow-none">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-emerald-800" />
          <h2 className="font-bold">기록을 사건으로 묶는 흐름</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["1", "오늘 있었던 일 작성", "시간, 장소, 관련 사람, 느낀 불편함을 다이어리처럼 남깁니다."],
            ["2", "대화와 증거 선택", "카카오톡 내보내기, 이메일, 사진, 파일 중 관련 항목만 고릅니다."],
            ["3", "셀프 기록으로 정리", "AI가 빠진 정보와 추가 질문을 제안하고 진술서 초안을 만듭니다."],
          ].map(([step, title, description]) => (
            <div key={step} className="rounded-lg border border-stone-200 bg-white p-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">{step}</span>
              <p className="mt-3 text-sm font-bold text-slate-900">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">최근 다이어리</h2>
            <Link href="/life" className="text-sm font-semibold text-emerald-800">전체 보기</Link>
          </div>
          <div className="grid gap-3">
            {lifeRecords.length > 0 ? (
              lifeRecords.map((record) => (
                <Card key={record.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone={record.type === "ISSUE" ? "amber" : record.type === "SCHEDULE" ? "blue" : "green"}>
                        {record.type === "ISSUE" ? "불편/갈등" : record.type === "SCHEDULE" ? "일정" : record.type === "EVENT" ? "생활 사건" : "일상"}
                      </Badge>
                      <h3 className="mt-2 font-bold text-slate-900">{record.title}</h3>
                    </div>
                    <span className="text-xs text-slate-500">{formatDateTime(record.occurredAt ?? record.createdAt)}</span>
                  </div>
                  <p className="line-clamp-2 text-sm leading-6 text-slate-600">{record.content}</p>
                </Card>
              ))
            ) : (
              <Card className="space-y-3 text-sm leading-6 text-slate-600">
                <p>아직 남긴 일상 기록이 없습니다. 오늘 있었던 일을 짧게 적어두면 나중에 날짜별로 다시 찾을 수 있습니다.</p>
                <Link href="/life" className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">
                  다이어리 쓰기
                </Link>
              </Card>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">최근 사건 정리</h2>
            <Link href="/cases/new" className="text-sm font-semibold text-emerald-800">새로 만들기</Link>
          </div>
          <div className="grid gap-3">
            {cases.length > 0 ? (
              cases.slice(0, 5).map((caseItem) => (
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
                <p>아직 정리 중인 사건이 없습니다. 문제가 생겼을 때 일상 기록과 증거를 골라 사건 흐름으로 묶을 수 있습니다.</p>
                <Link href="/cases/new" className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">
                  첫 사건 만들기
                </Link>
              </Card>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
