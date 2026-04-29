import { LEGAL_SAFETY_NOTICE } from "../../../../../domain/constants";
import { ReportView } from "../../../../../presentation/components/ReportView";

const statement = `진술서 초안

본인은 2026년 3월 4일경 메신저를 통해 상대방으로부터 투자 참여 권유를 받았습니다.

2026년 3월 6일경 상대방은 특정 계좌로 계약금을 송금해 달라고 요청했습니다. 이 내용은 메신저 대화 캡처와 이체 내역으로 확인할 예정입니다.

현재 입금 계좌 명의자, 상대방 신원 확인 자료, 실제 피해 금액은 추가 확인이 필요합니다.

${LEGAL_SAFETY_NOTICE}`;

export default function StatementPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">진술서 초안</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">타임라인과 원문 진술을 바탕으로 상담 전 문장 형태로 정리합니다.</p>
      </div>
      <ReportView content={statement} />
    </div>
  );
}

