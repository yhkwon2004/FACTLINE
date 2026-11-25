"use client";
import { useState, useEffect } from "react";
import {
  openTransfer,
  type Envelope,
} from "../../infrastructure/storage/DeviceVault";
import { Card, Field, Input, Button } from "./UI";
export function TokenReceiver() {
  const [file, setFile] = useState<File | null>(null),
    [content, setContent] = useState<Array<{
      name: string;
      text: string;
    }> | null>(null),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <main className="device-receive">
      <Card>
        <h1>받은 기록 열기</h1>
        <p className="device-help">파일과 토큰은 이 브라우저에서만 처리해요.</p>
        <form
          className="device-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setContent(null);
            try {
              if (!file || file.size > 30 * 1024 * 1024)
                throw Error("30MB 이하의 전달 파일을 선택해 주세요.");
              const form = e.currentTarget;
              const token = String(
                  new FormData(form).get("token") ?? "",
                ).trim(),
                payload = await openTransfer(
                  JSON.parse(await file.text()) as Envelope,
                  token,
                );
              if (
                payload.format !== "eumlog-selected-v1" ||
                !Array.isArray(payload.records) ||
                payload.records.length > 200 ||
                payload.records.some(
                  (r: { name: unknown; text: unknown }) =>
                    typeof r.name !== "string" || typeof r.text !== "string",
                )
              )
                throw Error("전달 파일 형식이 맞지 않습니다.");
              setContent(payload.records);
              form.reset();
            } catch {
              setError("파일 또는 토큰이 맞지 않거나 파일이 손상되었습니다.");
            }
          }}
        >
          <Field label="암호화 전달 파일">
            <Input
              disabled={!ready}
              type="file"
              accept="application/json,.json"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field label="별도로 받은 토큰">
            <Input
              disabled={!ready}
              type="password"
              name="token"
              autoComplete="off"
              required
              pattern="[A-Za-z0-9_-]{43}"
            />
          </Field>
          <Button disabled={!ready}>토큰으로 열기</Button>
        </form>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        {content && (
          <section className="mt-6 space-y-5">
            {content.map((r, i) => (
              <div key={i}>
                <h2>{r.name}</h2>
                <p className="whitespace-pre-wrap break-words mt-3">{r.text}</p>
              </div>
            ))}
            <Button
              className="mt-5"
              variant="outline"
              onClick={() => setContent(null)}
            >
              화면에서 닫기
            </Button>
          </section>
        )}
      </Card>
    </main>
  );
}
