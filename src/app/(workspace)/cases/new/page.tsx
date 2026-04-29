import { NewCaseForm } from "../../../../presentation/components/NewCaseForm";

export default function NewCasePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">새 사건 만들기</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">사건명과 유형만 먼저 저장하고, 세부 내용은 셀프 기록 단계에서 보완합니다.</p>
      </div>
      <NewCaseForm />
    </div>
  );
}
