import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, Home, Briefcase, FileText, Settings, User as UserIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Badge } from "./UI";

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar - Hidden on mobile, shown on md+ */}
      <aside className="hidden md:flex w-64 bg-slate-900 flex-col h-screen sticky top-0 border-r border-slate-800">
        <div className="p-8 mb-4">
          <h1 className="text-white font-bold text-2xl tracking-tighter italic">FACTLINE</h1>
          <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-widest font-bold opacity-60">AI-Assisted Legal Prep</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <SidebarItem to="/" icon={<Home size={18} />} label="대시보드" />
          <SidebarItem to="/cases" icon={<Briefcase size={18} />} label="사건 관리" />
          <SidebarItem to="/reports" icon={<FileText size={18} />} label="구조화 보고서" />
          <SidebarItem to="/profile" icon={<UserIcon size={18} />} label="계정 설정" />
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="p-3 bg-indigo-900/40 rounded-xl border border-indigo-500/20">
            <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider">System Status</p>
            <div className="flex items-center mt-2 text-white">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse mr-2 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
              <span className="text-[11px] font-medium">AI Engine Ready</span>
            </div>
          </div>
          <div className="mt-4 flex items-center text-slate-600 text-[10px] px-2 italic">
            법률 상담 전 사실관계 정리 전용
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="md:hidden">
               <h1 className="text-xl font-black italic tracking-tighter text-slate-900">FL</h1>
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Status</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">FACTLINE 분석 대기 중</span>
                <Badge color="amber">Standby</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors md:hidden">
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-3">
              <button className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Export JSON</button>
              <button className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">New Sync</button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-5xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="hidden md:flex h-12 bg-slate-50 border-t border-slate-200 px-8 items-center justify-center">
          <p className="text-[10px] text-slate-400 font-medium">
            본 자료는 법률 자문이 아닙니다. 참고용으로 제공되며 최종 판단은 전문가 상담이 필요합니다.
          </p>
        </footer>

        {/* Mobile Nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 md:hidden">
          <div className="flex justify-around items-center h-16 px-4">
            <MobileNavItem to="/" icon={<Home size={22} />} label="홈" />
            <MobileNavItem to="/cases" icon={<Briefcase size={22} />} label="사건" />
            <MobileNavItem to="/reports" icon={<FileText size={22} />} label="보고서" />
            <MobileNavItem to="/profile" icon={<UserIcon size={22} />} label="설정" />
          </div>
        </nav>
      </div>
    </div>
  );
};

const SidebarItem: React.FC<NavItemProps> = ({ to, icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all gap-3 ${
          isActive 
            ? "bg-slate-800 text-white shadow-lg" 
            : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
        }`
      }
    >
      <span className="opacity-70">{icon}</span>
      {label}
    </NavLink>
  );
};

const MobileNavItem: React.FC<NavItemProps> = ({ to, icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
          isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
        }`
      }
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </NavLink>
  );
};
