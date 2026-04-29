"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Check, ChevronRight, LockKeyhole, Pencil, Trash2, X } from "lucide-react";
import { Badge, Button, Card, Input } from "./UI";
import { NoticeModal } from "./NoticeModal";

type ManageableCase = {
  id: string;
  title: string;
  type: string;
  status: string;
  updatedAt: string;
  isLocked?: boolean;
};

export function CaseManagementList({ initialCases }: { initialCases: ManageableCase[] }) {
  const [cases, setCases] = useState(initialCases);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEdit(caseItem: ManageableCase) {
    setError(null);
    setEditingId(caseItem.id);
    setDraftTitle(caseItem.title);
  }

  async function renameCase(caseId: string) {
    if (busyId) return;
    setBusyId(caseId);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ title: draftTitle }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "사건 이름을 변경할 수 없습니다.");
      setCases((current) =>
        current.map((caseItem) =>
          caseItem.id === caseId
            ? { ...caseItem, title: payload.case.title, updatedAt: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(payload.case.updatedAt)) }
            : caseItem,
        ),
      );
      setEditingId(null);
      setDraftTitle("");
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "사건 이름을 변경할 수 없습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCase(caseId: string) {
    if (busyId) return;
    const agreed = window.confirm("이 사건 기록을 삭제할까요? 삭제한 사건은 목록에서 보이지 않습니다.");
    if (!agreed) return;

    setBusyId(caseId);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: "DELETE",
        headers: { accept: "application/json" },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "사건을 삭제할 수 없습니다.");
      setCases((current) => current.filter((caseItem) => caseItem.id !== caseId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "사건을 삭제할 수 없습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <NoticeModal
        open={Boolean(error)}
        title="사건 목록을 변경할 수 없습니다"
        description={error ?? ""}
        tone="danger"
        onClose={() => setError(null)}
      />
      {cases.length > 0 ? (
        cases.map((caseItem) => {
          const isEditing = editingId === caseItem.id;
          return (
            <Card key={caseItem.id} className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} aria-label="사건 이름" />
                    ) : (
                      <>
                        <h3 className="truncate text-base font-bold text-slate-900">{caseItem.title}</h3>
                        {caseItem.isLocked ? <LockKeyhole className="shrink-0 text-slate-400" size={15} /> : null}
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={caseItem.status === "IN_PROGRESS" ? "amber" : "green"}>{caseItem.status === "IN_PROGRESS" ? "정리 중" : "열림"}</Badge>
                    <Badge tone="blue">{caseItem.type}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <CalendarDays size={14} />
                      {caseItem.updatedAt}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <Button type="button" variant="secondary" onClick={() => renameCase(caseItem.id)} disabled={busyId === caseItem.id || !draftTitle.trim()}>
                        <Check size={16} />
                        저장
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditingId(null)} disabled={busyId === caseItem.id}>
                        <X size={16} />
                        취소
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" variant="outline" onClick={() => startEdit(caseItem)} disabled={Boolean(busyId)}>
                        <Pencil size={16} />
                        이름 변경
                      </Button>
                      <Button type="button" variant="danger" onClick={() => deleteCase(caseItem.id)} disabled={busyId === caseItem.id}>
                        <Trash2 size={16} />
                        삭제
                      </Button>
                      <Link href={`/cases/${caseItem.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-stone-50">
                        열기
                        <ChevronRight size={16} />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      ) : (
        <Card className="text-sm leading-6 text-slate-600">아직 저장된 사건이 없습니다.</Card>
      )}
    </div>
  );
}
