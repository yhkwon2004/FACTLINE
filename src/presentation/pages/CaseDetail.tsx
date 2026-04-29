import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, Button, Badge } from "../components/UI";
import { 
  ArrowLeft, 
  Settings, 
  Calendar, 
  FileText, 
  Zap, 
  Plus, 
  Clock, 
  MapPin, 
  User, 
  Info,
  AlertTriangle,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const CaseDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"timeline" | "evidence" | "analysis">("timeline");

  const [events, setEvents] = useState([
    { id: "e1", title: "최초 연락", description: "카카오톡을 통해 투자 권유를 받음", datetime: "2024-05-10 14:00", location: "카카오톡", actor: "홍길동", source: "INTERVIEW" },
    { id: "e2", title: "계약서 송부", description: "이메일로 투자 계약서 초안을 수령함", datetime: "2024-05-12 10:30", location: "이메일", actor: "홍길동", source: "EVIDENCE" },
  ]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link to="/cases" className="p-2 -ml-2 text-slate-400">
          <ArrowLeft size={20} />
        </Link>
        <button className="p-2 text-slate-400">
          <Settings size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <Badge color="amber">분석 진행 중</Badge>
          <h2 className="text-3xl font-black italic tracking-tighter text-slate-900">2024-L-0402: 사기 피해 관련 사실 정리</h2>
        </div>
        
        {/* 6W Analysis Grid */}
        <Card className="p-6 border-slate-200">
          <h3 className="text-sm font-bold border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <span>📋 사건 개요 및 6W 분석</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-slate-400 mb-1 font-bold">WHO (누가)</p>
              <p className="font-bold text-slate-800">피해자(본인), 피고소인 홍길동</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-slate-400 mb-1 font-bold">WHEN (언제)</p>
              <p className="font-bold text-slate-800">2024.05.10 - 2024.05.12</p>
            </div>
             <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-slate-400 mb-1 font-bold">WHERE (어디서)</p>
              <p className="font-bold text-slate-800">카카오톡, 서울 일대</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-slate-400 mb-1 font-bold">WHAT (무엇을)</p>
              <p className="font-bold text-slate-800">투자 사기 피해 및 배상 요구</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-slate-400 mb-1 font-bold">HOW (어떻게)</p>
              <p className="font-bold text-slate-800">허위 수익률 제시 및 입금 유도</p>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
              <p className="text-indigo-600 mb-1 font-bold uppercase tracking-wider text-[9px]">Why (사유)</p>
              <p className="font-bold text-indigo-900">원금 보장 미이행 및 연락 두절</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-200/50 rounded-2xl">
          <TabButton 
            active={activeTab === "timeline"} 
            onClick={() => setActiveTab("timeline")}
            icon={<Clock size={16} />}
            label="타임라인"
          />
          <TabButton 
            active={activeTab === "evidence"} 
            onClick={() => setActiveTab("evidence")}
            icon={<FileText size={16} />}
            label="증거물"
          />
          <TabButton 
            active={activeTab === "analysis"} 
            onClick={() => setActiveTab("analysis")}
            icon={<Zap size={16} />}
            label="AI 분석"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "timeline" && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">🕐 사실관계 타임라인</h3>
              <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold px-3">
                <Plus size={14} />
                사건 추가
              </Button>
            </div>

            <div className="relative border-l-2 border-slate-200 ml-4 pl-8 space-y-10">
              {events.map((event, idx) => (
                <div key={event.id} className="relative">
                  <div className={`absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-white ring-1 ring-slate-100 ${idx === 0 ? "bg-indigo-600 ring-indigo-600" : "bg-slate-300"}`} />
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      {event.datetime}
                    </p>
                    <p className="text-sm font-bold text-slate-900">{event.title}</p>
                    <p className="text-xs text-slate-500 italic leading-relaxed">
                      "{event.description}"
                    </p>
                    
                    <div className="flex flex-wrap gap-2 pt-3">
                       <Badge color={event.source === "EVIDENCE" ? "emerald" : "slate"}>
                        {event.source === "EVIDENCE" ? "증거 확보" : "진술 기초"}
                      </Badge>
                      {event.location && <Meta text={event.location} icon={<MapPin size={10} />} />}
                      {event.actor && <Meta text={event.actor} icon={<User size={10} />} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "analysis" && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
             <div className="grid gap-3">
              <div className="px-4 py-3 bg-slate-900 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-slate-800 transition-all shadow-xl shadow-indigo-100/20" onClick={() => navigate(`/cases/${id}/statement`)}>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
                      <FileText size={20} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Natural Language Export</p>
                      <h4 className="text-sm font-bold text-white">진술서용 줄글 자동 생성</h4>
                    </div>
                 </div>
                  <ArrowRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
              </div>

              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-[10px] uppercase">
                    <AlertTriangle size={14} />
                    위험 표현 감지
                  </div>
                  <span className="text-[9px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">High</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">"반드시 수익을 보장하겠다고 했습니다"</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    감정적 과잉 표현입니다. 원문의 직접 인용이 아닐 경우 "구체적인 수익 보장 약속이 있었다"로 수정을 권장합니다.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-[10px] uppercase">
                    <Info size={14} />
                    누락 정보
                  </div>
                  <span className="text-[9px] bg-amber-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">Missing</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">입금 계좌 명의인 정보 미기재</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    손해액 특정과 피고소인과의 관계 입증을 위해 계좌 명의인 확인이 필수적입니다.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase">
                    <Lightbulb size={14} />
                    논리 모순 / 제안
                  </div>
                  <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">Alert</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">일시 불일치 가능성</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    카카오톡 대화 시점과 자료 등록 시점의 선후 관계가 모호합니다. 타임라인 재확인이 권장됩니다.
                  </p>
                </div>
              </div>
            </div>

            <Button className="w-full h-14 rounded-2xl shadow-xl shadow-indigo-100">
              <FileText size={18} />
              상담 준비 보고서 생성하기 (PDF)
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ 
  active, onClick, icon, label 
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl gap-1 transition-all ${
      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
    }`}
  >
    {icon}
    <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">{label}</span>
  </button>
);

const Meta: React.FC<{ text: string; icon: React.ReactNode }> = ({ text, icon }) => (
  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
    {icon}
    <span>{text}</span>
  </div>
);
