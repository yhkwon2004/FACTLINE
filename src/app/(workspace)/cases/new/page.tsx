import { NewCaseForm } from "../../../../presentation/components/NewCaseForm";

export default function NewCasePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">새 사건</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          어떤 일을 정리하고 싶으신가요?
        </p>
      </div>
      <NewCaseForm />
    </div>
  );
}
