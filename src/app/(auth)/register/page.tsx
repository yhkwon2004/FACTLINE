import {GoogleSignIn} from "../../../presentation/components/GoogleSignIn";
import {googleConfigured,passwordLoginEnabled} from "../../../infrastructure/security/GoogleIdentity";
import Link from "next/link";
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
    <main className="auth-page">
      <Card className="auth-card w-full max-w-md space-y-6">
        <div>
          <div className="auth-brand"><span className="brand-mark" aria-hidden="true"><span/><span/><span/></span>EUMLOG<span className="brand-dot">.</span></div>
          <h1 className="text-2xl font-bold tracking-tight">회원가입</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Google로 시작하고 원본은 내 기기에 보관하세요.</p>
        </div>
        <GoogleSignIn next={next}/>
        {passwordLoginEnabled() ? (googleConfigured()?<details className="auth-email-fallback"><summary>이메일로 가입</summary><RegisterForm next={next}/></details>:<RegisterForm next={next}/>) : null}
        <p className="text-center text-sm text-slate-600">
          이미 계정이 있나요?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-emerald-800">
            로그인
          </Link>
        </p>
        <Link href="/privacy" className="block text-center text-xs text-slate-600 underline underline-offset-4">개인정보 처리방침</Link>
      </Card>
    </main>
  );
}
