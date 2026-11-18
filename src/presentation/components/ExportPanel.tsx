"use client";
import { useState } from "react";
import { FileDown, RefreshCw, Printer, FileText } from "lucide-react";
import { Button, Card } from "./UI";
export function ExportPanel({
  caseId,
  initialContent,
}: {
  caseId: string;
  initialContent: string | null;
}) {
  const [content, setContent] = useState(initialContent),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/cases/" + caseId + "/report", {
        method: "POST",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setContent(d.report.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setBusy(false);
    }
  }
  function save() {
    if (!content) return;
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "EUMLOG-사건정리.md";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h1>정리본 내보내기</h1>
          <p>확인한 기록과 원본 목록을 한 문서로 모아요.</p>
        </div>
      </div>
      <Card>
        <div className="flex flex-wrap gap-3">
          <Button onClick={generate} disabled={busy}>
            <RefreshCw size={16} />
            {busy
              ? "자료를 바탕으로 작성 중"
              : content
                ? "정리본 다시 만들기"
                : "정리본 만들기"}
          </Button>
          {content ? (
            <>
              <Button variant="outline" onClick={save}>
                <FileDown size={16} />
                문서 저장
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer size={16} />
                인쇄 / PDF
              </Button>
            </>
          ) : null}
          <a
            href={"/api/cases/" + caseId + "/export"}
            className="primary-link !bg-slate-100 !text-slate-700"
          >
            원본 목록·기록 JSON
          </a>
        </div>
        {error ? (
          <p role="alert" className="notice error">
            {error}
          </p>
        ) : null}
        {busy ? (
          <p className="notice" role="status">
            <progress aria-label="문서 작성 중" className="w-20 mr-3" />
            원문 기반 정리본과 AI 초안을 작성하고 있어요.
          </p>
        ) : null}
      </Card>
      {content ? (
        <Card>
          <p className="notice print:hidden">
            AI 생성 부분을 확인한 뒤 사용해 주세요. 원본과 확인한 기록은 별도
            항목으로 유지됩니다.
          </p>
          <pre className="whitespace-pre-wrap text-sm leading-8">{content}</pre>
        </Card>
      ) : (
        <div className="empty-state">
          <FileText size={36} />
          <h2>필요한 순간 꺼내볼 수 있도록</h2>
          <p>시간순 기록, 증거 목록, 해시와 출처를 함께 정리합니다.</p>
        </div>
      )}
    </div>
  );
}
