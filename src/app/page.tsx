import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, FileText, LockKeyhole, NotebookPen } from "lucide-react";
import { LEGAL_SAFETY_NOTICE } from "../domain/constants";
import { Badge, Card } from "../presentation/components/UI";

const features = [
  {
    title: "일상 기록",
    text: "생활 메모, 일정, 불편했던 일, 확인할 일을 가볍게 남깁니다.",
    icon: NotebookPen,
  },
  {
    title: "기간별 묶기",
    text: "문제가 생겼을 때 관련 기록을 기간과 시간순으로 모아 봅니다.",
    icon: CalendarDays,
  },
  {
    title: "보안 중심 작업공간",
    text: "개인 기록은 계정 단위로 분리하고 증거 파일은 해시 중심으로 관리합니다.",
    icon: LockKeyhole,
  },
];

export default function EntryPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-stone-200 bg-white/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            maze_FACTLINE
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-100">
              로그인
            </Link>
            <Link href="/register" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
              회원가입
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-20">
        <div className="space-y-6">
          <Badge tone="green">AI does not judge. AI organizes facts.</Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              평소의 기록을,
              <br />
              필요할 때 사실관계로 정리하세요.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              maze_FACTLINE은 일상 기록 앱입니다. 평소에는 생활과 일정을 남기고, 문제가 생겼을 때 관련 기록을 불러와
              기간별·시간별 사실관계로 정리합니다.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/life" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white">
              일상 기록 시작
              <ArrowRight size={17} />
            </Link>
            <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-lg border border-stone-300 bg-white px-5 text-sm font-bold text-slate-800">
              기존 작업 이어가기
            </Link>
          </div>
        </div>

        <Card className="space-y-5 p-5">
          <div>
            <p className="text-sm font-bold text-slate-900">기록이 쌓이면 가능한 정리</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">일상 기록에서 필요한 부분만 연결합니다.</p>
          </div>
          {["일상 메모", "일정", "위치/사람", "관련 자료", "기간별 묶음", "사건 연결", "상담 준비용 출력"].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-lg bg-stone-100 px-3 py-2 text-sm font-semibold text-slate-700">
              <CheckCircle2 className="text-emerald-800" size={17} />
              {item}
            </div>
          ))}
          <div className="rounded-lg border border-stone-200 bg-white p-3 text-xs leading-5 text-slate-600">
            {LEGAL_SAFETY_NOTICE}
          </div>
        </Card>
      </section>

      <section className="mx-auto grid max-w-6xl gap-3 px-4 pb-12 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="p-5">
              <Icon className="text-emerald-800" size={22} />
              <h2 className="mt-4 font-bold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
