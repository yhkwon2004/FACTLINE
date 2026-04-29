"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button, Card, Input } from "./UI";
import { NoticeModal } from "./NoticeModal";

export function CaseDetailActions({ caseId, initialTitle }: { caseId: string; initialTitle: string }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rename() {
    if (isBusy) return;
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ title: draftTitle }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "사건 이름을 변경할 수 없습니다.");
      setTitle(payload.case.title);
      setDraftTitle(payload.case.title);
      setIsEditing(false);
      router.refresh();
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "사건 이름을 변경할 수 없습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  async function remove() {
    if (isBusy) return;
    if (!window.confirm("이 사건 정리 기록을 삭제할까요? 삭제 후 목록에서 보이지 않습니다.")) return;
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}`, { method: "DELETE", headers: { accept: "application/json" } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "사건을 삭제할 수 없습니다.");
      router.push("/mypage");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "사건을 삭제할 수 없습니다.");
      setIsBusy(false);
    }
  }

  return (
    <Card className="space-y-3 bg-stone-50 shadow-none">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500">사건 관리</p>
          {isEditing ? (
            <Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} aria-label="사건 이름" className="mt-2" />
          ) : (
            <p className="mt-1 truncate text-sm font-bold text-slate-900">{title}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <Button type="button" variant="secondary" onClick={rename} disabled={isBusy || !draftTitle.trim()}>
                <Check size={16} />
                저장
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isBusy}>
                <X size={16} />
                취소
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setIsEditing(true)} disabled={isBusy}>
                <Pencil size={16} />
                이름 변경
              </Button>
              <Button type="button" variant="danger" onClick={remove} disabled={isBusy}>
                <Trash2 size={16} />
                삭제
              </Button>
            </>
          )}
        </div>
      </div>
      <NoticeModal
        open={Boolean(error)}
        title="사건 관리 작업을 완료할 수 없습니다"
        description={error ?? ""}
        tone="danger"
        onClose={() => setError(null)}
      />
    </Card>
  );
}
