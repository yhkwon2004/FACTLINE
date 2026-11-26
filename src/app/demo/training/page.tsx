import Link from "next/link";
import { TrainingReport } from "../../../presentation/components/TrainingReport";

export const metadata = { title: "학습 자료와 평가 · 이음로그" };

export default function TrainingPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/demo" className="text-sm text-blue-700">← 가상 사건 시연</Link>
      <h1 className="my-6 text-3xl font-bold">학습 자료와 평가</h1>
      <TrainingReport />
    </main>
  );
}
