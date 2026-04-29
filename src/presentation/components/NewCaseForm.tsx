"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button, Card, Field, Input, Textarea } from "./UI";
import { NoticeModal } from "./NoticeModal";

export function NewCaseForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { accept: "application/json" },
        body: new FormData(event.currentTarget),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "사건을 생성할 수 없습니다.");
      }

      router.push(`/cases/${payload.case.id}/interview`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "사건을 생성할 수 없습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <form className="space-y-5" onSubmit={submit}>
        <Field label="사건 제목">
          <Input name="title" placeholder="정리할 사건의 제목" required />
        </Field>
        <Field label="사건 유형">
          <select name="type" className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm">
            <option value="FRAUD">사기/재산</option>
            <option value="VIOLENCE">폭행/상해</option>
            <option value="DEFAMATION">명예훼손/모욕</option>
            <option value="WORK">노동/직장</option>
            <option value="OTHER">기타</option>
          </select>
        </Field>
        <Field label="간단한 설명">
          <Textarea name="description" placeholder="현재 기억나는 범위에서만 적어 주세요." />
        </Field>
        <Card className="bg-stone-100 shadow-none">
          <div className="flex gap-3">
            <ShieldCheck className="mt-1 shrink-0 text-emerald-800" size={18} />
            <p className="text-sm leading-6 text-slate-700">
              본 서비스는 법률 자문을 제공하지 않습니다. 입력 내용은 사실 정리와 상담 준비 자료 생성에만 사용됩니다.
            </p>
          </div>
        </Card>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "생성 중" : "사건 생성"}
          <ArrowRight size={16} />
        </Button>
      </form>
      <NoticeModal
        open={Boolean(error)}
        title="사건을 생성할 수 없습니다"
        description={error ?? ""}
        tone="danger"
        onClose={() => setError(null)}
      />
    </Card>
  );
}
