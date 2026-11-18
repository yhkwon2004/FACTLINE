"use client";
import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import {
  ScanText,
  Send,
  ArrowUpRight,
  Link2,
  MessageSquareText,
} from "lucide-react";
import { Button, Card, Field, Input } from "./UI";
import type {
  Inspection,
  LocalReference,
} from "../../infrastructure/ai/local-worker";
type Review = {
  legal?:{notice:string;issues:Array<{title:string;note:string;checks:Array<{label:string;status:string;quote:string|null;question:string}>;references:LocalReference[]}>};
  history?:Array<{id:string;title:string;quote:string;score:number}>;
  analysis?: {
    missingInfo: Array<{ label: string; reason: string }>;
    risks: Array<{ phrase: string; riskReason: string }>;
    contradictions: Array<{ description: string }>;
  };
  local: {
    matches: Array<{
      source: string;
      target: string;
      sourceName: string;
      targetName: string;
      score: number;
      shared: string[];
    }>;
    inspection: Inspection;
  } | null;
  documentCount?: number;
  analyzedAt?: string;
};
export function CaseReview({ caseId }: { caseId: string }) {
  const [result, setResult] = useState<Review | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState<{
      answer: string;
      references: LocalReference[];
      evidenceQuotes?: Array<{ name: string; text: string; start: number }>;
    } | null>(null);
  const base = "/api/cases/" + caseId;
  useEffect(() => {
    let alive = true;
    fetch(base + "/analysis")
      .then((r) => r.json())
      .then((data) => {
        if (alive) setResult(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [base]);
  async function analyze() {
    setBusy("analysis");
    setError("");
    try {
      const r = await fetch(base + "/analysis", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setBusy("");
    }
  }
  async function ask(e: FormEvent) {
    e.preventDefault();
    setBusy("chat");
    setError("");
    try {
      const r = await fetch(base + "/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setAnswer(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "답변 생성 실패");
    } finally {
      setBusy("");
    }
  }
  const a = result?.analysis,
    local = result?.local;
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h1>사건 검토</h1>
          <p>자료 사이의 연결과 확인할 부분을 찾아요.</p>
        </div>
        <Button disabled={Boolean(busy)} onClick={analyze}>
          <ScanText size={16} />
          {busy === "analysis" ? "검토 중" : "전체 검토"}
        </Button>
      </div>
      {error ? (
        <p className="notice error" role="alert">
          {error}
        </p>
      ) : null}
      {local ? (
        <>
          <p className="muted">
            {result?.documentCount}개 자료 검토 ·{" "}
            {result?.analyzedAt
              ? new Date(result.analyzedAt).toLocaleString("ko-KR")
              : ""}
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <h2 className="flex items-center gap-2">
                <Link2 size={18} />
                자료 간 연결
              </h2>
              <p className="muted mt-2">
                표현과 의미가 비슷한 자료입니다. 인과·진위와는 구분해 주세요.
              </p>
              {local.matches.length ? (
                local.matches.map((m, i) => (
                  <div className="border-b border-stone-100 py-4" key={i}>
                    <p className="text-sm font-semibold">
                      {m.sourceName} ↔ {m.targetName}
                    </p>
                    <p className="muted mt-2">
                      {m.shared.join(" · ") || "다국어 의미가 유사한 표현"}
                    </p>
                    <p className="muted !text-[11px] mt-1">
                      유사도 {Math.round(m.score * 100)} / 100
                    </p>
                  </div>
                ))
              ) : (
                <p className="notice">비교할 자료나 공통 표현이 더 필요해요.</p>
              )}
            </Card>
            <Card>
              <h2>확인하면 더 좋은 부분</h2>
              {a?.missingInfo.slice(0, 8).map((x, i) => (
                <p className="notice" key={i}>
                  <strong>{x.label}</strong>
                  <br />
                  {x.reason}
                </p>
              ))}
              {a?.contradictions.map((x, i) => (
                <p key={i} className="notice error">
                  기록 간 차이: {x.description}
                </p>
              ))}
              <details className="mt-4 text-sm">
                <summary>표현 점검 {a?.risks.length ?? 0}개</summary>
                {a?.risks.map((x, i) => (
                  <p className="notice" key={i}>
                    “{x.phrase}” · {x.riskReason}
                  </p>
                ))}
              </details>
            </Card>
          </div>
          {result?.legal&&<Card><h2>원문에서 확인할 법률 쟁점</h2><p className="muted mt-2">{result.legal.notice}</p>{result.legal.issues.length?result.legal.issues.map(issue=><details key={issue.title} className="mt-4 rounded-xl border border-stone-200 p-4" open><summary className="cursor-pointer font-semibold">{issue.title}</summary><p className="mt-2 text-xs text-amber-800">{issue.note}</p>{issue.checks.map(c=><div key={c.label} className="mt-3 border-t border-stone-100 pt-3"><strong className="text-sm">{c.label} · {c.status==="mentioned"?"관련 표현 있음":"추가 확인"}</strong>{c.quote&&<blockquote className="mt-2 text-xs text-slate-600">“{c.quote}”</blockquote>}<p className="mt-1 text-xs text-slate-500">{c.question}</p></div>)}<div className="mt-3 flex flex-wrap gap-3">{issue.references.map(r=><a key={r.id} href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-800">{r.citation} ↗</a>)}</div></details>):<p className="notice">현재 지원하는 쟁점에 해당하는 표현을 찾지 못했습니다.</p>}</Card>}
          {result?.history&&<Card><h2>내 과거 기록에서 찾기</h2><p className="muted mt-2">내 계정의 잠기지 않은 최근 기록 최대 30개를 의미로 비교합니다.</p>{result.history.length?result.history.map(h=><Link key={h.id} href={"/cases/"+h.id} className="source-link">{h.title}<span>{h.quote}</span></Link>):<p className="notice">연결할 만한 과거 기록이 없습니다.</p>}</Card>}
          <Card>
            <h2>관련 법령·판례</h2>
            {local.inspection.references.length ? (
              local.inspection.references.map((r) => (
                <a
                  key={r.id}
                  className="source-link"
                  href={r.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {r.title}
                  <ArrowUpRight size={13} className="ml-2 inline" />
                  <span>{r.citation}</span>
                  <p className="text-xs text-slate-600 mt-3 leading-6">
                    {r.content.slice(0, 280)}…
                  </p>
                </a>
              ))
            ) : (
              <p className="notice">관련 원문을 찾지 못했어요.</p>
            )}
          </Card>
        </>
      ) : (
        <div className="empty-state">
          <ScanText size={36} />
          <h2>검토할 준비가 됐나요?</h2>
          <p>증거를 분석하고 문장을 연결한 뒤 전체 검토를 눌러 주세요.</p>
        </div>
      )}
      <Card>
        <h2 className="flex gap-2 items-center">
          <MessageSquareText size={18} />내 자료에 물어보기
        </h2>
        <p className="muted mt-2 mb-5">
          전용 LLM이 기록과 검색된 원문을 참고해 답합니다.
        </p>
        <form onSubmit={ask} className="flex gap-2 items-end">
          <div className="flex-1">
            <Field label="궁금한 점">
              <Input
                required
                maxLength={1800}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="상담 전에 무엇을 더 확인하면 좋을까요?"
              />
            </Field>
          </div>
          <Button disabled={Boolean(busy)} type="submit">
            <Send size={16} />
            <span className="sr-only sm:not-sr-only">질문</span>
          </Button>
        </form>
        {busy === "chat" ? (
          <p className="notice" role="status">
            <progress aria-label="답변 생성 중" className="mr-3 w-20" />전용 모델이 답변을 만들고 있어요.
          </p>
        ) : null}
        {answer ? (
          <div className="mt-5">
            <p className="notice">
              AI 생성 초안입니다. 사실과 법률 적용은 원문·전문가 확인이
              필요해요.
            </p>
            <div className="ai-answer">{answer.answer}</div>
            {answer.evidenceQuotes?.length ? (
              <details className="mt-4 text-sm">
                <summary>내 자료에서 찾은 근거</summary>
                {answer.evidenceQuotes.map((q, i) => (
                  <div key={i} className="source-link">
                    <strong>{q.name}</strong>
                    <pre className="whitespace-pre-wrap text-xs leading-7 mt-3">
                      {q.text}
                    </pre>
                  </div>
                ))}
              </details>
            ) : null}
            <details className="mt-4 text-sm">
              <summary>검색에 사용한 출처 {answer.references.length}개</summary>
              {answer.references.map((r) => (
                <a
                  key={r.id}
                  className="source-link"
                  href={r.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {r.citation}
                  <ArrowUpRight size={12} className="inline ml-1" />
                  <span>{r.content.slice(0, 200)}…</span>
                </a>
              ))}
            </details>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
