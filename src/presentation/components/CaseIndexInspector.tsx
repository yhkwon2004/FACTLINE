"use client";

import { useMemo, useState } from "react";
import {
  selectCaseRows,
  type CaseIndex,
} from "../../domain/services/CaseIndex";
import { Button, Card, Field } from "./UI";

const polarity = {
  reported: "원문 진술",
  denied: "부인",
  planned: "예정·요청",
  uncertain: "전언·미확인",
};
const timestamp = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
});
const day = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
});
const control =
  "w-full max-w-full min-w-0 min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm";

export function CaseIndexInspector({
  index,
  urls = {},
}: {
  index: CaseIndex;
  urls?: Record<string, string>;
}) {
  const [person, setPerson] = useState(""),
    [time, setTime] = useState(""),
    [event, setEvent] = useState("");
  const [missingOnly, setMissingOnly] = useState(false),
    [open, setOpen] = useState(""),
    [limit, setLimit] = useState(12);
  const rows = useMemo(
    () => selectCaseRows(index, person, time, event, missingOnly),
    [index, person, time, event, missingOnly],
  );
  const missingCount = index.rows.filter((row) => row.missing.length).length;
  if (!index.rows.length)
    return (
      <Card>
        <h2>기록 검토</h2>
        <p className="device-help">
          자료에서 익명 본문을 확인하고 분석하면 인물과 시점을 살펴볼 수 있어요.
        </p>
      </Card>
    );
  return (
    <section aria-label="인물·시간·사건 검토" className="space-y-4">
      <Card>
        <h2>기록 검토</h2>
        <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
          <Field label="인물">
            <select
              className={control}
              value={person}
              onChange={(e) => {
                setPerson(e.target.value);
                setLimit(12);
              }}
            >
              <option value="">모든 인물</option>
              {index.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.ambiguous ? " · " + p.fileName : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="시점 (한국 시간)">
            <select
              className={control}
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setLimit(12);
              }}
            >
              <option value="">모든 시점</option>
              {[...index.times]
                .sort((a, b) =>
                  a === b
                    ? 0
                    : a === null
                      ? 1
                      : b === null
                        ? -1
                        : a.localeCompare(b),
                )
                .map((t) => (
                  <option key={t ?? "unknown"} value={t ?? "unknown"}>
                    {t
                      ? (t.length === 10 ? day : timestamp).format(new Date(t))
                      : "시점 미상"}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="사건">
            <select
              className={control}
              value={event}
              onChange={(e) => {
                setEvent(e.target.value);
                setLimit(12);
              }}
            >
              <option value="">모든 사건</option>
              {index.rows.map((r, i) => (
                <option key={r.id} value={r.id}>
                  {i + 1}. {r.quote.slice(0, 60)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(e) => {
              setMissingOnly(e.target.checked);
              setLimit(12);
            }}
          />
          누락 정보만 보기 ({missingCount})
        </label>
        <p className="device-help" role="status">
          {rows.length}개 문장
          {index.pendingFiles
            ? " · 분석 전 자료 " + index.pendingFiles + "개"
            : ""}
        </p>
      </Card>
      {rows.slice(0, limit).map((row) => (
        <Card key={row.id}>
          <p className="device-date">
            {row.datetime
              ? (row.dayOnly ? day : timestamp).format(new Date(row.datetime))
              : "시점 미상"}
            {row.datetime && row.approximate ? " · 대략" : ""} ·{" "}
            {row.reviewedId ? "기록 확인됨" : "검토 전"}
          </p>
          <blockquote className="mt-3 break-words text-base leading-7">
            {row.quote}
          </blockquote>
          {row.relations.map((r) => (
            <p key={r.id} className="mt-2 text-sm leading-6 text-slate-700">
              {polarity[r.polarity]} · {r.typeLabel} · {r.actor}
              {r.target ? (r.directed ? " → " : " ↔ ") + r.target : ""}
              {r.amount ? " · " + r.amount : ""}
            </p>
          ))}
          {row.missing.length > 0 && (
            <p className="mt-2 text-sm text-amber-800">
              확인할 정보 · {row.missing.join(", ")}
            </p>
          )}
          <button
            type="button"
            aria-expanded={open === row.id}
            className="mt-3 min-h-11 text-left text-sm font-medium text-blue-700"
            onClick={() => setOpen(open === row.id ? "" : row.id)}
          >
            근거 원문 · {row.fileName}
          </button>
          {open === row.id && (
            <div className="mt-2 rounded-xl bg-slate-50 p-4">
              {row.previousVersion && (
                <p className="mb-2 text-xs text-slate-600">저장한 이전 원문</p>
              )}
              <p className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-sm leading-7">
                {row.sourceText === null ? (
                  "이 기기에 근거 원문이 없습니다."
                ) : row.span ? (
                  <>
                    {row.sourceText.slice(0, row.span.start)}
                    <mark>
                      {row.sourceText.slice(row.span.start, row.span.end)}
                    </mark>
                    {row.sourceText.slice(row.span.end)}
                  </>
                ) : (
                  row.sourceText
                )}
              </p>
              {urls[row.evidenceId] && (
                <a
                  href={urls[row.evidenceId]}
                  download={row.fileName}
                  className="mt-2 inline-flex min-h-11 items-center text-sm text-blue-700"
                >
                  원본 파일 열기
                </a>
              )}
            </div>
          )}
        </Card>
      ))}
      {!rows.length && (
        <p className="device-help">선택한 조건의 문장이 없습니다.</p>
      )}
      {rows.length > limit && (
        <Button variant="outline" onClick={() => setLimit(limit + 12)}>
          다음 문장 보기
        </Button>
      )}
    </section>
  );
}
