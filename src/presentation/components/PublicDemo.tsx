"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Check, Mic } from "lucide-react";
import { RelationshipCanvas } from "./RelationshipCanvas";
import { Card, Button } from "./UI";
import { indexCase, selectCaseRows } from "../../domain/services/CaseIndex";
import { CaseIndexInspector } from "./CaseIndexInspector";
import {
  emptyDiagram,
  nextDiagram,
  diagramSchema,
  type DiagramSnapshot,
} from "../../domain/services/DiagramDocument";
import {
  fictionalCase,
  newCase,
  type DeviceState,
  type FictionalScenario,
} from "../../domain/services/DeviceWorkspaceState";
import { DeviceVault } from "../../infrastructure/storage/DeviceVault";
type Demo = FictionalScenario;
export function PublicDemo({mobile=false}:{mobile?:boolean}) {
  const [demo, setDemo] = useState<Demo | null>(null),
    [view, setView] = useState<"graph" | "timeline" | "review">(mobile?"timeline":"graph"),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState(""),
    [check, setCheck] = useState(""),
    [busy, setBusy] = useState(false),
    [transcript, setTranscript] = useState(""),
    [speechModel, setSpeechModel] = useState<"tiny" | "small">("tiny");
  const snapshot = useRef<DiagramSnapshot>({
    revision: 0,
    updatedAt: null,
    document: emptyDiagram(),
  });
  const sourceHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/demo/scenario.json", { signal: controller.signal })
      .then((r) => r.json())
      .then((d: Demo) => {
        snapshot.current = fictionalCase(d).diagram;
        setDemo(d);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setMessage("시연 자료를 읽지 못했습니다.");
      });
    return () => controller.abort();
  }, []);
  async function transport(_url: string, init?: RequestInit) {
    try {
      if (init?.method === "PUT") {
        const body = JSON.parse(String(init.body));
        snapshot.current = nextDiagram(
          snapshot.current,
          body.revision,
          diagramSchema.parse(body.document),
        );
      }
      return Response.json(snapshot.current);
    } catch {
      return Response.json(
        { error: "다른 편집과 겹쳤습니다." },
        { status: 409 },
      );
    }
  }
  const index = useMemo(() => demo ? indexCase({id:demo.caseId, evidence:demo.files, events:[]}) : null, [demo]);
  if (!demo || !index)
    return (
      <main className="public-demo">
        <p role="status">{message || "가상 사건을 준비하고 있어요."}</p>
      </main>
    );
  const graph = index.graph;
  const sourceId = selected || (graph.edges.find((edge) => edge.kind === "payment") ?? graph.edges[0])?.evidenceId;
  const file = demo.files.find((f) => f.id === sourceId) ?? demo.files[0];
  const events = selectCaseRows(index, "", "", "", false);
  return (
    <main className={mobile?"public-demo phone-demo":"public-demo web-demo"} data-surface={mobile?"mobile":"desktop"}>
      <header>
        <Link className="brand" href="/">
          EUMLOG<span className="brand-dot">.</span>
        </Link>
        <Link className="primary-link" href="/register">
          내 기록 시작하기 <ArrowRight size={16} />
        </Link>
      </header>
      {mobile?<section className="phone-demo-cover"><span>가상 사건 수첩</span>
        <h1>{demo.title}</h1><p>11월 16일 – 19일 · 기록 {events.length}건</p>
      </section>:<div className="demo-intro">
        <span>가상 사건 시연</span>
        <h1>{demo.title}</h1>
        <p>5만 원은 누구에게 송금됐을까요? 연결선을 눌러 기록을 확인해 보세요.</p>
      </div>}
      <nav className="case-tabs" aria-label="시연 보기">
        <button
          aria-pressed={view === "graph"}
          onClick={() => setView("graph")}
        >
          인물과 행위
        </button>
        <button
          aria-pressed={view === "timeline"}
          onClick={() => setView("timeline")}
        >
          시간순 기록
        </button>
        <button aria-pressed={view === "review"} onClick={() => setView("review")}>기록 검토</button>
      </nav>
      {view === "graph" ? (
        <RelationshipCanvas
          graph={graph}
          mobile={mobile}
          browseFirst
          caseId="fictional-demo"
          transport={transport}
          onSelect={(id) => {
            setSelected(id);
            sourceHeading.current?.focus();
          }}
          onAccept={() =>
            setMessage(
              "시연의 확인 동작입니다. 내 기록은 로그인 후 기기 보관함에서 확인·저장하세요.",
            )
          }
          legalHref="/demo#legal"
          syncError=""
          busy={false}
        />
      ) : view === "review" ? <CaseIndexInspector index={index}/> : (
        <div className={mobile?"phone-daily-log":"demo-timeline"}>
          {events.map((e, i) => (
            <Card key={e.id}>
              <span className="demo-step" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="device-date">
                  {e.datetime
                    ? new Intl.DateTimeFormat("ko-KR", {
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        timeZone: "Asia/Seoul",
                      }).format(new Date(e.datetime))
                    : "시점 확인 필요"}
                </p>
                <h2>{e.quote}</h2>
                <p className="device-help">근거 · {e.fileName}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
      {message && (
        <p role="status" className="notice mt-5">
          {message}
        </p>
      )}
      <div className="demo-sources">
        <div>
          <h2 ref={sourceHeading} tabIndex={-1}>근거 원문</h2>
          <div className="demo-file-tabs">
            {demo.files.map((f) => (
              <button
                key={f.id}
                aria-pressed={file.id === f.id}
                onClick={() => setSelected(f.id)}
              >
                {f.name.replace(".txt", "")}
              </button>
            ))}
          </div>
          <Card>
            <blockquote>{file.text}</blockquote>
          </Card>
        </div>
        <Card className="demo-privacy">
          <ShieldCheck size={25} />
          <h2>내 기록은, 내 기기에</h2>
          <p>
            원본은 기기에 암호화해 보관해요. 직접 확인한 익명 본문만 분석기로 보냅니다.
          </p>
          <details>
            <summary>이 브라우저의 보관 기능 확인</summary>
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setCheck("이 기기의 암호화·저장을 확인하는 중…");
                const ids = [
                  "selfcheck-" + crypto.randomUUID(),
                  "selfcheck-" + crypto.randomUUID(),
                ];
                let a: DeviceVault | undefined, b: DeviceVault | undefined;
                try {
                  const password = crypto.randomUUID() + "-synthetic";
                  a = await DeviceVault.open(ids[0], password);
                  await a.putFile(
                    "sample",
                    new Blob(["synthetic-private-file"]),
                  );
                  const synthetic = { version: 1, cases: [newCase("합성 보관 확인")] };
                  await a.save("workspace", synthetic, 0);
                  const value = await a.read<DeviceState>("workspace");
                  if (value?.cases[0].id !== synthetic.cases[0].id)
                    throw Error("저장 왕복");
                  const race = await Promise.allSettled([
                    a.save("workspace", synthetic, 1),
                    a.save("workspace", synthetic, 1),
                  ]);
                  if (race.filter((r) => r.status === "fulfilled").length !== 1)
                    throw Error("동시 저장 보호");
                  const backup = await a.backup();
                  if (JSON.stringify(backup).includes("synthetic-private-file"))
                    throw Error("원문 암호화");
                  await DeviceVault.restore(ids[1], backup, password);
                  b = await DeviceVault.open(ids[1], password);
                  if (
                    (await (await b.file("sample")).text()) !==
                    "synthetic-private-file"
                  )
                    throw Error("백업 복원");
                  setCheck(
                    "암호화 저장·원본 읽기·동시 저장 보호·백업 복원 확인 완료",
                  );
                } catch (e) {
                  setCheck(
                    "이 브라우저의 기기 보관을 확인하지 못했습니다. " +
                      (e instanceof Error ? e.message : ""),
                  );
                } finally {
                  a?.close();
                  b?.close();
                  for (const id of ids)
                    indexedDB.deleteDatabase("eumlog-device-v1-" + id);
                  setBusy(false);
                }
              }}
            >
              <Check size={16} />
              기기 보관 확인
            </Button>
            <p role="status" className="device-help">
              {check}
            </p>
          </details>
        </Card>
      </div>
      <details className="demo-audio">
        <summary>합성 녹음도 기기에서 읽어보기</summary>
        <p className="device-help">
          첫 변환 때 선택한 모델을 내려받습니다. 녹음은 기기에서 읽습니다.
        </p>
        <audio
          controls
          src="/demo/synthetic-korean.m4a"
          preload="none"
          aria-label="합성 한국어 녹음"
        />
        <select
          className="demo-speech-quality"
          aria-label="합성 음성 변환 품질"
          value={speechModel}
          onChange={(e) => setSpeechModel(e.target.value as "tiny" | "small")}
        >
          <option value="tiny">빠른 변환 · 모델 약 50MB</option>
          <option value="small">정밀 변환 · 모델 약 250MB</option>
        </select>
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setTranscript("음성 모델을 준비하는 중…");
            try {
              const bytes = await fetch("/demo/synthetic-korean.m4a").then(
                  (r) => r.blob(),
                ),
                { readDeviceFile } = await import(
                  "../../infrastructure/ai/browser-media"
                );
              const value = await readDeviceFile(
                new File([bytes], "synthetic-korean.m4a", {
                  type: "audio/mp4",
                }),
                setTranscript,
                speechModel,
              );
              setTranscript(value.text);
            } catch (e) {
              setTranscript(e instanceof Error ? e.message : "변환 실패");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Mic size={16} />이 기기에서 변환
        </Button>
        <p role="status" className="demo-transcript">
          {transcript}
        </p>
      </details>
      <details id="legal" className="demo-audio">
        <summary>시연에서 찾은 공식 법률 근거</summary>
        <ul className="mt-5 space-y-3">
          {demo.files[1].analysis.references?.map((r) => (
            <li key={r.citation}>
              <a
                href={r.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700"
              >
                {r.citation} ↗
              </a>
            </li>
          ))}
        </ul>
        <p className="device-help">
          검색한 참고 자료입니다. 이 사건에 적용되거나 법적 책임이 인정된다는
          뜻은 아닙니다.
        </p>
      </details>
      <footer>
        <a href={mobile?"/demo?view=desktop":"/demo?view=mobile"}>{mobile?"웹 작업대로 보기":"모바일 수첩으로 보기"}</a>
        <Link href="/demo/training#structure-order">관계도 학습 기록</Link>
        <p>모든 인물과 기록은 가상입니다. 편집 내용은 새로고침하면 초기화됩니다.</p>
        <Link href="/register">
          Google로 내 보관함 시작하기 <ArrowRight size={16} />
        </Link>
      </footer>
    </main>
  );
}
