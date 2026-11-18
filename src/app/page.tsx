import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileCheck2, ShieldCheck } from "lucide-react";
import { currentSession } from "./api/_utils";
export default async function Home() {
  if (await currentSession()) redirect("/dashboard");
  return (
    <main className="mx-auto max-w-5xl px-7 py-12">
      <header className="flex items-center justify-between">
        <Link className="brand" href="/">
          EUMLOG<span className="brand-dot">.</span>
        </Link>
        <Link href="/login" className="text-sm text-teal-800 font-semibold">
          로그인
        </Link>
      </header>
      <div className="grid gap-12 items-center md:grid-cols-2 py-20 md:py-28">
        <section>
          <p className="text-xs tracking-wide text-teal-700 mb-6">
            나의 기록, 나의 근거
          </p>
          <h1 className="!text-4xl md:!text-5xl !leading-tight">
            흩어진 기록을
            <br />
            하나의 사실로.
          </h1>
          <p className="muted mt-7 !text-base leading-8">
            사진 한 장, 대화 한 줄부터.
            <br />
            원본을 지키고 필요한 순간 꺼내보세요.
          </p>
          <Link className="primary-link mt-9 !min-h-12 !px-6" href="/register">
            내 기록 시작하기
            <ArrowRight size={17} />
          </Link>
          <p className="mt-6 text-xs text-slate-500 flex gap-2 items-center">
            <ShieldCheck size={14} />
            내 자료를 지키는 전용 AI 분석
          </p>
        </section>
        <section
          className="rounded-[28px] bg-[#e9f3ef] p-8 md:p-12"
          aria-label="기록 정리 과정"
        >
          <div className="rounded-2xl border border-white bg-white/90 p-6">
            <div className="flex items-center gap-3 mb-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <FileCheck2 size={22} />
              </span>
              <div>
                <h2>나의 기록함</h2>
                <p className="muted !text-[11px]">원본부터 시간순 정리까지</p>
              </div>
            </div>
            {[
              ["01", "자료를 보관하고", "#e8f4f0"],
              ["02", "원문에서 사실을 찾고", "#edf0f7"],
              ["03", "확인한 기록을 연결해요", "#f8eee8"],
            ].map(([n, t, color]) => (
              <div
                key={n}
                className="flex items-center gap-4 py-5 px-4 rounded-xl mb-3"
                style={{ background: color }}
              >
                <span className="text-xs text-slate-500">{n}</span>
                <p className="text-sm font-semibold">{t}</p>
              </div>
            ))}
            <p className="text-[11px] text-slate-500 mt-6 leading-6">
              AI의 제안은 원문과 함께 확인합니다.
              <br />
              사용자가 선택한 내용만 기록으로 이어집니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
