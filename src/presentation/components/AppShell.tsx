"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Home, Link2, LockKeyhole, NotebookPen, Plus, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "./UI";
import { NoticeModal } from "./NoticeModal";
import { LEGAL_SAFETY_NOTICE } from "../../domain/constants";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: Home },
  { href: "/life", label: "일상 기록", icon: NotebookPen },
  { href: "/integrations", label: "연동", icon: Link2 },
  { href: "/cases/new", label: "새 사건", icon: Plus },
  { href: "/mypage", label: "마이페이지", icon: UserRound },
  { href: "/settings/security", label: "보안", icon: LockKeyhole },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSafetyNotice, setShowSafetyNotice] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-stone-200 bg-white md:flex md:flex-col">
        <div className="border-b border-stone-200 px-6 py-5">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            maze_FACTLINE
          </Link>
          <p className="mt-1 text-xs text-slate-500">사실관계 정리 도구</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold",
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-stone-100",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-stone-200 p-4">
          <button
            type="button"
            onClick={() => setShowSafetyNotice(true)}
            className="w-full rounded-lg bg-stone-100 p-3 text-left text-xs leading-5 text-slate-600 transition hover:bg-stone-200"
          >
            <div className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
              <ShieldCheck size={15} />
              기록 안전 안내
            </div>
            클릭해서 자세히 보기
          </button>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link href="/dashboard" className="font-bold md:hidden">
              maze_FACTLINE
            </Link>
            <div className="hidden items-center gap-2 text-sm font-semibold text-slate-600 md:flex">
              <Briefcase size={17} />
            생활 기록과 상담 준비 작업공간
            </div>
            <Link
              href="/cases/new"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white"
            >
              <Plus size={16} />
              사건 추가
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-5 pb-24 md:px-8 md:py-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-stone-200 bg-white md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold", active ? "text-emerald-800" : "text-slate-500")}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <NoticeModal
        open={showSafetyNotice}
        title="기록 안전 안내"
        description={`${LEGAL_SAFETY_NOTICE}\n\nFACTLINE은 사용자가 입력한 사실을 정리하는 도구이며, 유죄·무죄 판단이나 법률 조언을 제공하지 않습니다.`}
        tone="warning"
        actionLabel="확인했습니다"
        onClose={() => setShowSafetyNotice(false)}
      />
    </div>
  );
}
