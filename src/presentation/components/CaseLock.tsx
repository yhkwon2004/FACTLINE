"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, UnlockKeyhole } from "lucide-react";
import { Button } from "./UI";
export function CaseLock({
  caseId,
  locked,
}: {
  caseId: string;
  locked: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/cases/" + caseId + "/lock", {
        method: locked ? "DELETE" : "POST",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "잠금 변경 실패");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Button variant="outline" disabled={busy} onClick={toggle}>
        {locked ? <UnlockKeyhole size={15} /> : <LockKeyhole size={15} />}사건{" "}
        {locked ? "잠금 해제" : "잠그기"}
      </Button>
      {error ? (
        <p role="alert" className="notice error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
