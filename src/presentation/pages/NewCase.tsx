import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Input } from "../components/UI";
import { ArrowLeft, ArrowRight, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const NewCase: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    agreement: false
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = () => {
    // Save placeholder
    navigate("/cases/1");
  };

  const incidentTypes = [
    { id: "FRAUD", label: "사기/재산범죄", icon: "💰" },
    { id: "VIOLENCE", label: "폭행/상해", icon: "👊" },
    { id: "DEFAMATION", label: "명예훼손/모욕", icon: "💬" },
    { id: "WORK", label: "직장 내 괴롭힘/노동", icon: "🏢" },
    { id: "OTHER", label: "기타 일반 사건", icon: "⚖️" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => step === 1 ? navigate(-1) : prevStep()} className="p-2 -ml-2 text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold">새 사건 만들기</h2>
          <p className="text-xs text-slate-400 font-medium tracking-widest">{step} / 3 단계</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h3 className="text-lg font-bold">사건의 기본 정보</h3>
              <Input 
                label="사건 제목" 
                placeholder="예: 2024년 5월 투자 사기 건" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <Button className="w-full" disabled={!formData.title} onClick={nextStep}>
              다음 단계로
              <ArrowRight size={20} />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h3 className="text-lg font-bold">사건 유형 선택</h3>
              <div className="grid gap-3">
                {incidentTypes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setFormData({...formData, type: t.id})}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                      formData.type === t.id 
                        ? "border-slate-900 bg-slate-50" 
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className="font-bold">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" disabled={!formData.type} onClick={nextStep}>
              다음 단계로
              <ArrowRight size={20} />
            </Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h3 className="text-lg font-bold">주의사항 안내</h3>
              <Card className="bg-blue-50 border-blue-100 space-y-4">
                <div className="flex gap-3">
                  <Shield className="text-blue-600 flex-shrink-0" size={20} />
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm text-blue-900">법적 효력 고지</h4>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      FACTLINE은 법률 자문 서비스가 아닙니다. AI는 사실 관계의 정리를 돕는 도구일 뿐이며, 법적 판단이나 대응 방향에 대해서는 반드시 변호사와 상담하시기 바랍니다.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-blue-100">
                  <input 
                    type="checkbox" 
                    id="agreement" 
                    className="w-5 h-5 accent-blue-600" 
                    checked={formData.agreement}
                    onChange={e => setFormData({...formData, agreement: e.target.checked})}
                  />
                  <label htmlFor="agreement" className="text-xs font-bold text-blue-900">
                    위 사항을 확인하였으며 서비스 이용에 동의합니다.
                  </label>
                </div>
              </Card>
            </div>
            <Button className="w-full" disabled={!formData.agreement} onClick={handleSubmit}>
              사건 생성 완료
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
