"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Link2, LocateFixed, MapPin, NotebookPen } from "lucide-react";
import { Badge, Button, Card, Field, Input, Textarea, cn } from "./UI";
import { NoticeModal } from "./NoticeModal";

type CaseOption = { id: string; title: string };
type LifeRecordView = {
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

const typeLabels: Record<string, string> = {
  NOTE: "일상 메모",
  SCHEDULE: "일정",
  EVENT: "생활 사건",
  ISSUE: "불편/갈등 기록",
};

const typeStyles: Record<string, { dot: string; bg: string; text: string; badge: "slate" | "green" | "amber" | "rose" | "blue" }> = {
  NOTE: { dot: "bg-slate-500", bg: "bg-slate-50", text: "text-slate-700", badge: "slate" },
  SCHEDULE: { dot: "bg-sky-500", bg: "bg-sky-50", text: "text-sky-800", badge: "blue" },
  EVENT: { dot: "bg-emerald-600", bg: "bg-emerald-50", text: "text-emerald-800", badge: "green" },
  ISSUE: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-800", badge: "amber" },
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDateTimeLocalValue(date: Date) {
  return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseRecordDate(record: LifeRecordView) {
  return new Date(record.occurredAt ?? record.createdAt);
}

function formatDate(value: string | null, fallback: string | null) {
  if (value) return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  return fallback ?? "시점 미정";
}

function formatMonth(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(value);
}

function buildCalendarCells(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const cells: Array<Date | null> = Array.from({ length: firstDay.getDay() }, () => null);

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function LifeRecordForm({
  initialRecords,
  cases,
}: {
  initialRecords: LifeRecordView[];
  cases: CaseOption[];
}) {
  const [records, setRecords] = useState(initialRecords);
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [occurredAt, setOccurredAt] = useState("");
  const [location, setLocation] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [activeType, setActiveType] = useState("ALL");

  useEffect(() => {
    setOccurredAt(toDateTimeLocalValue(new Date()));
  }, []);

  const linkedCaseTitle = useMemo(() => {
    const map = new Map(cases.map((caseItem) => [caseItem.id, caseItem.title]));
    return (caseId: string | null) => (caseId ? map.get(caseId) ?? "연결된 사건" : null);
  }, [cases]);

  const filteredRecords = useMemo(() => {
    return activeType === "ALL" ? records : records.filter((record) => record.type === activeType);
  }, [activeType, records]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, LifeRecordView[]>();
    for (const record of filteredRecords) {
      const key = dateKey(parseRecordDate(record));
      const existing = map.get(key) ?? [];
      existing.push(record);
      map.set(key, existing);
    }
    return map;
  }, [filteredRecords]);

  const calendarCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);
  const selectedRecords = recordsByDate.get(selectedDate) ?? [];
  const typeCounts = useMemo(() => {
    return records.reduce<Record<string, number>>((counts, record) => {
      counts[record.type] = (counts[record.type] ?? 0) + 1;
      return counts;
    }, {});
  }, [records]);

  function setCurrentTime() {
    const now = new Date();
    setOccurredAt(toDateTimeLocalValue(now));
    setSelectedDate(dateKey(now));
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  function moveMonth(amount: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function requestLocation() {
    setLocationStatus(null);
    if (!navigator.geolocation) {
      setLocationStatus("이 브라우저에서는 현재 위치 확인을 사용할 수 없습니다.");
      return;
    }

    setLocationStatus("현재 위치를 확인하는 중입니다.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation(`현재 위치 참조: 위도 ${latitude.toFixed(5)}, 경도 ${longitude.toFixed(5)}, 정확도 약 ${Math.round(accuracy)}m`);
        setLocationStatus("현재 위치를 장소/매체 항목에 기록했습니다.");
      },
      () => setLocationStatus("위치 권한이 거부되었거나 확인할 수 없습니다."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(null);
    setIsSubmitting(true);

    try {
      const form = new FormData(formElement);
      const response = await fetch("/api/life-records", {
        method: "POST",
        headers: { accept: "application/json" },
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "기록을 저장할 수 없습니다.");
      setRecords((current) => [payload.record, ...current]);
      const recordedAt = parseRecordDate(payload.record);
      setSelectedDate(dateKey(recordedAt));
      setVisibleMonth(new Date(recordedAt.getFullYear(), recordedAt.getMonth(), 1));
      formElement.reset();
      setOccurredAt(toDateTimeLocalValue(new Date()));
      setLocation("");
      setLocationStatus(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "기록을 저장할 수 없습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
      <Card className="space-y-4">
        <div>
          <h2 className="font-bold">오늘의 다이어리</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            법률 문제와 무관하게 하루의 일, 약속, 불편함, 기억할 사람과 장소를 남깁니다.
          </p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="기록 종류">
            <select name="type" className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm" defaultValue="NOTE">
              <option value="NOTE">일상 메모</option>
              <option value="SCHEDULE">일정</option>
              <option value="EVENT">생활 사건</option>
              <option value="ISSUE">불편/갈등 기록</option>
            </select>
          </Field>
          <Field label="제목">
            <Input name="title" placeholder="예: 오후 통화, 퇴근길 메모, 기억해둘 일" required />
          </Field>
          <Field label="내용">
            <Textarea
              name="content"
              placeholder="오늘 있었던 일을 편하게 적어 주세요. 확실하지 않은 부분은 '기억상', '대략'처럼 표시해도 됩니다."
              required
            />
          </Field>
          <Field label="시간">
            <div className="grid gap-2">
              <Input name="occurredAt" type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />
              <Button type="button" variant="outline" onClick={setCurrentTime} className="w-full">
                <Clock3 size={16} />
                현재 시각 입력
              </Button>
            </div>
          </Field>
          <Field label="대략적인 시간">
            <Input name="approximateTimeText" placeholder="정확하지 않다면 예: 지난주 퇴근길, 5월 초, 점심 무렵" />
          </Field>
          <Field label="장소/매체">
            <div className="grid gap-2">
              <Input name="location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="예: 집, 회사, 통화, 카카오톡, 이메일" />
              <Button type="button" variant="outline" onClick={requestLocation} className="w-full">
                <LocateFixed size={16} />
                현재 위치 참조
              </Button>
              {locationStatus ? <span className="text-xs leading-5 text-slate-500">{locationStatus}</span> : null}
            </div>
          </Field>
          <Field label="관련 사람">
            <Input name="people" placeholder="예: 본인, 지인, 담당자, 목격한 사람" />
          </Field>
          <Field label="태그">
            <Input name="tags" placeholder="쉼표로 구분: 출근길, 일정, 약속, 불편, 증거확인" />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <NotebookPen size={16} />
            {isSubmitting ? "저장 중" : "다이어리 저장"}
          </Button>
        </form>
        <NoticeModal
          open={Boolean(error)}
          title="기록을 저장할 수 없습니다"
          description={error ?? ""}
          tone="danger"
          onClose={() => setError(null)}
        />
      </Card>

      <div className="space-y-4">
        <Card className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-bold">다이어리 캘린더</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">카테고리별 색상으로 어떤 날에 어떤 기억이 남았는지 확인합니다.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => moveMonth(-1)} aria-label="이전 달">
                <ChevronLeft size={16} />
              </Button>
              <span className="min-w-28 text-center text-sm font-bold">{formatMonth(visibleMonth)}</span>
              <Button type="button" variant="outline" onClick={() => moveMonth(1)} aria-label="다음 달">
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveType("ALL")}
              className={cn("rounded-lg border px-3 py-2 text-xs font-semibold", activeType === "ALL" ? "border-slate-900 bg-slate-900 text-white" : "border-stone-200 bg-white text-slate-700")}
            >
              전체 {records.length}
            </button>
            {Object.entries(typeLabels).map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveType(type)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold",
                  activeType === type ? "border-slate-900 bg-white text-slate-900" : "border-stone-200 bg-white text-slate-700",
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full", typeStyles[type].dot)} />
                {label} {typeCounts[type] ?? 0}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
            {["일", "월", "화", "수", "목", "금", "토"].map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, index) => {
              if (!cell) return <div key={`blank-${index}`} className="min-h-20 rounded-lg bg-stone-50" />;
              const key = dateKey(cell);
              const dayRecords = recordsByDate.get(key) ?? [];
              const isToday = key === dateKey(new Date());
              const isSelected = key === selectedDate;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={cn(
                    "min-h-20 rounded-lg border p-2 text-left transition hover:border-emerald-300",
                    isSelected ? "border-slate-900 bg-slate-50" : "border-stone-200 bg-white",
                  )}
                >
                  <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-bold", isToday ? "bg-slate-900 text-white" : "text-slate-700")}>
                    {cell.getDate()}
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {dayRecords.slice(0, 5).map((record) => (
                      <span key={record.id} className={cn("h-2 w-2 rounded-full", typeStyles[record.type]?.dot ?? "bg-slate-400")} />
                    ))}
                    {dayRecords.length > 5 ? <span className="text-[10px] font-semibold text-slate-500">+{dayRecords.length - 5}</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">{selectedDate} 다이어리</h2>
              <span className="text-xs font-semibold text-slate-500">{selectedRecords.length}건</span>
            </div>
            {selectedRecords.length === 0 ? (
              <Card className="text-sm leading-6 text-slate-600">선택한 날짜에 표시할 다이어리가 없습니다.</Card>
            ) : (
              selectedRecords.map((record) => (
                <RecordCard key={record.id} record={record} linkedCaseTitle={linkedCaseTitle} />
              ))
            )}
          </div>
          <Card className="space-y-3">
            <h2 className="font-bold">최근 다이어리</h2>
            {filteredRecords.slice(0, 6).map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => {
                  const parsed = parseRecordDate(record);
                  setSelectedDate(dateKey(parsed));
                  setVisibleMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
                }}
                className="w-full rounded-lg border border-stone-200 bg-white p-3 text-left transition hover:border-emerald-300"
              >
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", typeStyles[record.type]?.dot ?? "bg-slate-400")} />
                  <span className="truncate text-sm font-bold text-slate-900">{record.title}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{formatDate(record.occurredAt, record.approximateTimeText)}</p>
              </button>
            ))}
            {filteredRecords.length === 0 ? <p className="text-sm leading-6 text-slate-600">아직 다이어리가 없습니다.</p> : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function RecordCard({
  record,
  linkedCaseTitle,
}: {
  record: LifeRecordView;
  linkedCaseTitle: (caseId: string | null) => string | null;
}) {
  const style = typeStyles[record.type] ?? typeStyles.NOTE;

  return (
    <Card className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={style.badge}>{typeLabels[record.type] ?? record.type}</Badge>
            {record.caseId ? <Badge tone="blue">정리 연결</Badge> : null}
          </div>
          <h3 className="mt-2 font-bold text-slate-900">{record.title}</h3>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          <CalendarDays size={14} />
          {formatDate(record.occurredAt, record.approximateTimeText)}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{record.content}</p>
      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        {record.location ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1">
            <MapPin size={12} />
            {record.location}
          </span>
        ) : null}
        {record.people ? <span className="rounded-md bg-stone-100 px-2 py-1">{record.people}</span> : null}
        {record.tags.map((tag) => <span key={tag} className="rounded-md bg-stone-100 px-2 py-1">#{tag}</span>)}
      </div>
      {record.caseId ? (
        <Link href={`/cases/${record.caseId}/evidence`} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <Link2 size={15} />
          {linkedCaseTitle(record.caseId)} 증거 화면에서 보기
        </Link>
      ) : null}
    </Card>
  );
}
