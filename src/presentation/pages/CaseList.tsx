import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button, Badge } from "../components/UI";
import { Plus, ChevronRight, Lock, Clock } from "lucide-react";

export const CaseList: React.FC = () => {
  const [cases, setCases] = useState<any[]>([]);

  useEffect(() => {
    // Mocking for now, will connect to API later
    setCases([
      { id: "1", title: "2024-L-0402: 사기 피해 관련 사실 정리", type: "FRAUD", status: "IN_PROGRESS", createdAt: new Date() },
      { id: "2", title: "2024-L-0115: 명예훼손 고소장 준비", type: "DEFAMATION", status: "CLOSED", createdAt: new Date(), isLocked: true },
    ]);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black italic tracking-tighter text-slate-900">CASE MANAGEMENT</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] ml-1">사건 목록 및 현황</p>
        </div>
        <Link to="/cases/new">
          <Button size="sm" className="rounded-xl h-10 w-10 p-0 shadow-lg shadow-indigo-100">
            <Plus size={20} />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {cases.map((c) => (
          <Link key={c.id} to={`/cases/${c.id}`}>
            <Card className="hover:border-indigo-400 transition-all cursor-pointer group hover:shadow-xl hover:shadow-indigo-50/50 p-6 flex flex-col gap-4 border-slate-200/60">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg group-hover:text-indigo-600 transition-colors">{c.title}</h3>
                    {c.isLocked && <Lock size={14} className="text-slate-300" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color={c.status === "IN_PROGRESS" ? "amber" : "slate"}>
                      {c.status === "IN_PROGRESS" ? "분석 중" : "정리 완료"}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                      <Clock size={12} />
                      {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <ChevronRight size={18} />
                </div>
              </div>
            </Card>
          </Link>
        ))}

        {cases.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <p className="text-slate-400">등록된 사건이 없습니다.</p>
            <Link to="/cases/new">
              <Button variant="outline">신규 사건 등록</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
