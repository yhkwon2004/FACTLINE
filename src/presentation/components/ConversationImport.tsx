"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, MessageSquareText, ArrowRight } from "lucide-react";
import { Button, Card, Field, Input, Textarea } from "./UI";
export function ConversationImport({
  cases,
}: {
  cases: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [text, setText] = useState(""),
    [source, setSource] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [provider, setProvider] = useState("KAKAOTALK"),
    [caseId, setCaseId] = useState(cases[0]?.id ?? "new"),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  async function readFile(f: File | null) {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      setError("20MB 이하 텍스트를 선택해 주세요.");
      return;
    }
    const bytes = await f.arrayBuffer();
    let value = new TextDecoder("utf-8").decode(bytes);
    if (value.includes("�")) value = new TextDecoder("euc-kr").decode(bytes);
    setFile(f);
    setText(value);
    setSource(f.name);
  }
  async function post(url: string, body: BodyInit, json = false) {
    const r = await fetch(url, {
      method: "POST",
      body,
      headers: json ? { "content-type": "application/json" } : {},
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return d;
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("대화의 날짜와 발신자를 정리하고 있어요.");
    try {
      await post(
        "/api/integrations/import",
        JSON.stringify({
          provider,
          sourceName: source || "가져온 대화",
          rawText: text,
        }),
        true,
      );
      let target = caseId;
      if (target === "new") {
        const d = await post(
          "/api/cases",
          JSON.stringify({
            title: source || "가져온 대화 기록",
            type: "OTHER",
            description: "가져온 대화 원문을 정리하는 사건입니다.",
          }),
          true,
        );
        target = d.case.id;
      }
      const form = new FormData();
      if (file) form.set("file", file);
      else {
        form.set("name", source || "대화 원문.txt");
        form.set("content", text);
      }
      const evidence = await post("/api/cases/" + target + "/evidence", form);
      setBusy("원문을 분석하고 관련 자료를 찾고 있어요.");
      await post(
        "/api/cases/" + target + "/evidence/" + evidence.evidence.id,
        new FormData(),
      );
      router.push("/cases/" + target + "/evidence");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "가져오지 못했습니다.");
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="max-w-3xl">
      <div className="page-heading">
        <div>
          <h1>대화 가져오기</h1>
          <p>내보낸 파일이나 복사한 대화를 원문 그대로 보관하세요.</p>
        </div>
      </div>
      <Card>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="대화 종류">
              <select
                className="h-11 rounded-lg border border-stone-300 px-3"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="KAKAOTALK">카카오톡</option>
                <option value="SMS">문자</option>
                <option value="GMAIL">이메일</option>
                <option value="MANUAL">기타 텍스트</option>
              </select>
            </Field>
            <Field label="보관할 사건">
              <select
                className="h-11 rounded-lg border border-stone-300 px-3"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
                <option value="new">새 사건 만들기</option>
              </select>
            </Field>
          </div>
          <Field label="내보낸 텍스트 파일">
            <Input
              type="file"
              accept=".txt,.csv,.log,.md"
              onChange={(e) => void readFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field label="자료 이름">
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={120}
              placeholder="예: 5월 단체 대화"
            />
          </Field>
          <Field label="대화 원문">
            <Textarea
              required
              value={text}
              maxLength={120000}
              onChange={(e) => {
                setText(e.target.value);
                setFile(null);
              }}
              className="min-h-56"
              placeholder="내보내기 파일을 선택하거나 대화를 붙여넣어 주세요."
            />
          </Field>
          <p className="muted">
            원본 내보내기 파일을 이용합니다. 메신저 계정에 자동 접속하지 않아요.
          </p>
          <Button disabled={Boolean(busy)}>
            <Upload size={16} />
            가져와서 분석
            <ArrowRight size={16} />
          </Button>
        </form>
        {busy ? (
          <p className="notice" role="status">
            <progress aria-label="대화 처리 중" className="w-20 mr-3" />
            {busy}
          </p>
        ) : null}
        {error ? (
          <p className="notice error" role="alert">
            {error}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
