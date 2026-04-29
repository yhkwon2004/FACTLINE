import React from "react";
import { Link } from "react-router-dom";
import { Card, Button, Badge } from "../components/UI";
import { ShieldCheck, Calendar, FileCheck, ArrowRight } from "lucide-react";

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col gap-10">
      <section className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-slate-900 leading-[1.1]">
            당신의 사실을 <br />
            하나의 <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">선</span>으로 잇다.
          </h2>
          <p className="text-slate-500 font-bold text-sm md:text-base max-w-sm">
            AI가 사건의 구조화를 돕고 법률 상담을 완벽하게 준비해드립니다.
          </p>
        </div>
        
        <Link to="/cases/new">
          <Button className="w-full h-16 text-lg rounded-2xl shadow-xl shadow-indigo-100 font-black italic uppercase">
            사건 분석 시작하기
            <ArrowRight size={22} className="ml-2" />
          </Button>
        </Link>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Core Utility</h3>
        </div>
        
        <Card className="flex flex-col gap-4 p-6 border-slate-200/60 hover:border-indigo-400 transition-all duration-300">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Calendar className="text-indigo-600" size={24} />
          </div>
          <div className="space-y-2">
            <h4 className="font-black italic text-sm uppercase">지능형 타임라인</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">진술을 바탕으로 사건의 흐름을 자동으로 시각화합니다.</p>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6 border-slate-200/60 hover:border-rose-400 transition-all duration-300">
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
            <ShieldCheck className="text-rose-600" size={24} />
          </div>
          <div className="space-y-2">
            <h4 className="font-black italic text-sm uppercase">진술 리스크 탐지</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">모순되거나 감정적인 표현 등 불필요한 요소를 즉시 체크합니다.</p>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6 border-slate-200/60 hover:border-emerald-400 transition-all duration-300">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
            <FileCheck className="text-emerald-600" size={24} />
          </div>
          <div className="space-y-2">
            <h4 className="font-black italic text-sm uppercase">구조화 보고서</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">변호사 상담 시 바로 활용 가능한 법률용 문서를 자동 생성합니다.</p>
          </div>
        </Card>
      </section>

      <Card className="bg-slate-900 border-none relative overflow-hidden p-8 shadow-2xl shadow-indigo-200/20">
        <div className="relative z-10 space-y-6">
          <div className="text-white space-y-2">
            <div className="flex items-center gap-2">
               <h4 className="text-xl font-black italic tracking-tight">SECURITY FIRST</h4>
               <Badge color="emerald">Trusted</Badge>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed font-medium opacity-80">
              귀하의 모든 진술 데이터는 AES-256 방식으로 로컬/서버 암호화되어 안전하게 보호됩니다. AI 엔진은 익명화된 텍스트만 처리합니다.
            </p>
          </div>
          <Button variant="secondary" size="sm" className="bg-white/10 text-white hover:bg-white/20 border-none font-bold text-[10px] uppercase">
            보안 아키텍처 보기
          </Button>
        </div>
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -left-8 top-1/2 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
      </Card>
    </div>
  );
};
