import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, Button, Badge } from "../components/UI";
import { ArrowLeft, Copy, Check, Download, FileText, Share2 } from "lucide-react";
import { motion } from "motion/react";

export const StatementDraft: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Mock narrative content based on case data
  const narrativeContent = `진 술 서

사건명: 2024-L-0402 투자 사기 피해 관련 사실 관계 정리

[본문]

본인은 2024년 5월 10일경, 피고소인 홍길동으로부터 카카오톡 메시지를 통해 "확실한 수익이 보장되는 신규 투자처가 있다"는 연락을 받았습니다. 당시 홍길동은 "원금 보장은 물론 월 10% 이상의 배당을 확약하겠다"며 본인을 유도하였습니다.

이후 2024년 5월 12일 오전 10시 30분경, 본인은 홍길동으로부터 이메일을 통해 투자 계약서 초안을 수령하였습니다. 해당 계약서에는 본인이 언급했던 수익 보장 문구가 명시되어 있음을 확인하였고, 이를 신뢰한 본인은 당일 오후 홍길동이 지정한 계좌로 투자금을 송금하였습니다.

그러나 약속된 배당 기일이 지났음에도 수익금은 지급되지 않았으며, 현재 홍길동은 연락이 두절된 상태입니다. 이에 본인은 당시 대화 내용과 수령한 이메일 등 증거 자료를 바탕으로 본 사건의 진술을 작성합니다.

위 내용은 본인이 직접 겪은 사실과 일치함을 확인합니다.

2024년 4월 29일
진술인: (성명 기재)`;

  const handleCopy = () => {
    navigator.clipboard.writeText(narrativeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link to={`/cases/${id}`} className="p-2 -ml-2 text-slate-400">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="text-[10px] font-bold uppercase tracking-tight">
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy Text"}
          </Button>
          <Button size="sm" className="text-[10px] font-bold uppercase tracking-tight shadow-lg shadow-indigo-100">
            <Download size={14} />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Badge color="indigo">Statement Draft</Badge>
        <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-tight">
           진술서 초안 가공
        </h2>
        <p className="text-slate-500 text-xs font-medium">
          사건 일지를 바탕으로 AI가 자동 생성한 줄글 형태의 기록입니다. 상담 시 기초 자료로 활용하세요.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-8 border-slate-200 bg-white shadow-2xl shadow-indigo-50/50 min-h-[500px]">
          <pre className="whitespace-pre-wrap font-serif text-slate-800 leading-[1.8] text-sm md:text-base selection:bg-indigo-100 italic">
            {narrativeContent}
          </pre>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-slate-900 border-none text-white flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Share with Expert</p>
            <p className="text-xs font-medium opacity-80">변호사에게 즉시 전송하기</p>
          </div>
          <button className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
            <Share2 size={18} />
          </button>
        </Card>
        
        <Card className="p-4 border-slate-200 flex items-center justify-between">
           <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Structure Summary</p>
            <p className="text-xs font-bold text-slate-700">6W 요약표 포함</p>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-indigo-600 flex items-center justify-center">
            <div className="w-2 h-2 bg-indigo-600 rounded-full" />
          </div>
        </Card>
      </div>
    </div>
  );
};
