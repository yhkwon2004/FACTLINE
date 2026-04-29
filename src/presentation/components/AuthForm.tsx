"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { LEGAL_SAFETY_NOTICE } from "../../domain/constants";
import { Button, Field, Input } from "./UI";
import { NoticeModal } from "./NoticeModal";

type NoticeState = {
  title: string;
  description: string;
  tone: "info" | "success" | "warning" | "danger";
  actionLabel?: string;
  onAction?: () => void;
};

function passwordIssue(password: string) {
  if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return "비밀번호에는 영문과 숫자를 함께 포함해 주세요.";
  return null;
}

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (name.length < 2) {
      setNotice({ title: "이름을 확인해 주세요", description: "기록을 구분할 수 있도록 이름을 2자 이상 입력해 주세요.", tone: "warning" });
      return;
    }

    const issue = passwordIssue(password);
    if (issue) {
      setNotice({ title: "비밀번호를 보강해 주세요", description: issue, tone: "warning" });
      return;
    }

    if (password !== confirmPassword) {
      setNotice({ title: "비밀번호가 일치하지 않습니다", description: "비밀번호와 비밀번호 확인란을 같은 값으로 입력해 주세요.", tone: "warning" });
      return;
    }

    if (!agreed) {
      setNotice({ title: "안전 안내 확인이 필요합니다", description: LEGAL_SAFETY_NOTICE, tone: "info" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, next }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "회원가입을 완료할 수 없습니다.");

      setNotice({
        title: "계정이 생성되었습니다",
        description: "이제 일상 기록과 사건 정리를 계정 단위로 안전하게 이어갈 수 있습니다.",
        tone: "success",
        actionLabel: "작업공간으로 이동",
        onAction: () => router.push(payload.next ?? next),
      });
    } catch (error) {
      setNotice({
        title: "회원가입을 완료하지 못했습니다",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
        tone: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form className="space-y-4" onSubmit={submit}>
        <input type="hidden" name="next" value={next} />
        <Field label="이름">
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
            <Input name="name" required className="pl-9" autoComplete="name" />
          </div>
        </Field>
        <Field label="이메일">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
            <Input name="email" type="email" required className="pl-9" autoComplete="email" />
          </div>
        </Field>
        <Field label="비밀번호">
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
            <Input name="password" type="password" minLength={8} required className="pl-9" autoComplete="new-password" />
          </div>
        </Field>
        <Field label="비밀번호 확인">
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
            <Input name="confirmPassword" type="password" minLength={8} required className="pl-9" autoComplete="new-password" />
          </div>
        </Field>
        <label className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-slate-700">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1 h-4 w-4 rounded border-stone-300" />
          <span>FACTLINE은 법률 자문이 아니라 사실 정리 도구라는 안내를 확인했습니다.</span>
        </label>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          <ShieldCheck size={16} />
          {isSubmitting ? "계정 생성 중" : "계정 만들기"}
        </Button>
      </form>
      <NoticeModal
        open={Boolean(notice)}
        title={notice?.title ?? ""}
        description={notice?.description ?? ""}
        tone={notice?.tone}
        actionLabel={notice?.actionLabel}
        onClose={() => setNotice(null)}
        onAction={notice?.onAction}
      />
    </>
  );
}

export function LoginForm({ next, isAuthRequired }: { next: string; isAuthRequired: boolean }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(
    isAuthRequired
      ? {
          title: "로그인이 필요합니다",
          description: "사건 생성과 상담 준비 자료 작성은 로그인 후 이용할 수 있습니다.",
          tone: "warning",
        }
      : null,
  );

  const registerHref = useMemo(() => `/register?next=${encodeURIComponent(next)}`, [next]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "로그인할 수 없습니다.");
      router.push(payload.next ?? next);
    } catch (error) {
      setNotice({
        title: "로그인 정보를 확인해 주세요",
        description: error instanceof Error ? error.message : "이메일과 비밀번호를 다시 확인해 주세요.",
        tone: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form className="space-y-4" onSubmit={submit}>
        <input type="hidden" name="next" value={next} />
        <Field label="이메일">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
            <Input name="email" type="email" required className="pl-9" autoComplete="email" />
          </div>
        </Field>
        <Field label="비밀번호">
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
            <Input name="password" type="password" required className="pl-9" autoComplete="current-password" />
          </div>
        </Field>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "로그인 중" : "로그인"}
        </Button>
      </form>
      <p className="text-center text-sm text-slate-600">
        계정이 없나요?{" "}
        <Link href={registerHref} className="font-semibold text-emerald-800">
          회원가입
        </Link>
      </p>
      <NoticeModal
        open={Boolean(notice)}
        title={notice?.title ?? ""}
        description={notice?.description ?? ""}
        tone={notice?.tone}
        onClose={() => setNotice(null)}
      />
    </>
  );
}
