"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Field } from "./UI";
export function DeleteAccount() {
  const router = useRouter();
  const [word, setWord] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function remove(e: FormEvent) {
    e.preventDefault();
    if (word !== "삭제") return;
    setBusy(true);
    try {
      const r = await fetch("/api/account", { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
      setBusy(false);
    }
  }
  return (
    <details className="mt-5">
      <summary className="cursor-pointer text-sm font-semibold text-rose-700">
        계정과 자료 삭제
      </summary>
      <p className="notice error">
        계정, 사건, 기록과 보관한 원본을 영구 삭제합니다. 복구할 수 없어요. 먼저
        정리본을 내보내 주세요.
      </p>
      <form onSubmit={remove} className="grid gap-4">
        <Field label="계속하려면 ‘삭제’를 입력해 주세요">
          <Input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            required
            autoComplete="off"
          />
        </Field>
        <Button variant="danger" disabled={busy || word !== "삭제"}>
          영구 삭제
        </Button>
      </form>
      {error ? (
        <p role="alert" className="notice error">
          {error}
        </p>
      ) : null}
    </details>
  );
}
