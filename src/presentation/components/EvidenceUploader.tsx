"use client";
import { EvidenceGraph, phaseLabel, type LiveGraph } from "./EvidenceGraph";
import { RelationshipCanvas } from "./RelationshipCanvas";
import type { RelationshipMap } from "../../domain/services/RelationshipGraph";
import { AudioTranscript,type AudioSegment } from "./AudioTranscript";
import { evidenceUpload } from "./upload-evidence";
import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Download,
  ScanText,
  Check,
  ArrowRight,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { Button, Card, Field, Input, Textarea } from "./UI";
import type { Inspection } from "../../infrastructure/ai/local-worker";
type EvidenceItem = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  fileHash: string | null;
  phase?: string;
  error?: string;
  updatedAt?: string;
};
type RecordItem = {
  id: string;
  title: string;
  content: string;
  caseId: string | null;
};
type Result = {
  analysis: Inspection | null;
  phase?: string;
  error?: string;
  extraction?: { method: string; warnings: string[]; segments?:AudioSegment[] };
  analyzedAt?: string;
};
export function EvidenceUploader({
  caseId,
  cloudUpload = false,
  initialItems,
  lifeRecords,
}: {
  caseId: string;
  cloudUpload?: boolean;
  initialItems: EvidenceItem[];
  lifeRecords: RecordItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<EvidenceItem | null>(
    initialItems[0] ?? null,
  );
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("summary");
  const [checked, setChecked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [graph, setGraph] = useState<LiveGraph>({
    nodes: [],
    edges: [],
    totalFiles: initialItems.length,
    visibleFiles: 0,
    confirmed: 0,
  });
  const [relationships,setRelationships]=useState<RelationshipMap>({nodes:[],edges:[],totalRelations:0,shownRelations:0});
  const [graphView,setGraphView]=useState("people");
  const [syncError, setSyncError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const base = "/api/cases/" + caseId + "/evidence";
  async function request(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "처리할 수 없습니다.");
    return data;
  }
  useEffect(() => {
    let stopped = false,
      etag = "",
      version = "",
      timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
      if (document.hidden) {
        timer = setTimeout(poll, 2000);
        return;
      }
      try {
        const response = await fetch("/api/cases/" + caseId + "/live", {
          headers: etag ? { "if-none-match": etag } : {},
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status !== 304) {
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "연결 상태를 확인할 수 없습니다.");
          if (stopped) return;
          etag = response.headers.get("etag") || "";
          setItems(data.items);
          setGraph(data.graph);
          if(data.relationships)setRelationships(data.relationships);
          const current = data.items.find(
            (x: EvidenceItem) => x.id === selected?.id,
          );
          if (current && current.updatedAt !== version) {
            const resultResponse = await fetch(
              base + "/" + current.id + "?analysis=1",
              { signal: controller.signal, cache: "no-store" },
            );
            if (resultResponse.ok && !stopped) {
              version = current.updatedAt;
              setResult(await resultResponse.json());
            }
          }
        }
        if (!stopped) setSyncError("");
      } catch (e) {
        if (!stopped)
          setSyncError(
            e instanceof Error ? e.message : "연결을 확인하고 있어요.",
          );
      } finally {
        if (!stopped) timer = setTimeout(poll, 2000);
      }
    }
    void poll();
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [base, caseId, selected?.id, refreshKey]);
  function select(item: EvidenceItem) {
    if (busy) return;
    setSelected(item);
    setResult(null);
    setChecked([]);
    setError("");
    setNotice("");
    setTab("summary");
  }
  async function upload(files: FileList | null) {
    if (!files?.length || busy) return;
    setBusy("upload");
    setError("");
    setNotice("");
    let first: EvidenceItem | null = null;
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024)
          throw new Error(file.name + ": 20MB 이하로 올려 주세요.");
        const data = await evidenceUpload(caseId, file, cloudUpload);
        setItems((old) => [data.evidence, ...old]);
        first = data.evidence;
      }
      if (first) {
        setSelected(first);
        setResult(null);
        setChecked([]);
      }
      setNotice("원본을 보관하고 자동으로 연결하고 있어요.");
      setRefreshKey((x) => x + 1);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setBusy("");
    }
  }
  async function note(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("note");
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const data = await request(base, { method: "POST", body: form });
      setItems((old) => [data.evidence, ...old]);
      setSelected(data.evidence);
      setResult(null);
      setNotice("메모를 보관하고 자동 분석을 시작했어요.");
      setDraft("");
      formElement.reset();
      setRefreshKey((x) => x + 1);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy("");
    }
  }
  async function analyze() {
    if (!selected) return;
    setBusy("analyze");
    setError("");
    setNotice("");
    try {
      setResult(await request(base + "/" + selected.id, { method: "POST" }));
      setChecked([]);
      setRefreshKey((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setBusy("");
    }
  }
  async function accept(evidenceId=selected?.id,ids=checked) {
    if (!evidenceId || !ids.length) return;
    setBusy("accept");
    setError("");
    try {
      const data = await request(base + "/" + evidenceId + "/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateIds: ids }),
      });
      setNotice(data.count + "개 기록을 타임라인에 연결했습니다.");
      setChecked([]);
      setRefreshKey((x) => x + 1);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "반영 실패");
    } finally {
      setBusy("");
    }
  }
  const a = result?.analysis;
  return (
    <div>
      <div className="evidence-studio">
        <div className="evidence-composer">
          <section
            className={"upload-panel" + (items.length ? " has-items" : "")}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void upload(e.dataTransfer.files);
            }}
          >
            <Upload size={26} />
            <h2>자료를 여기에 놓아 주세요</h2>
            <p>사진, PDF, 대화, 녹음 / 파일당 20MB, 녹음 20분</p>
            <label>
              <span className="sr-only">증거 파일 선택</span>
              <input
                type="file"
                multiple
                accept=".txt,.csv,.json,.md,.log,.pdf,.docx,.png,.jpg,.jpeg,.webp,.bmp,.wav,.mp3,.flac,.ogg,.m4a,.aac,.mp4,.webm,.opus,.3gp"
                disabled={Boolean(busy)}
                onChange={(e) => {
                  void upload(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </section>
          {busy ? (
            <div className="notice" role="status">
              <progress aria-label="처리 중" className="mr-3 w-20" />
              {busy === "analyze"
                ? "전용 모델이 본문과 연결 관계를 분석하고 있어요."
                : busy === "upload"
                  ? "원본을 암호화해 보관하고 있어요."
                  : "처리하고 있어요."}
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="notice error">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="notice">
              {notice}
            </p>
          ) : null}
          <details
            className="mt-4 rounded-xl border border-stone-200 bg-white p-4"
          >
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <Plus size={15} />
              파일 없이 메모 추가
            </summary>
            <form onSubmit={note} className="mt-4 grid gap-4">
              <Field label="자료 이름">
                <Input name="name" required maxLength={240} />
              </Field>
              <Field label="기록 내용">
                <Textarea
                  name="content"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  required
                  maxLength={60000}
                  placeholder="기억나는 내용이나 대화 원문을 적어 주세요."
                />
              </Field>
              <Button disabled={Boolean(busy)}>메모 보관</Button>
            </form>
          </details>
        </div>
        <div className="min-w-0"><div className="inspector-tabs" aria-label="관계도 보기"><button type="button" aria-pressed={graphView==="people"} onClick={()=>setGraphView("people")}>인물·행위</button><button type="button" aria-pressed={graphView==="sources"} onClick={()=>setGraphView("sources")}>자료·사실</button></div>{graphView==="people"?<RelationshipCanvas graph={relationships} caseId={caseId} imageEvidence={items.filter(x=>x.type.startsWith("image/")||/\.(png|jpe?g|webp)$/i.test(x.name)).map(x=>({id:x.id,name:x.name}))} busy={Boolean(busy)} syncError={syncError} onSelect={id=>{const item=items.find(x=>x.id===id);if(item)select(item);}} onAccept={(id,candidate)=>void accept(id,[candidate])}/>:(<EvidenceGraph
          graph={graph}
          draft={draft}
          selected={selected?.id}
          onSelect={(id) => {
            const item = items.find((x) => x.id === id);
            if (item) select(item);
          }}
          syncError={syncError}
        />)}</div>
      </div>
      {result?.phase && result.phase !== "ready" ? (
        <div
          className={"notice" + (result.phase === "error" ? " error" : "")}
          role="status"
        >
          {phaseLabel[result.phase]}
          {result.error
            ? " · " + result.error
            : " · 분석 결과가 도착하면 자동으로 연결됩니다."}
        </div>
      ) : null}
      <div className="evidence-workspace">
        <div>
          <div className="section-heading !mt-0">
            <h2>
              보관한 자료 <span className="muted">{items.length}</span>
            </h2>
          </div>
          <label className="block mb-3">
            <span className="sr-only">자료 검색</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="자료 찾기"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="evidence-list">
            {items
              .filter((x) =>
                (x.name + " " + x.description)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((item) => (
                <button
                  type="button"
                  className="evidence-select"
                  key={item.id}
                  aria-pressed={selected?.id === item.id}
                  disabled={Boolean(busy)}
                  onClick={() => select(item)}
                >
                  <FileText size={21} />
                  <div className="min-w-0">
                    <strong>{item.name}</strong>
                    <span>
                      {item.type.startsWith("image")
                        ? "이미지"
                        : item.type.includes("pdf")
                          ? "PDF"
                          : "기록"}{" "}
                      · {phaseLabel[item.phase ?? "queued"]}
                    </span>
                  </div>
                </button>
              ))}
          </div>
          {!items.length ? (
            <p className="notice">첫 자료를 올려 주세요.</p>
          ) : null}
          {lifeRecords.length ? (
            <details className="mt-5 text-sm">
              <summary>일상 기록에서 가져오기</summary>
              <div className="space-y-2 mt-3">
                {lifeRecords.map((record) => (
                  <form key={record.id} onSubmit={note}>
                    <input type="hidden" name="name" value={record.title} />
                    <input
                      type="hidden"
                      name="content"
                      value={record.content}
                    />
                    <Button
                      disabled={Boolean(busy)}
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {record.title}
                      <Plus size={14} />
                    </Button>
                  </form>
                ))}
              </div>
            </details>
          ) : null}
        </div>
        {selected ? (
          <section className="inspector" aria-label="선택한 증거">
            <div className="inspector-header">
              <div>
                <h2>{selected.name}</h2>
                <p className="muted mt-2">
                  {a
                    ? "분석한 내용 · 원문과 대조해 주세요"
                    : "원본이 안전하게 보관되어 있어요"}
                </p>
              </div>
              <a href={base + "/" + selected.id}>
                <Download size={14} />
                원본
              </a>
            </div>
            {/\.(m4a|mp3|wav|flac|ogg|aac|mp4|webm|opus|3gp)$/i.test(selected.name)&&<AudioTranscript src={base+"/"+selected.id+"?preview=1"} segments={result?.extraction?.segments}/>}
            <details className="text-xs text-slate-500">
              <summary className="flex cursor-pointer items-center gap-1">
                <ShieldCheck size={13} />
                파일 무결성
              </summary>
              <p className="break-all mt-2 font-mono">
                SHA-256 {selected.fileHash ?? "이전 자료: 원본 재등록 필요"}
              </p>
              <p className="mt-2">
                해시는 저장 이후 변경 여부를 확인합니다. 자료의 진위나 취득
                적법성을 보증하지 않습니다.
              </p>
            </details>
            <div className="mt-5">
              <Button disabled={Boolean(busy)} onClick={analyze}>
                <ScanText size={16} />
                {a ? "다시 분석" : "본문 분석"}
              </Button>
            </div>
            {a ? (
              <>
                <div className="inspector-tabs" aria-label="분석 보기">
                  {[
                    ["summary", "확인할 사실"],
                    ["text", "추출 원문"],
                    ["language", "언어 분석"],
                  ].map(([id, label]) => (
                    <button
                      type="button"
                      key={id}
                      aria-pressed={tab === id}
                      onClick={() => setTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {tab === "summary" ? (
                  <>
                    <p className="muted">
                      원문에 있는 문장을 골라 타임라인에 연결하세요.
                    </p>
                    {a.candidates.map((c) => (
                      <label className="candidate" key={c.id}>
                        <input
                          type="checkbox"
                          checked={checked.includes(c.id)}
                          onChange={(e) =>
                            setChecked((old) =>
                              e.target.checked
                                ? [...old, c.id]
                                : old.filter((id) => id !== c.id),
                            )
                          }
                        />
                        <div>
                          <p>{c.quote}</p>
                          <small>
                            {[c.approximateTimeText, c.location]
                              .filter(Boolean)
                              .join(" · ") || "시점·장소 확인 필요"}
                          </small>
                        </div>
                      </label>
                    ))}
                    <Button
                      className="mt-5"
                      disabled={Boolean(busy) || !checked.length}
                      onClick={() => void accept()}
                    >
                      <Check size={16} />
                      {checked.length
                        ? checked.length + "개 사실 연결"
                        : "확인한 문장 선택"}
                    </Button>
                    <h3 className="mt-8 text-sm font-semibold">
                      학습 모델의 분류 제안
                    </h3>
                    {a.uncertain ? (
                      <p className="muted mt-2">
                        판단이 불확실해요. 여러 유형을 확인해 주세요.
                      </p>
                    ) : null}
                    {a.classification.slice(0, 3).map((x) => (
                      <div className="score-row" key={x.label}>
                        <span>{x.label}</span>
                        <progress
                          max={1}
                          value={x.score}
                          aria-label={x.label + " 모델 점수"}
                        />
                        <small>{Math.round(x.score * 100)}%</small>
                      </div>
                    ))}
                    <p className="muted !text-[11px]">
                      내부 분류 점수이며 진위·법적 책임 확률이 아닙니다.
                    </p>
                  </>
                ) : tab === "text" ? (
                  <>
                    {selected.type.startsWith("image/") ? (
                      <img
                        src={base + "/" + selected.id + "?preview=1"}
                        alt="선택한 증거 원본"
                        className="w-full max-h-96 object-contain rounded-xl border border-stone-200 mb-4"
                        loading="lazy"
                      />
                    ) : null}
                    {/\.(wav|mp3|flac|ogg)$/i.test(selected.name) ? (
                      <audio
                        controls
                        preload="none"
                        src={base + "/" + selected.id + "?preview=1"}
                        className="w-full mb-4"
                      />
                    ) : null}
                    <p className="muted mb-3">{result?.extraction?.method}</p>
                    {result?.extraction?.warnings.map((w) => (
                      <p className="notice" key={w}>
                        {w}
                      </p>
                    ))}
                    <pre className="source-text">{a.text}</pre>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold">주요 표현</h3>
                    <div className="tag-cloud">
                      {a.keywords.map((k) => (
                        <span className="token" key={k.text}>
                          {k.text}
                          <small>{k.count.toString()}</small>
                        </span>
                      ))}
                    </div>
                    <h3 className="text-sm font-semibold mt-6">
                      문장 안에서 함께 등장한 말
                    </h3>
                    {a.associations.length ? (
                      a.associations.map((x, i) => (
                        <p className="muted mt-2" key={i}>
                          {x.source} ↔ {x.target}{" "}
                          <small>
                            함께 {x.count}회 · PMI {x.pmi}
                          </small>
                        </p>
                      ))
                    ) : (
                      <p className="muted mt-2">
                        연관성을 계산하려면 반복 표현이 더 필요해요.
                      </p>
                    )}
                    <details className="mt-6 text-sm">
                      <summary>형태소·언어 분리 자세히</summary>
                      {a.detectedLanguages?.map((l, i) => (
                        <p className="muted mt-3" key={i}>
                          <strong>{l.language}</strong> · {l.text}
                        </p>
                      ))}
                      <p className="muted mt-3">
                        {Object.entries(a.languages)
                          .map(([k, v]) => k + ": " + v + "자")
                          .join(" · ")}
                      </p>
                      <div className="tag-cloud">
                        {a.tokens.map((t, i) => (
                          <span
                            className="token"
                            key={i}
                            title={"원문 위치 " + t.start}
                          >
                            {t.text}
                            <small>{t.tag}</small>
                          </span>
                        ))}
                      </div>
                      <p className="muted">
                        NN 명사 / VV 동사 / VA 형용사 / SL 외국어 / SN 숫자
                      </p>
                    </details>
                  </>
                )}
              </>
            ) : (
              <div className="py-12 text-center">
                <ScanText className="mx-auto text-teal-700 mb-4" size={34} />
                <h3 className="text-sm font-semibold">
                  자료 속 사실을 찾아볼까요?
                </h3>
                <p className="muted mt-2">
                  전용 모델이 원문, 형태소, 관련 근거를 분석해요.
                </p>
              </div>
            )}
          </section>
        ) : (
          <div className="empty-state">
            <FileText size={36} />
            <h2>자료가 모이면 흐름이 보입니다</h2>
            <p>왼쪽에서 자료를 선택하거나 새로 올려 주세요.</p>
          </div>
        )}
      </div>
      <a
        className="subtle-link mt-5 justify-end gap-2"
        href={"/cases/" + caseId + "/analysis"}
      >
        사건 전체 검토하기
        <ArrowRight size={15} />
      </a>
    </div>
  );
}
