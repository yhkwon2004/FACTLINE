"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderOpen,
  Home,
  NotebookPen,
  Settings,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  CircleHelp,
} from "lucide-react";
import { cn } from "./UI";
const links = [
  { href: "/dashboard", label: "홈", icon: Home },
  { href: "/cases", label: "내 사건", icon: FolderOpen },
  { href: "/life", label: "기록", icon: NotebookPen },
  { href: "/mypage", label: "내 정보", icon: Settings },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-frame">
      <a className="skip-link" href="#workspace">
        본문으로 이동
      </a>
      <aside className="app-sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          EUMLOG<span className="brand-dot">.</span>
        </Link>
        <p className="brand-caption">흩어진 기록을 하나의 사실로</p>
        <nav aria-label="주 메뉴">
          {links.map((item) => (
            <Link
              aria-current={
                (
                  item.href === "/cases"
                    ? pathname.startsWith("/cases")
                    : pathname === item.href
                )
                  ? "page"
                  : undefined
              }
              className={cn(
                "nav-link",
                (item.href === "/cases"
                  ? pathname.startsWith("/cases")
                  : pathname === item.href) && "active",
              )}
              href={item.href}
              key={item.href}
            >
              <item.icon size={19} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-label">
            <ShieldCheck size={17} />
            <div>
              <strong>전용 AI로 분석</strong>
              <p>원본은 암호화해서 보관해요</p>
            </div>
          </div>
          <Link href="/settings/security" className="subtle-link">
            보관 및 보안 <ArrowUpRight size={14} />
          </Link>
          <Link href="/integrations" className="subtle-link">
            대화 가져오기 <ArrowUpRight size={14} />
          </Link>
          <Link href="/models" className="subtle-link">
            AI 학습 정보 <CircleHelp size={14} />
          </Link>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-header">
          <Link className="mobile-brand" href="/dashboard">
            EUMLOG.
          </Link>
          <span className="desktop-crumb">
            내 작업공간 <span>/</span> 증거 정리
          </span>
          <div className="header-actions">
            <span className="local-indicator">
              <i />
              암호화 보관
            </span>
            <Link href="/cases/new" className="primary-link">
              <Plus size={16} />새 사건
            </Link>
          </div>
        </header>
        <main id="workspace" className="workspace">
          {children}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="모바일 주 메뉴">
        {links.map((item) => (
          <Link
            href={item.href}
            key={item.href}
            aria-current={
              (
                item.href === "/cases"
                  ? pathname.startsWith("/cases")
                  : pathname === item.href
              )
                ? "page"
                : undefined
            }
          >
            <item.icon size={21} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
