import { NewCaseForm } from "../../../../presentation/components/NewCaseForm";

export default function NewCasePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">새 정리 시작</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          문제가 된 흐름을 하나의 묶음으로 만들고, 다이어리와 증거를 퍼즐처럼 연결해 시간순으로 정리합니다.
        </p>
      </div>
      <NewCaseForm />
    </div>
  );
}
