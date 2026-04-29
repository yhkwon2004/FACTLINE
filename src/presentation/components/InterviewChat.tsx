"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, FileCheck2, Link2, NotebookPen, Plus, Search, Send } from "lucide-react";
import { Badge, Button, Card, Field, Input, Textarea, cn } from "./UI";
import { NoticeModal } from "./NoticeModal";

type ChatMessage = {
  id: string;
  role: "assistant" | "user" | "status";
  text: string;
};

type LifeRecordResource = {
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

type EvidenceResource = {
  id: string;
  caseId: string;
  caseTitle: string;
  name: string;
  type: string;
  description: string | null;
  fileHash: string | null;
  createdAt: string;
};

const lifeRecordTypeLabels: Record<string, string> = {
  NOTE: "일상 메모",
  SCHEDULE: "일정",
  EVENT: "생활 사건",
  ISSUE: "불편/갈등 기록",
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

function formatDate(value: string | null, fallback?: string | null) {
  if (value) return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  return fallback ?? "시점 미정";
}

function resourceDate(value: string | null, createdAt: string) {
  return new Date(value ?? createdAt).getTime();
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
}

function relevanceScore(haystack: string, query: string, draft: string, caseTitle: string) {
  const source = normalize(haystack);
  const tokens = normalize(`${query} ${draft} ${caseTitle}`)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  if (tokens.length === 0) return 0;
  return tokens.reduce((score, token) => score + (source.includes(token) ? 1 : 0), 0);
}

export function InterviewChat({
  caseId,
  caseTitle,
  initialQuestion,
  lifeRecords,
  evidences,
}: {
  caseId: string;
  caseTitle: string;
  initialQuestion: string;
  lifeRecords: LifeRecordResource[];
  evidences: EvidenceResource[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "initial", role: "assistant", text: initialQuestion },
  ]);
  const [value, setValue] = useState("");
  const [previousQuestions, setPreviousQuestions] = useState([initialQuestion]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"life" | "evidence">("life");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<"relevance" | "date">("relevance");
  const [selectedLifeRecordIds, setSelectedLifeRecordIds] = useState<string[]>([]);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [evidenceItems, setEvidenceItems] = useState(evidences);
  const [newEvidenceName, setNewEvidenceName] = useState("");
  const [newEvidenceType, setNewEvidenceType] = useState("message");
  const [newEvidenceDescription, setNewEvidenceDescription] = useState("");
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);

  const rankedLifeRecords = useMemo(() => {
    return lifeRecords
      .map((record) => ({
        record,
        score: relevanceScore(
          [record.title, record.content, record.location, record.people, record.tags.join(" ")].filter(Boolean).join(" "),
          searchTerm,
          value,
          caseTitle,
        ),
      }))
      .filter(({ record, score }) => {
        if (!searchTerm.trim()) return true;
        return score > 0 || normalize(`${record.title} ${record.content} ${record.tags.join(" ")}`).includes(normalize(searchTerm));
      })
      .sort((left, right) => {
        if (sortMode === "relevance" && right.score !== left.score) return right.score - left.score;
        return resourceDate(right.record.occurredAt, right.record.createdAt) - resourceDate(left.record.occurredAt, left.record.createdAt);
      });
  }, [caseTitle, lifeRecords, searchTerm, sortMode, value]);

  const rankedEvidences = useMemo(() => {
    return evidenceItems
      .map((evidence) => ({
        evidence,
        score: relevanceScore(
          [evidence.name, evidence.description, evidence.caseTitle, evidence.type].filter(Boolean).join(" "),
          searchTerm,
          value,
          caseTitle,
        ),
      }))
      .filter(({ evidence, score }) => {
        if (!searchTerm.trim()) return true;
        return score > 0 || normalize(`${evidence.name} ${evidence.description ?? ""} ${evidence.caseTitle}`).includes(normalize(searchTerm));
      })
      .sort((left, right) => {
        if (sortMode === "relevance" && right.score !== left.score) return right.score - left.score;
        return new Date(right.evidence.createdAt).getTime() - new Date(left.evidence.createdAt).getTime();
      });
  }, [caseTitle, evidenceItems, searchTerm, sortMode, value]);

  function appendToDraft(text: string) {
    setValue((current) => [current.trim(), text.trim()].filter(Boolean).join("\n\n"));
  }

  function toggleLifeRecord(record: LifeRecordResource) {
    setSelectedLifeRecordIds((current) =>
      current.includes(record.id) ? current.filter((id) => id !== record.id) : [...current, record.id],
    );
    appendToDraft([
      "[일상 기록 참고]",
      `제목: ${record.title}`,
      `시점: ${formatDate(record.occurredAt, record.approximateTimeText)}`,
      record.location ? `장소/매체: ${record.location}` : null,
      record.people ? `관련 사람: ${record.people}` : null,
      `내용: ${record.content}`,
    ].filter(Boolean).join("\n"));
  }

  function toggleEvidence(evidence: EvidenceResource) {
    if (evidence.caseId !== caseId) {
      appendEvidenceToDraft(evidence);
      return;
    }

    setSelectedEvidenceIds((current) =>
      current.includes(evidence.id) ? current.filter((id) => id !== evidence.id) : [...current, evidence.id],
    );
    appendEvidenceToDraft(evidence);
  }

  function appendEvidenceToDraft(evidence: EvidenceResource) {
    appendToDraft([
      "[증거물 참고]",
      `이름: ${evidence.name}`,
      `사건: ${evidence.caseTitle}`,
      `종류: ${evidenceTypeLabels[evidence.type] ?? evidence.type}`,
      evidence.description ? `설명: ${evidence.description}` : null,
      evidence.fileHash ? `파일 해시: ${evidence.fileHash}` : null,
    ].filter(Boolean).join("\n"));
  }

  async function addEvidenceFromSelfRecord() {
    if (!newEvidenceName.trim() || isAddingEvidence) return;
    setIsAddingEvidence(true);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/evidence`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          name: newEvidenceName,
          type: newEvidenceType,
          content: `${newEvidenceName}\n${newEvidenceDescription}`,
          description: [
            "셀프 기록 화면에서 추가한 증거 메모",
            `제출물 종류: ${evidenceTypeLabels[newEvidenceType] ?? newEvidenceType}`,
            newEvidenceDescription ? `설명: ${newEvidenceDescription}` : null,
          ].filter(Boolean).join("\n"),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "증거를 추가할 수 없습니다.");
      const added: EvidenceResource = {
        id: payload.evidence.id,
        caseId,
        caseTitle,
        name: payload.evidence.name,
        type: payload.evidence.type,
        description: payload.evidence.description,
        fileHash: payload.evidence.fileHash,
        createdAt: payload.evidence.createdAt ?? new Date().toISOString(),
      };
      setEvidenceItems((current) => [added, ...current]);
      setSelectedEvidenceIds((current) => [...new Set([...current, added.id])]);
      appendEvidenceToDraft(added);
      setNewEvidenceName("");
      setNewEvidenceDescription("");
      setNewEvidenceType("message");
      setActiveTab("evidence");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "증거를 추가할 수 없습니다.");
    } finally {
      setIsAddingEvidence(false);
    }
  }

  async function submit() {
    const answer = value.trim();
    if (!answer || isSubmitting) return;

    const questionsBeforeSubmit = previousQuestions;
    setError(null);
    setIsSubmitting(true);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: answer },
    ]);
    setValue("");

    try {
      const response = await fetch(`/api/cases/${caseId}/interview`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          answer,
          previousQuestions: questionsBeforeSubmit,
          evidenceIds: selectedEvidenceIds,
          lifeRecordIds: selectedLifeRecordIds,
        }),
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? "답변을 저장할 수 없습니다.");

      const nextQuestion = typeof payload.nextQuestion === "string" ? payload.nextQuestion.trim() : "";
      if (nextQuestion && !questionsBeforeSubmit.includes(nextQuestion)) {
        setMessages((current) => [
          ...current,
          { id: crypto.randomUUID(), role: "assistant", text: nextQuestion },
        ]);
        setPreviousQuestions((current) => [...current, nextQuestion]);
        setIsComplete(false);
        return;
      }

      setIsComplete(true);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "status",
          text: "기본 셀프 기록이 한 차례 정리되었습니다. 추가로 떠오르는 사실이 있으면 계속 입력할 수 있고, 바로 타임라인을 확인해도 됩니다.",
        },
      ]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "답변을 저장할 수 없습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-4">
        <Card className="space-y-3">
          {messages.map((message, messageIndex) => (
            <div key={`${message.id}-${messageIndex}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  message.role === "user"
                    ? "max-w-[85%] rounded-lg bg-slate-900 px-3 py-2 text-sm leading-6 text-white"
                    : message.role === "status"
                      ? "max-w-[85%] rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-900"
                      : "max-w-[85%] rounded-lg bg-stone-100 px-3 py-2 text-sm leading-6 text-slate-800"
                }
              >
                {message.text}
              </div>
            </div>
          ))}
          {isSubmitting ? (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg bg-stone-100 px-3 py-2 text-sm leading-6 text-slate-500">셀프 기록을 정리하고 다음 점검 질문을 고르는 중입니다.</div>
            </div>
          ) : null}
        </Card>
        <div className="grid gap-3">
          <Textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="확인 가능한 사실만 입력하세요. 오른쪽 자료 보드에서 일상 기록이나 증거물을 선택해 이어 쓸 수 있습니다." />
          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <Badge tone={selectedLifeRecordIds.length > 0 ? "blue" : "slate"}>선택한 일상 기록 {selectedLifeRecordIds.length}건</Badge>
            <Badge tone={selectedEvidenceIds.length > 0 ? "green" : "slate"}>연결할 증거 {selectedEvidenceIds.length}건</Badge>
          </div>
          <NoticeModal
            open={Boolean(error)}
            title="셀프 기록을 저장할 수 없습니다"
            description={error ?? ""}
            tone="danger"
            onClose={() => setError(null)}
          />
          {isComplete ? (
            <div className="grid gap-2 rounded-lg border border-emerald-200 bg-white p-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-800" size={17} />
                <span>반복 질문 없이 다음 단계로 이동할 수 있습니다.</span>
              </div>
              <Link href={`/cases/${caseId}/timeline`} className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
                타임라인 확인
              </Link>
            </div>
          ) : null}
          <Button type="button" onClick={submit} className="w-full" disabled={isSubmitting || !value.trim()}>
            <Send size={16} />
            {isSubmitting ? "저장 중" : isComplete ? "추가 기록 저장" : "저장하고 다음 질문"}
          </Button>
        </div>
      </div>

      <Card className="space-y-4">
        <div>
          <h2 className="font-bold">자료 보드</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">이전 일상 기록과 증거물을 검색하고, 연관성이 높은 항목을 골라 셀프 기록에 이어 씁니다.</p>
        </div>
        <div className="grid gap-2">
          <Field label="수동 검색">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="이름, 사건명, 태그, 설명 검색" className="pl-9" />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={sortMode === "relevance" ? "primary" : "outline"} onClick={() => setSortMode("relevance")}>AI 연관성순</Button>
            <Button type="button" variant={sortMode === "date" ? "primary" : "outline"} onClick={() => setSortMode("date")}>날짜순</Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={activeTab === "life" ? "secondary" : "outline"} onClick={() => setActiveTab("life")}>
              <NotebookPen size={16} />
              일상 기록
            </Button>
            <Button type="button" variant={activeTab === "evidence" ? "secondary" : "outline"} onClick={() => setActiveTab("evidence")}>
              <FileCheck2 size={16} />
              증거물
            </Button>
          </div>
        </div>

        {activeTab === "evidence" ? (
          <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <h3 className="text-sm font-bold text-slate-900">셀프 기록에서 새 증거 추가</h3>
            <Field label="증거 이름">
              <Input value={newEvidenceName} onChange={(event) => setNewEvidenceName(event.target.value)} placeholder="예: 4월 29일 메시지 알림 캡처" />
            </Field>
            <Field label="증거 종류">
              <select value={newEvidenceType} onChange={(event) => setNewEvidenceType(event.target.value)} className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm">
                <option value="message">대화/문자 기록</option>
                <option value="document">문서/계약서</option>
                <option value="transaction">거래/입출금 자료</option>
                <option value="image">사진/영상</option>
                <option value="audio">녹음</option>
                <option value="other">기타</option>
              </select>
            </Field>
            <Field label="설명">
              <Textarea value={newEvidenceDescription} onChange={(event) => setNewEvidenceDescription(event.target.value)} placeholder="이 증거가 어떤 사실과 연결되는지 적어 주세요." className="min-h-24" />
            </Field>
            <Button type="button" variant="secondary" onClick={addEvidenceFromSelfRecord} disabled={isAddingEvidence || !newEvidenceName.trim()} className="w-full">
              <Plus size={16} />
              {isAddingEvidence ? "추가 중" : "증거 추가 후 선택"}
            </Button>
          </div>
        ) : null}

        <div className="space-y-2 md:max-h-[34rem] md:overflow-auto md:pr-1">
          {activeTab === "life"
            ? rankedLifeRecords.map(({ record, score }) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => toggleLifeRecord(record)}
                  className={cn(
                    "w-full rounded-lg border bg-white p-3 text-left transition hover:border-emerald-300",
                    selectedLifeRecordIds.includes(record.id) ? "border-emerald-300 ring-2 ring-emerald-100" : "border-stone-200",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={record.type === "ISSUE" ? "amber" : record.type === "SCHEDULE" ? "blue" : "green"}>
                      {lifeRecordTypeLabels[record.type] ?? record.type}
                    </Badge>
                    {score > 0 ? <Badge tone="slate">연관 {score}</Badge> : null}
                  </div>
                  <p className="mt-2 font-bold text-slate-900">{record.title}</p>
                  <p className="mt-1 max-h-12 overflow-hidden text-sm leading-6 text-slate-600">{record.content}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                    <CalendarDays size={13} />
                    {formatDate(record.occurredAt, record.approximateTimeText)}
                  </p>
                </button>
              ))
            : rankedEvidences.map(({ evidence, score }) => {
                const selectable = evidence.caseId === caseId;
                const selected = selectedEvidenceIds.includes(evidence.id);
                return (
                  <div
                    key={evidence.id}
                    className={cn("rounded-lg border bg-white p-3", selected ? "border-emerald-300 ring-2 ring-emerald-100" : "border-stone-200")}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={selectable ? "green" : "blue"}>{selectable ? "현재 사건" : "다른 사건"}</Badge>
                      <Badge tone="slate">{evidenceTypeLabels[evidence.type] ?? evidence.type}</Badge>
                      {score > 0 ? <Badge tone="slate">연관 {score}</Badge> : null}
                    </div>
                    <p className="mt-2 font-bold text-slate-900">{evidence.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{evidence.caseTitle}</p>
                    {evidence.description ? <p className="mt-2 max-h-16 overflow-hidden whitespace-pre-wrap text-sm leading-6 text-slate-600">{evidence.description}</p> : null}
                    <div className="mt-3 grid gap-2">
                      <Button type="button" variant={selected ? "secondary" : "outline"} onClick={() => toggleEvidence(evidence)} className="w-full">
                        <Link2 size={15} />
                        {selectable ? (selected ? "선택됨" : "증거 선택") : "기록에 반영"}
                      </Button>
                      {!selectable ? <p className="text-xs leading-5 text-slate-500">다른 사건 증거는 본문에 참고로 반영됩니다. 연결하려면 이 사건 증거로 새로 추가해 주세요.</p> : null}
                    </div>
                  </div>
                );
              })}
          {activeTab === "life" && rankedLifeRecords.length === 0 ? <p className="text-sm leading-6 text-slate-600">검색 결과가 없습니다.</p> : null}
          {activeTab === "evidence" && rankedEvidences.length === 0 ? <p className="text-sm leading-6 text-slate-600">검색 결과가 없습니다.</p> : null}
        </div>
      </Card>
    </div>
  );
}
