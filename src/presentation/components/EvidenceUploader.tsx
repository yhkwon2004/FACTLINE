"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, FileCheck2, FilePlus2, FileUp, Link2, NotebookPen, Unlink } from "lucide-react";
import { Badge, Button, Card, Field, Input, Textarea } from "./UI";
import { NoticeModal } from "./NoticeModal";

type EvidenceItem = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  fileHash: string | null;
};

type LifeRecordReference = {
  id: string;
  caseId: string | null;
  type: string;
  title: string;
  content: string;
  occurredAt: string | null;
  approximateTimeText: string | null;
  location: string | null;
  people: string | null;
  tags: string[];
  createdAt: string;
};

const evidenceTypeLabels: Record<string, string> = {
  document: "문서/계약서",
  message: "대화/문자 기록",
  transaction: "거래/입출금 자료",
  image: "사진/영상",
  audio: "녹음",
  "life-record": "일상 기록",
  other: "기타",
};

const lifeRecordTypeLabels: Record<string, string> = {
  NOTE: "일상 메모",
  SCHEDULE: "일정",
  EVENT: "생활 사건",
  ISSUE: "불편/갈등 기록",
};

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatRecordTime(record: LifeRecordReference) {
  if (record.occurredAt) return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(record.occurredAt));
  return record.approximateTimeText ?? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(record.createdAt));
}

function buildLifeRecordEvidenceDescription(record: LifeRecordReference) {
  return [
    "일상 기록에서 가져온 참고 항목",
    `기록 종류: ${lifeRecordTypeLabels[record.type] ?? record.type}`,
    `기록 시점: ${formatRecordTime(record)}`,
    record.location ? `장소/매체: ${record.location}` : null,
    record.people ? `관련 사람: ${record.people}` : null,
    record.tags.length > 0 ? `태그: ${record.tags.map((tag) => `#${tag}`).join(" ")}` : null,
    "",
    record.content,
  ].filter((line) => line !== null).join("\n");
}

