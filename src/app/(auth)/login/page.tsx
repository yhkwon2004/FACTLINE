import {GoogleSignIn} from "../../../presentation/components/GoogleSignIn";
import {googleConfigured,passwordLoginEnabled} from "../../../infrastructure/security/GoogleIdentity";
import { AuthNavigationPolicy } from "../../../application/services/AuthNavigationPolicy";
import { LoginForm } from "../../../presentation/components/AuthForm";
import { Card } from "../../../presentation/components/UI";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const next = new AuthNavigationPolicy().normalizeReturnPath(params.next);
  const isAuthRequired = params.reason === "auth-required";

  return (
    <main className="auth-page">
      <Card className="auth-card w-full max-w-md space-y-6">
        <div>
          <div className="auth-brand"><span className="brand-mark" aria-hidden="true"><span/><span/><span/></span>EUMLOG<span className="brand-dot">.</span></div>
          <h1 className="text-2xl font-bold tracking-tight">로그인</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">내 기록을 안전하게 이어가세요.</p>
        </div>
        <GoogleSignIn next={next}/>
        {passwordLoginEnabled() ? (googleConfigured()?<details className="auth-email-fallback"><summary>이메일로 계속</summary><LoginForm next={next} isAuthRequired={isAuthRequired}/></details>:<LoginForm next={next} isAuthRequired={isAuthRequired}/>) : null}
        <Link href="/privacy" className="block text-center text-xs text-slate-600 underline underline-offset-4">개인정보 처리방침</Link>
      </Card>
    </main>
  );
}
