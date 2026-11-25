"use client";
import {notifyAuthChange} from "./auth-notify";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Field } from "./UI";
export function DeleteAccount({localMode=false}:{localMode?:boolean}) {
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
      notifyAuthChange(null);
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
        {localMode?"로그인 계정과 남아 있는 서버 사본을 영구 삭제합니다. 이 기기의 암호화 기록은 자동 삭제하지 않습니다. 먼저 암호화 백업을 보관하세요. 새 계정에서는 백업 복원이 필요합니다.":"계정, 사건, 기록과 보관한 원본을 영구 삭제합니다. 복구할 수 없으니 먼저 정리본을 내보내 주세요."}
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
