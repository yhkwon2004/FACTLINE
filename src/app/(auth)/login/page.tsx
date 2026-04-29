import { Scale } from "lucide-react";
import { AuthNavigationPolicy } from "../../../application/services/AuthNavigationPolicy";
import { LoginForm } from "../../../presentation/components/AuthForm";
import { Card } from "../../../presentation/components/UI";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const next = new AuthNavigationPolicy().normalizeReturnPath(params.next);
  const isAuthRequired = params.reason === "auth-required";

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-8">
      <Card className="w-full max-w-md space-y-6">
        <div>
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Scale size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">로그인</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">사실관계 정리 작업공간으로 이동합니다.</p>
        </div>
        <LoginForm next={next} isAuthRequired={isAuthRequired} />
      </Card>
    </main>
  );
}
