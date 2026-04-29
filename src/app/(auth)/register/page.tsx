import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthNavigationPolicy } from "../../../application/services/AuthNavigationPolicy";
import { RegisterForm } from "../../../presentation/components/AuthForm";
import { Card } from "../../../presentation/components/UI";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = new AuthNavigationPolicy().normalizeReturnPath(params.next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-8">
      <Card className="w-full max-w-md space-y-6">
        <div>
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-white">
            <ShieldCheck size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">회원가입</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">사건 자료는 계정 단위로 분리하여 관리합니다.</p>
        </div>
        <RegisterForm next={next} />
        <p className="text-center text-sm text-slate-600">
          이미 계정이 있나요?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-emerald-800">
            로그인
          </Link>
        </p>
      </Card>
    </main>
  );
}