export function EvidenceUploader({
  caseId,
  initialItems,
  lifeRecords,
}: {
  caseId: string;
  initialItems: EvidenceItem[];
  lifeRecords: LifeRecordReference[];
}) {
  const [items, setItems] = useState<EvidenceItem[]>(initialItems);
  const [records, setRecords] = useState<LifeRecordReference[]>(lifeRecords);
  const [name, setName] = useState("");
  const [evidenceType, setEvidenceType] = useState("document");
  const [source, setSource] = useState("");
  const [acquiredAt, setAcquiredAt] = useState("");
  const [fact, setFact] = useState("");
  const [originality, setOriginality] = useState("원본 여부 확인 필요");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordBusyId, setRecordBusyId] = useState<string | null>(null);

  async function addEvidence() {
    if (!name.trim() || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const fileHash = file ? await sha256(file) : await sha256(new File([`${name}:${description}`], `${name}.txt`, { type: "text/plain" }));
      const metadata = [
        `제출물 종류: ${evidenceTypeLabels[evidenceType] ?? evidenceType}`,
        `확보 출처: ${source || "확인 필요"}`,
        `확보 시점: ${acquiredAt || "확인 필요"}`,
        `원본/사본: ${originality}`,
        `뒷받침하는 사실: ${fact || "셀프 기록에서 연결 필요"}`,
        description ? `비고: ${description}` : null,
      ].filter(Boolean).join("\n");

      const response = await fetch(`/api/cases/${caseId}/evidence`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          name,
          type: file?.type || evidenceType,
          fileHash,
          description: metadata,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "증거를 저장할 수 없습니다.");
      setItems((current) => [payload.evidence, ...current]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "증거를 저장할 수 없습니다.");
    } finally {
      setIsSubmitting(false);
    }

    setName("");
    setEvidenceType("document");
    setSource("");
    setAcquiredAt("");
    setFact("");
    setOriginality("원본 여부 확인 필요");
    setDescription("");
    setFile(null);
  }

  async function toggleRecordLink(record: LifeRecordReference) {
    if (recordBusyId) return;
    setRecordBusyId(record.id);
    setError(null);

    try {
      const nextCaseId = record.caseId === caseId ? null : caseId;
      const response = await fetch(`/api/life-records/${record.id}/link`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ caseId: nextCaseId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "일상 기록을 연결할 수 없습니다.");
      setRecords((current) => current.map((item) => (item.id === record.id ? { ...item, caseId: payload.record.caseId } : item)));
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "일상 기록을 연결할 수 없습니다.");
    } finally {
      setRecordBusyId(null);
    }
  }

  async function importRecordAsEvidence(record: LifeRecordReference) {
    if (recordBusyId) return;
    setRecordBusyId(record.id);
    setError(null);

    try {
      const descriptionFromRecord = buildLifeRecordEvidenceDescription(record);
      const fileHash = await sha256(new File([`${record.id}\n${record.title}\n${descriptionFromRecord}`], `${record.id}.txt`, { type: "text/plain" }));
      const response = await fetch(`/api/cases/${caseId}/evidence`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          name: `[일상 기록] ${record.title}`,
          type: "life-record",
          fileHash,
          description: descriptionFromRecord,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "일상 기록을 가져올 수 없습니다.");
      setItems((current) => [payload.evidence, ...current]);
      if (record.caseId !== caseId) {
        const linkResponse = await fetch(`/api/life-records/${record.id}/link`, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ caseId }),
        });
        const linkPayload = await linkResponse.json();
        if (!linkResponse.ok) throw new Error(linkPayload.error ?? "일상 기록을 연결할 수 없습니다.");
        setRecords((current) => current.map((item) => (item.id === record.id ? { ...item, caseId: linkPayload.record.caseId } : item)));
      }
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "일상 기록을 가져올 수 없습니다.");
    } finally {
      setRecordBusyId(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="space-y-4">
        <Field label="증거 이름">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="제출물 이름" />
        </Field>
        <Field label="파일">
          <Input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </Field>
        <Field label="제출물 종류">
          <select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)} className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm">
            <option value="document">문서/계약서</option>
            <option value="message">대화/문자 기록</option>
            <option value="transaction">거래/입출금 자료</option>
            <option value="image">사진/영상</option>
            <option value="audio">녹음</option>
            <option value="other">기타</option>
          </select>
        </Field>
        <Field label="확보 출처">
          <Input value={source} onChange={(event) => setSource(event.target.value)} placeholder="어디에서 확보했나요?" />
        </Field>
        <Field label="확보 시점">
          <Input value={acquiredAt} onChange={(event) => setAcquiredAt(event.target.value)} placeholder="예: 2026년 4월 중순" />
        </Field>
        <Field label="뒷받침하는 사실">
          <Input value={fact} onChange={(event) => setFact(event.target.value)} placeholder="어떤 사실과 연결되나요?" />
        </Field>
        <Field label="원본/사본 여부">
          <select value={originality} onChange={(event) => setOriginality(event.target.value)} className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm">
            <option>원본 여부 확인 필요</option>
            <option>원본 보유</option>
            <option>사본 또는 캡처</option>
            <option>제3자 제공 자료</option>
          </select>
        </Field>
        <Field label="비고">
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="편집 여부, 보관 위치, 추가 확인 사항을 적어 주세요." />
        </Field>
        <Button type="button" onClick={addEvidence} className="w-full" disabled={isSubmitting || !name.trim()}>
          <FileUp size={16} />
          {isSubmitting ? "저장 중" : "증거 저장"}
        </Button>
      </Card>
      <NoticeModal
        open={Boolean(error)}
        title="증거 작업을 완료할 수 없습니다"
        description={error ?? ""}
        tone="danger"
        onClose={() => setError(null)}
      />
      <div className="space-y-3">
        <Card className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-bold">기존 일상 기록 참고</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">평소 남긴 기록을 이 정리 작업에 포함하거나 증거 메모로 가져옵니다.</p>
            </div>
            <Link href="/life" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-stone-50">
              <NotebookPen size={16} />
              일상 기록
            </Link>
          </div>
          <div className="space-y-2 md:max-h-[30rem] md:overflow-auto md:pr-1">
            {records.map((record) => {
              const isLinked = record.caseId === caseId;
              return (
                <div key={record.id} className="rounded-lg border border-stone-200 bg-white p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={record.type === "ISSUE" ? "amber" : record.type === "SCHEDULE" ? "blue" : "green"}>
                          {lifeRecordTypeLabels[record.type] ?? record.type}
                        </Badge>
                        {isLinked ? <Badge tone="blue">정리에 포함</Badge> : null}
                      </div>
                      <p className="mt-2 font-bold text-slate-900">{record.title}</p>
                      <p className="mt-1 max-h-12 overflow-hidden text-sm leading-6 text-slate-600">{record.content}</p>
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                        <CalendarDays size={13} />
                        {formatRecordTime(record)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => toggleRecordLink(record)} disabled={recordBusyId === record.id}>
                        {isLinked ? <Unlink size={15} /> : <Link2 size={15} />}
                        {isLinked ? "포함 해제" : "정리에 포함"}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => importRecordAsEvidence(record)} disabled={recordBusyId === record.id}>
                        <FilePlus2 size={15} />
                        증거 메모로 가져오기
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {records.length === 0 ? <p className="text-sm leading-6 text-slate-600">가져올 일상 기록이 없습니다.</p> : null}
          </div>
        </Card>

        {items.map((item) => (
          <Card key={item.id}>
            <div className="min-w-0 space-y-3">
              <div className="flex items-start gap-3">
                <FileCheck2 className="mt-1 shrink-0 text-emerald-800" size={18} />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{evidenceTypeLabels[item.type] ?? item.type}</p>
                </div>
              </div>
              {item.description ? <pre className="whitespace-pre-wrap rounded-lg bg-stone-100 p-3 text-xs leading-5 text-slate-700">{item.description}</pre> : null}
              {item.fileHash ? <p className="break-all font-mono text-xs text-slate-500">sha256:{item.fileHash}</p> : null}
            </div>
          </Card>
        ))}
        {items.length === 0 ? <Card className="text-sm text-slate-500">등록된 증거가 없습니다.</Card> : null}
      </div>
    </div>
  );
}
