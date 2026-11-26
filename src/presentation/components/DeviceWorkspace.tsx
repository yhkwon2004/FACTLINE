"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {notifyAuthChange} from "./auth-notify";
import {DeleteAccount} from "./DeleteAccount";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LockKeyhole,
  ShieldCheck,
  Plus,
  Mic,
  FolderOpen,
  Upload,
  Download,
  ArrowRight,
  Send,
  Search,
  Share2,
  Check,
} from "lucide-react";
import {
  DeviceVault,
  createTransfer,
} from "../../infrastructure/storage/DeviceVault";
import {
  newState,
  newCase,
  fictionalCase,
  validateState,
  confirmCandidate,
  type DeviceState,
  type DeviceCase,
  type DeviceEvidence,
} from "../../domain/services/DeviceWorkspaceState";
import {
  anonymize,
  restoreInspection,
  suspectedNames,
  residualIdentifiers,
  consentPayload,
} from "../../domain/services/PrivateData";
import { LegalReferenceCard } from "./LegalReferenceCard";
import { indexCase, type CaseIndex } from "../../domain/services/CaseIndex";
import { CaseIndexInspector } from "./CaseIndexInspector";
import {
  diagramSchema,
  nextDiagram,
} from "../../domain/services/DiagramDocument";
import type { Inspection } from "../../infrastructure/ai/local-worker";
import { RelationshipCanvas } from "./RelationshipCanvas";
import { AudioTranscript } from "./AudioTranscript";
import { VoiceRecorder } from "./VoiceRecorder";
import { Button, Card, Input, Textarea, Field } from "./UI";
const digest = async (text: string | ArrayBuffer) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        typeof text === "string" ? new TextEncoder().encode(text) : text,
      ),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(value)], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
type Store = {
  userId: string;
  vault: DeviceVault;
  state: DeviceState;
  commit: (change: (s: DeviceState) => void) => Promise<void>;
  lock: () => void;
};
const Context = createContext<Store | null>(null);
const useVault = () => {
  const value = useContext(Context);
  if (!value) throw Error("보관함이 잠겨 있습니다.");
  return value;
};
export function DeviceVaultProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [vault, setVault] = useState<DeviceVault | null>(null),
    [state, setState] = useState<DeviceState>(newState),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [clientReady, setClientReady] = useState(false);
  const [existingVault,setExistingVault]=useState<boolean|null>(null);
  useEffect(()=>{let stopped=false;DeviceVault.exists(userId).then(value=>{if(!stopped){setExistingVault(value);setClientReady(true);}}).catch(()=>{if(!stopped)setError('이 브라우저의 기기 보관 기능을 사용할 수 없습니다. 브라우저 설정을 확인해 주세요.');});return()=>{stopped=true;};},[userId]);
  useEffect(()=>{if(typeof BroadcastChannel==='undefined')return;const auth=new BroadcastChannel('eumlog-auth-v1');auth.onmessage=e=>{if(e.data.userId===userId)return;lock();if(e.data.userId)location.reload();else location.href='/login';};return()=>auth.close();},[userId]);
  const channel = useRef<BroadcastChannel | null>(null);
  const current = useRef<DeviceVault | null>(null),
    stateRef = useRef(state),
    revision = useRef(0),
    queue = useRef(Promise.resolve()),
    active = useRef(Date.now());
  function lock() {
    current.current?.close();
    current.current = null;
    setVault(null);
    setState(newState());
    stateRef.current = newState();
  }
  useEffect(() => {
    const touch = () => {
        active.current = Date.now();
      },
      timer = setInterval(() => {
        if (current.current && Date.now() - active.current > 10 * 60 * 1000)
          lock();
      }, 15000);
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      current.current?.close();
      current.current = null;
    };
  }, []);
  async function open(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = e.currentTarget,
      password = String(new FormData(form).get("password") ?? "");
    try {
      if(existingVault===false&&password!==String(new FormData(form).get('confirmPassword')??''))throw Error('보관함 암호가 일치하지 않습니다.');
      const v = await DeviceVault.open(userId, password),
        record = await v.readVersioned<unknown>("workspace");
      const loaded = record ? validateState(record.value) : newState();
      revision.current = record?.revision ?? 0;
      current.current = v;
      stateRef.current = loaded;
      setState(loaded);
      setVault(v);
      setExistingVault(true);
      active.current = Date.now();
      form.reset();
      void navigator.storage?.persist?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "보관함을 열지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  async function commit(change: (s: DeviceState) => void) {
    const v = current.current;
    if (!v) throw Error("보관함을 다시 열어 주세요.");
    const next = queue.current
      .catch(() => {})
      .then(async () => {
        if (current.current !== v) throw Error("보관함이 잠겼습니다.");
        const copy = structuredClone(stateRef.current);
        change(copy);
        validateState(copy);
        const rev = await v.save("workspace", copy, revision.current);
        revision.current = rev;
        channel.current?.postMessage({ revision: rev });
        if (current.current === v) {
          stateRef.current = copy;
          setState(copy);
        }
      });
    queue.current = next;
    return next;
  }
  useEffect(() => {
    if (!vault || !("BroadcastChannel" in window)) return;
    const updates = new BroadcastChannel("eumlog-revision-" + userId);
    channel.current = updates;
    updates.onmessage = () => {
      const v = current.current;
      if (!v) return;
      void queue.current
        .catch(() => {})
        .then(async () => {
          const record = await v.readVersioned<unknown>("workspace");
          if (
            current.current !== v ||
            !record ||
            record.revision <= revision.current
          )
            return;
          const loaded = validateState(record.value);
          revision.current = record.revision;
          stateRef.current = loaded;
          setState(loaded);
        })
        .catch(() =>
          setError("다른 화면의 갱신을 확인하지 못했습니다. 다시 열어 주세요."),
        );
    };
    return () => {
      updates.close();
      channel.current = null;
    };
  }, [vault, userId]);
  if (!vault)
    return (
      <div className="device-unlock">
        <Card>
          <ShieldCheck size={32} />
          <h1>이 기기의 보관함</h1>
          <p>원본과 실명은 암호화해 이 브라우저에 보관해요.</p>
          <form onSubmit={open}>
            <Field label="이 기기의 보관함 암호">
              <Input
                disabled={!clientReady || busy}
                name="password"
                type="password"
                autoComplete="off"
                minLength={10}
                required
                placeholder="Google 비밀번호와 다른 10자 이상"
              />
            </Field>
            {existingVault===false&&<Field label="보관함 암호 확인"><Input type="password" name="confirmPassword" required minLength={10} autoComplete="off" disabled={!clientReady||busy}/></Field>}
            <Button disabled={!clientReady || busy}>
              <LockKeyhole size={17} />
              {busy ? "여는 중…" : existingVault===false?"이 기기에 보관함 만들기":"보관함 열기"}
            </Button>
          </form>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <details>
            <summary>보관 방식과 백업</summary>
            <p>
              처음 입력한 암호로 보관함을 만듭니다. 암호는 서버로 보내지 않으며
              복구할 수 없어요. 브라우저 자료를 지우거나 기기를 잃으면 기록도
              잃을 수 있으니 암호화 백업을 별도로 보관하세요. 다른 기기와 자동
              동기화하지 않습니다.
            </p>
          </details>
          <RestoreVault userId={userId} ready={clientReady} onRestore={() => setExistingVault(true)} />
        </Card>
      </div>
    );
  return (
    <Context.Provider value={{ userId, vault, state, commit, lock }}>
      <div className="device-status">
        <span>
          <ShieldCheck size={15} />이 기기에 보관 중
        </span>
        <button type="button" onClick={lock}>
          <LockKeyhole size={14} />
          잠그기
        </button>
      </div>
      {children}
    </Context.Provider>
  );
}
function RestoreVault({ userId, ready, onRestore }: { userId: string; ready: boolean; onRestore: () => void }) {
  const [file, setFile] = useState<File | null>(null),
    [status, setStatus] = useState("");
  return (
    <details className="mt-5">
      <summary>백업 복원</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setStatus("복원 중…");
          try {
            if (!file || file.size > 100 * 1024 * 1024)
              throw Error("100MB 이하의 백업을 선택해 주세요.");
            const password = String(
              new FormData(e.currentTarget).get("backupPassword") ?? "",
            );
            await DeviceVault.restore(
              userId,
              JSON.parse(await file.text()),
              password,
            );
            onRestore();
            setStatus("복원했어요. 위에서 백업의 암호로 열어 주세요.");
          } catch (e) {
            setStatus(e instanceof Error ? e.message : "복원 실패");
          }
        }}
      >
        <Input
          disabled={!ready}
          aria-label="암호화 백업 파일"
          type="file"
          accept="application/json,.json"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Input
          disabled={!ready}
          type="password"
          name="backupPassword"
          aria-label="백업 암호"
          required
          minLength={10}
        />
        <Button disabled={!ready} variant="outline">
          빈 보관함에 복원
        </Button>
      </form>
      <p role="status">{status}</p>
    </details>
  );
}
export function DeviceWorkspace({ path, mobile = false }: { path: string[]; mobile?: boolean }) {
  const store = useVault(),
    { state } = store;
  const router = useRouter();
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  if (path[0] === "settings" || path[0] === "mypage") return <VaultSettings />;
  if (path[0] === "cases" && path[1] === "new")
    return (
      <Card>
        <h1>새 사건</h1>
        <form
          className="device-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              const title = String(
                new FormData(e.currentTarget).get("title") ?? "",
              ).trim();
              if (title.length < 2 || title.length > 120)
                throw Error("2~120자로 입력해 주세요.");
              const c = newCase(title);
              await store.commit((s) => s.cases.unshift(c));
              router.push("/vault/cases/" + c.id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "저장 실패");
            }
          }}
        >
          <Field label="사건 이름">
            <Input
              name="title"
              required
              minLength={2}
              maxLength={120}
              placeholder="나만 알아보기 쉬운 이름"
            />
          </Field>
          <Button>
            <Plus size={17} />
            만들기
          </Button>
        </form>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
      </Card>
    );
  if (path[0] === "cases" && path[1]) {
    const c = state.cases.find((c) => c.id === path[1]);
    if (!c)
      return (
        <Card>
          <h1>이 기기에 없는 사건이에요</h1>
          <Link href="/vault/cases">사건 목록</Link>
        </Card>
      );
    if (mobile && !path[2]) return <PhoneCase item={c} />;
    return <DeviceCasePage key={c.id} item={c} tab={path[2] ?? "evidence"} mobile={mobile} />;
  }
  if (path[0] === "life") return <DeviceVoice />;
  if (path[0] === "integrations")
    return (
      <Card>
        <h1>대화 가져오기</h1>
        <p className="muted mt-3">
          내보낸 대화 파일을 기기에서 읽고 익명 처리 후 분석하세요.
        </p>
        <div className="mt-6">
          <Link
            className="primary-link"
            href={
              state.cases[0]
                ? "/vault/cases/" + state.cases[0].id
                : "/vault/cases/new"
            }
          >
            자료 추가로 이동 <ArrowRight size={17} />
          </Link>
        </div>
      </Card>
    );
  if (path[0] === "cases")
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>내 사건</h1>
            <p>{state.cases.length}개 · 이 기기에 보관</p>
          </div>
          <Link href="/vault/cases/new" className="primary-link">
            <Plus size={17} />새 사건
          </Link>
        </div>
        {state.cases.length > 0 && (
          <label className="case-search">
            <Search size={18} aria-hidden="true" />
            <input type="search" value={search} maxLength={200}
              aria-label="이 기기의 사건 검색" placeholder="사건명, 자료, 원문 검색"
              onChange={(event) => setSearch(event.target.value)} />
          </label>
        )}
        <CaseList cases={state.cases} search={search} />
      </>
    );
  if (mobile) return <section className="phone-notebook">
    <p className="phone-date">{new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",weekday:"long"}).format(new Date())}</p>
    <h1>기록 수첩</h1>
    <Link className="phone-record" href="/vault/life"><Mic/><span>오늘 일 기록하기<small>녹음하거나 파일 가져오기</small></span><ArrowRight size={18}/></Link>
    <div className="section-heading"><h2>최근 사건</h2><Link href="/vault/cases">전체 보기</Link></div>
    <CaseList cases={state.cases.slice(0,3)}/><DemoLoader/>
  </section>;
  return (
    <div className="home-page">
      <div className="home-hero">
        <span className="home-date">내 기기 · 나의 기록</span>
        <h1>어떤 기록을 남길까요?</h1>
        <p>
          사건 {state.cases.length} · 보관한 자료{" "}
          {state.cases.reduce((n, c) => n + c.evidence.length, 0)}
        </p>
      </div>
      <div className="home-actions">
        {[
          {
            label: "음성 기록",
            hint: "기기에서 녹음 변환",
            href: "/vault/life",
            Icon: Mic,
          },
          {
            label: "자료 추가",
            hint: "원본은 이 기기에",
            href: state.cases[0]
              ? "/vault/cases/" + state.cases[0].id
              : "/vault/cases/new",
            Icon: Upload,
          },
          {
            label: "새 사건",
            hint: "기록을 한곳에",
            href: "/vault/cases/new",
            Icon: Plus,
          },
        ].map((a, i) => (
          <Link
            key={a.label}
            className={"home-action " + (i === 0 ? "blue" : "neutral")}
            href={a.href}
          >
            <span className="home-action-icon">
              <a.Icon size={25} />
            </span>
            <ArrowRight className="home-action-arrow" size={19} />
            <h2>{a.label}</h2>
            <p>{a.hint}</p>
          </Link>
        ))}
      </div>
      <div className="section-heading">
        <h2>최근 사건</h2>
        <Link href="/vault/cases">모두 보기</Link>
      </div>
      <CaseList cases={state.cases.slice(0, 4)} />
      <DemoLoader />
    </div>
  );
}
function PhoneCase({item}:{item:DeviceCase}) {
  const base="/vault/cases/"+item.id;
  return <section className="phone-notebook"><Link className="phone-date" href="/vault/cases">내 사건</Link>
    <h1>{item.title}</h1><p className="device-help">자료 {item.evidence.length} · 확인한 기록 {item.events.length}</p>
    <Link href={base+"/evidence#capture"} className="phone-record"><Mic/><span>자료 기록하기<small>녹음 · 메모 · 파일</small></span><Plus size={20}/></Link>
    <h2>사건 살펴보기</h2><nav className="phone-case-menu" aria-label="사건 살펴보기">
    {([["review","진술 검토","인물 · 시간 · 사건"],["timeline","타임라인","시간순 기록"],["evidence#relationships","관계 지도","인물과 행위"],["legal-reference","법률 근거","법령 · 판례"],["report","상담 자료","확인한 기록 내보내기"]]).map(([slug,title,hint])=>
      <Link href={base+"/"+slug} key={slug}><span>{title}<small>{hint}</small></span><ArrowRight size={16}/></Link>)}</nav>
  </section>;
}
function CaseList({ cases, search = "" }: { cases: DeviceCase[]; search?: string }) {
  const query = search.trim().normalize("NFC").toLocaleLowerCase("ko-KR");
  const matches = (value: string) => value.normalize("NFC").toLocaleLowerCase("ko-KR").includes(query);
  const visible = query ? cases.filter(c => matches(c.title) ||
    c.evidence.some(e => matches(e.name) || matches(e.text)) ||
    c.events.some(e => matches(e.quote))) : cases;
  if (query && !visible.length) return <p role="status" className="device-help">일치하는 사건이 없어요.</p>;
  return visible.length ? (
    <div className="case-list">
      {visible.map((c) => (
        <Link key={c.id} href={"/vault/cases/" + c.id} className="case-row">
          <span className="case-symbol">
            <FolderOpen size={22} />
          </span>
          <div className="min-w-0">
            <h3>{c.title}</h3>
            <p>
              자료 {c.evidence.length} · 확인한 기록 {c.events.length}
            </p>
          </div>
          <ArrowRight size={18} className="row-arrow" />
        </Link>
      ))}
    </div>
  ) : (
    <Card>
      <p>아직 보관한 사건이 없어요.</p>
      <Link href="/vault/cases/new" className="primary-link mt-5">
        첫 사건 만들기
      </Link>
    </Card>
  );
}
function DeviceVoice() {
  const { state, commit } = useVault(),
    router = useRouter(),
    [error, setError] = useState("");
  return (
    <Card className="voice-journal">
      <div className="flex items-center gap-3">
        <span className="voice-symbol">
          <Mic />
        </span>
        <div>
          <h1>오늘의 음성 기록</h1>
          <p className="muted mt-2">원본을 보내지 않고 기기에서 변환해요.</p>
        </div>
      </div>
      <form
        className="device-form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const date = String(new FormData(e.currentTarget).get("date")),
              title = date + " 하루 기록";
            let c = state.cases.find((c) => c.title === title);
            if (!c) {
              c = newCase(title);
              await commit((s) => s.cases.unshift(c!));
            }
            router.push(
              "/vault/cases/" +
                c.id +
                "/evidence?recordingDate=" +
                encodeURIComponent(date),
            );
          } catch (e) {
            setError(e instanceof Error ? e.message : "저장 실패");
          }
        }}
      >
        <Field label="녹음 기준일">
          <Input
            type="date"
            name="date"
            required
            defaultValue={new Date().toLocaleDateString("sv-SE")}
          />
        </Field>
        <Button>
          <Mic size={17} />
          녹음 추가하기
        </Button>
      </form>
      {error && <p role="alert">{error}</p>}
      <p className="device-help">
        첫 사용 시 공개 음성 모델을 내려받습니다. 실제 전사에는 기기의 메모리와
        시간이 필요해요.
      </p>
    </Card>
  );
}
function DeviceCasePage({ item, tab, mobile }: { item: DeviceCase; tab: string; mobile: boolean }) {
  const { vault, commit } = useVault(),
    [selected, setSelected] = useState<string | null>(null),
    [urls, setUrls] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [terms, setTerms] = useState(""),
    [review, setReview] = useState(""),
    [approved, setApproved] = useState(false),
    [result, setResult] = useState<unknown>(null),
    [share, setShare] = useState(false),
    [question, setQuestion] = useState(
      "이 기록의 관계와 확인할 내용을 자연스러운 한국어로 설명해 주세요.",
    ),
    [draft, setDraft] = useState<{
      id: string;
      original: string;
      value: string;
    } | null>(null),
    [speechModel, setSpeechModel] = useState<"tiny" | "small">("tiny");
  const current = useRef(item);
  current.current = item;
  const e = item.evidence.find((e) => e.id === selected) ?? item.evidence[0];
  const redacted = e
    ? anonymize(e.text, terms.split(/[\n,]/).filter(Boolean))
    : null;
  useEffect(() => {
    let stopped = false;
    const created: string[] = [];
    Promise.all(
      item.evidence.map(async (e) => {
        const url = URL.createObjectURL(await vault.file(e.fileId ?? e.id));
        created.push(url);
        return [e.id, url];
      }),
    )
      .then((rows) => {
        if (!stopped) setUrls(Object.fromEntries(rows));
      })
      .catch(() => {
        if (!stopped)
          setError("일부 원본을 읽지 못했습니다. 백업을 확인해 주세요.");
      });
    return () => {
      stopped = true;
      created.forEach(URL.revokeObjectURL);
    };
  }, [vault, item.evidence.map((e) => e.id).join("|")]);
  useEffect(() => {
    setTerms(e ? suspectedNames(e.text).join("\n") : "");
    setReview("");
    setApproved(false);
    setResult(null);
  }, [e?.id]);
  useEffect(() => {
    if (redacted) {
      setReview(redacted.text);
      setApproved(false);
    }
  }, [e?.text, terms]);
  const index = useMemo(() => indexCase(item), [item]);
  const graph = index.graph;
  async function accept(evidenceId: string, candidateId: string) {
    try {
      const evidence = current.current.evidence.find(
          (e) => e.id === evidenceId,
        ),
        candidate = evidence?.analysis?.candidates.find(
          (c) => c.id === candidateId,
        );
      if (!candidate) throw Error("원문을 다시 확인해 주세요.");
      await commit((s) =>
        confirmCandidate(
          s.cases.find((c) => c.id === item.id)!,
          evidenceId,
          candidate,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    }
  }
  async function add(file: File) {
    setBusy("원본을 기기에 암호화해 보관하는 중…");
    setError("");
    let originalSaved = false;
    try {
      if (item.locked) throw Error("잠긴 사건입니다.");
      const id = crypto.randomUUID();
      if (file.size > 20 * 1024 * 1024)
        throw Error("파일은 20MB 이하여야 합니다.");
      await vault.putFile(id, file);
      const entry: DeviceEvidence = {
        id,
        name: file.name,
        type: file.type,
        hash: await digest(await file.arrayBuffer()),
        size: file.size,
        text: "",
        date:
          new URLSearchParams(location.search).get("recordingDate") ??
          new Date().toLocaleDateString("sv-SE"),
        createdAt: new Date().toISOString(),
      };
      await commit((s) =>
        s.cases.find((c) => c.id === item.id)!.evidence.push(entry),
      );
      originalSaved = true;
      setSelected(id);
      const { readDeviceFile } = await import(
        "../../infrastructure/ai/browser-media"
      );
      const extracted = await readDeviceFile(file, setBusy, speechModel);
      await commit((s) =>
        Object.assign(
          s.cases
            .find((c) => c.id === item.id)!
            .evidence.find((e) => e.id === id)!,
          extracted,
        ),
      );
      return true;
    } catch (e) {
      const detail = e instanceof Error ? e.message : "파일을 읽지 못했습니다.";
      setError(originalSaved ? "원본은 보관함에 저장했습니다. " + detail : detail);
      return originalSaved;
    } finally {
      setBusy("");
    }
  }
  async function analyze(
    task: "inspect" | "chat" | "legal",
    question?: string,
  ) {
    setError("");
    if (!e || !redacted || !approved) return;
    setBusy("승인한 익명 자료를 분석하는 중…");
    try {
      if (residualIdentifiers(review).length)
        throw Error("연락처 등의 식별 정보를 먼저 가려 주세요.");
      if (task === "inspect" && review !== redacted.text)
        throw Error(
          "근거 위치를 보존하려면 가릴 정보 목록에 추가해 주세요. 직접 수정한 본문은 질문·법률 검토에 사용할 수 있어요.",
        );
      const r = await fetch("/api/private/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            task,
            anonymousText: review,
            question,
            consent: true,
            digest: await digest(
              consentPayload(task, review, question, e.date),
            ),
            referenceDate: e.date,
          }),
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error || "분석 연결을 확인해 주세요.");
      if (task === "inspect") {
        const analysis = restoreInspection(
          d.result as Inspection,
          e.text,
          redacted,
        );
        await commit((s) => {
          const target = s.cases.find((c) => c.id === item.id)!;
          if (target.locked) throw Error("잠긴 사건입니다.");
          const original = target.evidence.find((v) => v.id === e.id)!;
          if (original.text !== e.text || original.date !== e.date)
            throw Error(
              "분석 중 원문이나 기준일이 변경되었습니다. 다시 분석해 주세요.",
            );
          original.analysis = analysis;
        });
      } else setResult(d.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setBusy("");
    }
  }
  async function transport(url: string, init?: RequestInit) {
    if (url.startsWith("blob:")) return fetch(url);
    try {
      const c = current.current;
      if (!url.endsWith("/diagram"))
        throw Error("허용하지 않는 기기 요청입니다.");
      if (init?.method === "PUT") {
        if (c.locked) throw Error("잠긴 사건입니다.");
        const body = JSON.parse(String(init.body)),
          document = diagramSchema.parse(body.document);
        const snapshot = nextDiagram(c.diagram, body.revision, document);
        await commit((s) => {
          const target = s.cases.find((v) => v.id === c.id)!;
          if (target.locked) throw Error("잠긴 사건입니다.");
          if (Object.values(document.nodes).some(n => n.portraitEvidenceId && !target.evidence.some(e => e.id === n.portraitEvidenceId)))
            throw Error("이 사건의 사진만 사용할 수 있습니다.");
          if (target.diagram.revision !== body.revision)
            throw Error("다른 화면에서 변경했습니다.");
          target.diagram = snapshot;
        });
        return Response.json(snapshot);
      }
      return Response.json({ ...c.diagram, isLocked: c.locked });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "저장 실패" },
        { status: 409 },
      );
    }
  }
  const base = "/vault/cases/" + item.id;
  return (
    <div className="device-case">
      <div className="page-heading">
        <div className="min-w-0">
          <h1>{item.title}</h1>
          <p>
            {item.isDemo
              ? "합성 시연 자료 · 실제 사건이 아닙니다"
              : "원본은 이 기기 · 승인한 익명 자료만 분석"}
          </p>
        </div>
        <button
          aria-label="개인정보 토큰 전달"
          className="profile-link"
          onClick={() => setShare(true)}
        >
          <Share2 size={20} />
        </button>
      </div>
      <nav className="case-tabs" aria-label="사건 메뉴">
        {[
          ["evidence", "자료·관계도"],
          ["review", "기록 검토"],
          ["timeline", "타임라인"],
          ["legal-reference", "법률 검토"],
          ["report", "정리·내보내기"],
        ].map(([id, label]) => (
          <Link
            key={id}
            href={base + "/" + id}
            aria-current={tab === id ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {busy && (
        <p role="status" className="notice">
          {busy}
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {tab === "review" ? <CaseIndexInspector index={index} urls={urls}/> : tab === "timeline" ? (
        <DeviceTimeline item={item} timeline={index.timeline} />
      ) : tab === "report" ? (
        <Card>
          <h2>확인한 기록 {item.events.length}</h2>
          <div className="my-6 space-y-4">
            {index.timeline.map((v) => (
              <p key={v.id}>
                {v.datetime
                  ? new Date(v.datetime).toLocaleString("ko-KR")
                  : "시점 확인 필요"}{" "}
                · {v.quote}
              </p>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                download(
                  {
                    format: "EUMLOG-local-report",
                    title: item.title,
                    events: index.timeline,
                    notice: "사용자가 확인한 기록. 법적 책임 판정이 아닙니다.",
                  },
                  "이음로그-확인기록.json",
                )
              }
            >
              <Download size={16} />
              확인 기록 저장
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              PDF 인쇄
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {tab !== "legal-reference" && (
            <>
              <div className="device-add" id="capture">
                <VoiceRecorder disabled={!!busy || item.locked} onSave={add}/>
                <label className="file-upload-action">
                  <Upload size={17} />
                  자료 추가
                  <input
                    aria-label="기기에서 자료 선택"
                    type="file"
                    className="sr-only"
                    disabled={!!busy || item.locked}
                    accept=".txt,.csv,.json,.md,.log,.pdf,.docx,.png,.jpg,.jpeg,.webp,.bmp,.m4a,.mp3,.wav,.webm,.aac,.ogg,.opus,.flac,.mp4,.3gp"
                    onChange={(ev) => {
                      const file = ev.target.files?.[0];
                      if (file) void add(file);
                      ev.target.value = "";
                    }}
                  />
                </label>
                <details>
                  <summary>메모 추가</summary>
                  <form
                    className="device-form"
                    onSubmit={async (ev) => {
                      ev.preventDefault();
                      const form = ev.currentTarget,
                        data = new FormData(form),
                        text = String(data.get("text") ?? "").trim();
                      if (text) {
                        if (
                          await add(
                            new File(
                              [text],
                              String(data.get("name") || "메모") + ".txt",
                              { type: "text/plain" },
                            ),
                          )
                        )
                          form.reset();
                      }
                    }}
                  >
                    <Field label="자료 이름">
                      <Input name="name" required maxLength={120} />
                    </Field>
                    <Field label="원문">
                      <Textarea name="text" required maxLength={60000} />
                    </Field>
                    <Button disabled={!!busy || item.locked}>
                      기기에 보관
                    </Button>
                  </form>
                </details>
                <details className="device-model-options">
                  <summary>전사 옵션</summary>
                  <select
                    aria-label="기기 음성 변환 품질"
                    value={speechModel}
                    onChange={(ev) =>
                      setSpeechModel(ev.target.value as "tiny" | "small")
                    }
                  >
                    <option value="tiny">빠른 변환 · 모델 약 50MB</option>
                    <option value="small">정밀 변환 · 모델 약 250MB</option>
                  </select>
                  <p className="device-help">
                    최초 모델·실행 파일 다운로드가 필요해요. 정밀 변환은 기기의
                    메모리와 시간을 더 사용합니다.
                  </p>
                </details>
                <span className="device-help">20MB · 녹음 20분 이내</span>
              </div>
              <div id="relationships"><RelationshipCanvas
                graph={graph}
                mobile={mobile}
                browseFirst={mobile}
                caseId={item.id}
                transport={transport}
                mediaUrl={(id) => urls[id]}
                legalHref={base + "/legal-reference"}
                onSelect={setSelected}
                onAccept={accept}
                syncError=""
                busy={!!busy}
                imageEvidence={item.evidence
                  .filter((e) => e.type.startsWith("image/"))
                  .map((e) => ({ id: e.id, name: e.name }))}
              /></div>
            </>
          )}
          <div className="device-evidence-grid">
            <aside className="device-files">
              <h2>보관한 자료 {item.evidence.length}</h2>
              {item.evidence.map((v) => (
                <button
                  key={v.id}
                  aria-pressed={v.id === e?.id}
                  onClick={() => setSelected(v.id)}
                >
                  <span>{v.name}</span>
                  <small>
                    {v.analysis
                      ? "연결됨"
                      : v.text
                        ? "익명 검토 대기"
                        : "원문 읽기 필요"}
                  </small>
                </button>
              ))}
            </aside>
            {e ? (
              <Card className="device-inspection">
                <div className="section-heading !mt-0">
                  <h2>{e.name}</h2>
                  {urls[e.id] && (
                    <a href={urls[e.id]} download={e.name}>
                      원본
                    </a>
                  )}
                </div>
                {e.type.startsWith("audio/") && urls[e.id] && (
                  <AudioTranscript src={urls[e.id]} segments={e.segments} />
                )}
                {e.type.startsWith("audio/") && (
                  <Button
                    variant="outline"
                    className="my-4"
                    disabled={!!busy || item.locked}
                    onClick={async () => {
                      setBusy("원본 녹음을 기기에서 다시 읽는 중…");
                      try {
                        const blob = await vault.file(e.fileId ?? e.id),
                          { readDeviceFile } = await import(
                            "../../infrastructure/ai/browser-media"
                          );
                        const extracted = await readDeviceFile(
                          new File([blob], e.name, { type: e.type }),
                          setBusy,
                          speechModel,
                        );
                        await commit((s) => {
                          const c = s.cases.find((c) => c.id === item.id)!,
                            target = c.evidence.find((v) => v.id === e.id)!;
                          if (c.locked || target.text !== e.text)
                            throw Error(
                              "원문이 변경되었거나 사건이 잠겼습니다.",
                            );
                          if ((target.versions?.length ?? 0) >= 100)
                            throw Error(
                              "수정 이력이 100개입니다. 새 자료로 추가해 주세요.",
                            );
                          target.versions ??= [];
                          target.versions.push({
                            text: target.text,
                            analysis: target.analysis,
                            createdAt: new Date().toISOString(),
                          });
                          Object.assign(target, extracted);
                          delete target.analysis;
                        });
                      } catch (err) {
                        setError(
                          err instanceof Error ? err.message : "다시 읽기 실패",
                        );
                      } finally {
                        setBusy("");
                      }
                    }}
                  >
                    선택한 품질로 다시 읽기
                  </Button>
                )}
                {e.type.startsWith("image/") && urls[e.id] && (
                  <img
                    src={urls[e.id]}
                    alt="기기에 보관한 원본"
                    className="device-photo"
                  />
                )}
                <details>
                  <summary>원문 확인·수정</summary>
                  <form
                    className="device-form"
                    onSubmit={async (ev) => {
                      ev.preventDefault();
                      const text = String(
                        new FormData(ev.currentTarget).get("text") ?? "",
                      );
                      try {
                        await commit((s) => {
                          const c = s.cases.find((c) => c.id === item.id)!;
                          if (c.locked) throw Error("잠긴 사건입니다.");
                          const target = c.evidence.find((v) => v.id === e.id)!;
                          if (
                            draft?.id === e.id &&
                            target.text !== draft.original
                          )
                            throw Error(
                              "다른 화면에서 원문을 수정했습니다. 작성한 내용을 별도로 복사한 뒤 다시 확인해 주세요.",
                            );
                          if ((target.versions?.length ?? 0) >= 100)
                            throw Error(
                              "수정 이력이 100개입니다. 새 자료로 추가해 주세요.",
                            );
                          target.versions ??= [];
                          target.versions.push({
                            text: target.text,
                            analysis: target.analysis,
                            createdAt: new Date().toISOString(),
                          });
                          target.text = text;
                          delete target.analysis;
                        });
                      } catch (err) {
                        setError(
                          err instanceof Error ? err.message : "저장 실패",
                        );
                      }
                    }}
                  >
                    <Textarea
                      name="text"
                      value={draft?.id === e.id ? draft.value : e.text}
                      onChange={(ev) =>
                        setDraft({
                          id: e.id,
                          original:
                            draft?.id === e.id ? draft.original : e.text,
                          value: ev.target.value,
                        })
                      }
                      maxLength={60000}
                      aria-label="기기에 저장한 원문"
                      required
                    />
                    <Field label="사건 해석 기준일">
                      <Input
                        type="date"
                        value={e.date}
                        onChange={(ev) => {
                          const date = ev.target.value;
                          if (!date) return;
                          setApproved(false);
                          void commit((s) => {
                            const c = s.cases.find((c) => c.id === item.id)!;
                            if (c.locked) throw Error("잠긴 사건입니다.");
                            const target = c.evidence.find(
                              (v) => v.id === e.id,
                            )!;
                            target.versions ??= [];
                            if (target.versions.length >= 100)
                              throw Error(
                                "수정 이력이 100개입니다. 새 자료로 추가해 주세요.",
                              );
                            target.versions.push({
                              text: target.text,
                              analysis: target.analysis,
                              createdAt: new Date().toISOString(),
                            });
                            target.date = date;
                            delete target.analysis;
                          }).catch((err) => setError(String(err)));
                        }}
                      />
                    </Field>
                    <Button variant="outline" disabled={item.locked || !!busy}>
                      수정 원문 저장
                    </Button>
                  </form>
                  <p className="device-help">
                    원본 파일과 해시는 바꾸지 않아요. 수정 후 다시 분석해
                    주세요.
                  </p>
                </details>
                {e.text && (
                  <div className="privacy-review">
                    <h3>분석 전, 가릴 정보 확인</h3>
                    <Field label="이름·주소·민감 내용 · 한 줄에 하나">
                      <Textarea
                        value={terms}
                        onChange={(ev) => setTerms(ev.target.value)}
                        rows={3}
                        placeholder="실명, 학교·회사, 주소, 민감한 표현"
                      />
                    </Field>
                    <Field label="전송할 익명 본문">
                      <Textarea
                        value={review}
                        onChange={(ev) => {
                          setReview(ev.target.value);
                          setApproved(false);
                        }}
                        maxLength={20000}
                      />
                    </Field>
                    <p className="device-help">
                      자동 가리기는 누락될 수 있어요. 신원을 추측할 수 있는
                      내용까지 직접 확인하세요. 원본 파일·가린 정보 목록은
                      전송하지 않습니다.
                    </p>
                    <details>
                      <summary>직접 질문하기</summary>
                      <Field label="질문 · 익명 처리 후 전송">
                        <Input
                          value={question}
                          onChange={(ev) => {
                            setQuestion(ev.target.value);
                            setApproved(false);
                          }}
                          maxLength={1000}
                        />
                      </Field>
                      <p className="device-help">
                        전송할 질문:{" "}
                        {anonymize(question, terms.split(/[\n,]/)).text}
                      </p>
                    </details>
                    <p className="device-help">
                      분석 기준일 {e.date}도 함께 전송합니다.
                    </p>
                    <label className="device-consent">
                      <input
                        type="checkbox"
                        checked={approved}
                        onChange={(ev) => setApproved(ev.target.checked)}
                      />
                      <span>
                        위 익명 본문과 표시된 질문만 분석기로 보내는 데
                        동의합니다.
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={!approved || !!busy || item.locked}
                        onClick={() => void analyze("inspect")}
                      >
                        <Send size={16} />
                        관계·시점 분석
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!approved || !!busy}
                        onClick={() => void analyze("legal")}
                      >
                        법률 근거 찾기
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!approved || !!busy}
                        onClick={() =>
                          void analyze(
                            "chat",
                            anonymize(question, terms.split(/[\n,]/)).text,
                          )
                        }
                      >
                        한국어로 정리
                      </Button>
                    </div>
                  </div>
                )}
                {e.analysis && (
                  <div className="device-candidates">
                    <h3>타임라인에 연결</h3>
                    <p className="device-help">
                      원문과 시점을 확인한 문장만 선택하세요.
                    </p>
                    {e.analysis.candidates.map((c) => (
                      <div key={c.id} className="device-candidate">
                        <p>{c.quote}</p>
                        <small>
                          {c.datetime
                            ? new Date(c.datetime).toLocaleString("ko-KR") +
                              (c.isApproximateTime ? " · 대략" : "")
                            : "시점 확인 필요"}
                        </small>
                        <Button
                          variant="outline"
                          disabled={
                            item.locked ||
                            item.events.some(
                              (v) =>
                                v.evidenceId === e.id && v.candidateId === c.id,
                            )
                          }
                          onClick={() => void accept(e.id, c.id)}
                        >
                          <Check size={15} />
                          {item.events.some(
                            (v) =>
                              v.evidenceId === e.id && v.candidateId === c.id,
                          )
                            ? "연결됨"
                            : "확인·연결"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {result !== null && (
                  <div className="device-answer">
                    <h3>분석 결과 · 초안</h3>
                    {typeof (result as { answer?: string }).answer ===
                    "string" ? (
                      <p>{(result as { answer: string }).answer}</p>
                    ) : (
                      <LegalResult value={result as LegalResponse} />
                    )}
                    <p className="device-help">
                      원문과 공식 출처를 대조하세요. 법적 책임을 확정하지
                      않습니다.
                    </p>
                  </div>
                )}
                <details className="mt-5">
                  <summary>파일 무결성</summary>
                  <p className="break-all text-xs mt-3">SHA-256 · {e.hash}</p>
                </details>
              </Card>
            ) : (
              <Card>
                <p>자료를 추가하면 익명 처리와 분석을 시작할 수 있어요.</p>
              </Card>
            )}
          </div>
        </>
      )}
      {share && <TokenTransfer item={item} onClose={() => setShare(false)} />}
    </div>
  );
}
function DeviceTimeline({ item, timeline }: { item: DeviceCase; timeline: CaseIndex["timeline"] }) {
  const { commit } = useVault(),
    [error, setError] = useState("");
  return (
    <div className="device-timeline">
      {!item.events.length && (
        <Card>
          <p>자료에서 원문을 확인하고 타임라인에 연결해 주세요.</p>
        </Card>
      )}
      {timeline.map((ev) => (
        <Card key={ev.id}>
          <p className="device-date">
            {ev.datetime
              ? new Date(ev.datetime).toLocaleString("ko-KR")
              : "시점 확인 필요"}
            {ev.approximate ? " · 대략" : ""}
          </p>
          <h2>{ev.quote}</h2>
          <p className="device-help">
            근거 ·{" "}
            {item.evidence.find((e) => e.id === ev.evidenceId)?.name ??
              "원본 확인 필요"}
            {!item.evidence
              .find((e) => e.id === ev.evidenceId)
              ?.text.includes(ev.quote)
              ? " · 이전 전사/원문 기록입니다. 원본을 다시 확인하세요."
              : ""}
          </p>
          <details>
            <summary>시점·장소 수정</summary>
            <form
              className="device-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget),
                  date = String(data.get("datetime") ?? "");
                try {
                  if (date && !Number.isFinite(Date.parse(date)))
                    throw Error("시점을 확인해 주세요.");
                  await commit((s) => {
                    const c = s.cases.find((c) => c.id === item.id)!;
                    if (c.locked) throw Error("잠긴 사건입니다.");
                    const target = c.events.find((v) => v.id === ev.id)!;
                    target.datetime = date
                      ? new Date(date).toISOString()
                      : null;
                    target.approximate = data.get("approximate") === "on";
                    target.location =
                      String(data.get("location") ?? "") || null;
                  });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "저장 실패");
                }
              }}
            >
              <Field label="사건 시점">
                <Input
                  type="datetime-local"
                  name="datetime"
                  defaultValue={
                    ev.datetime
                      ? new Date(
                          new Date(ev.datetime).getTime() -
                            new Date().getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                />
              </Field>
              <label>
                <input
                  type="checkbox"
                  name="approximate"
                  defaultChecked={ev.approximate}
                />{" "}
                대략적인 시점
              </label>
              <Field label="장소">
                <Input name="location" defaultValue={ev.location ?? ""} />
              </Field>
              <Button disabled={item.locked}>기기에 저장</Button>
            </form>
          </details>
        </Card>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
function TokenTransfer({
  item,
  onClose,
}: {
  item: DeviceCase;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]),
    [consent, setConsent] = useState(false),
    [token, setToken] = useState(""),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      className="device-modal"
      aria-labelledby="share-title"
    >
      <Card>
        <div className="section-heading !mt-0">
          <h2 id="share-title">토큰으로 선택 전달</h2>
          <button onClick={onClose} aria-label="전달 창 닫기">
            닫기
          </button>
        </div>
        <p className="device-help">
          선택한 원문만 암호화 파일로 만들어요. 파일과 토큰은 따로 전달하세요.
          서버에는 올리지 않습니다.
        </p>
        {item.evidence.map((e) => (
          <label className="device-consent" key={e.id}>
            <input
              type="checkbox"
              checked={selected.includes(e.id)}
              onChange={(ev) => {
                setSelected((old) =>
                  ev.target.checked
                    ? [...old, e.id]
                    : old.filter((v) => v !== e.id),
                );
                setConsent(false);
              }}
            />
            <span>{e.name} · 원문 텍스트</span>
          </label>
        ))}
        <label className="device-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            선택한 원문에 포함된 개인정보를 이 토큰의 소지자에게 전달하는 데
            동의합니다.
          </span>
        </label>
        <Button
          disabled={!consent || !selected.length}
          onClick={async () => {
            try {
              const payload = {
                format: "eumlog-selected-v1",
                createdAt: new Date().toISOString(),
                records: item.evidence
                  .filter((e) => selected.includes(e.id))
                  .map((e) => ({ name: e.name, text: e.text })),
              };
              const transfer = await createTransfer(payload);
              setToken(transfer.token);
              download(transfer.file, "이음로그-선택전달.json");
            } catch (e) {
              setError(e instanceof Error ? e.message : "전달 파일 생성 실패");
            }
          }}
        >
          <Share2 size={16} />
          토큰·전달 파일 만들기
        </Button>
        {token && (
          <div className="mt-5">
            <Field label="별도로 전달할 토큰">
              <Input readOnly value={token} />
            </Field>
            <p className="device-help">
              토큰을 가진 사람은 파일을 열 수 있어요. 이미 받은 파일의 회수·열람
              횟수 제한은 지원하지 않습니다.
            </p>
            <Link href="/receive" target="_blank">
              받은 파일 열기 ↗
            </Link>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
      </Card>
    </dialog>
  );
}
function VaultSettings() {
  const { vault, lock, commit, state } = useVault(),
    [status, setStatus] = useState("");
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <h1>보관 및 개인정보</h1>
      </div>
      <Card>
        <h2>이 기기에만 보관</h2>
        <p className="device-help">
          원본·실명 대응표·분석 결과·관계도·타임라인은 암호화한 브라우저
          보관함에 저장합니다. 승인한 익명 본문은 분석 중 서버·연결 분석기의
          메모리에서 처리되며 앱 저장소에 기록하지 않습니다. 계정용 가명
          식별자와 로그인 운영 기록은 별도입니다.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Button
            onClick={async () => {
              try {
                download(await vault.backup(), "이음로그-암호화백업.json");
                setStatus(
                  "암호화 백업을 저장했어요. 암호를 별도로 보관하세요.",
                );
              } catch {
                setStatus(
                  "백업하지 못했습니다. 기기 저장 상태를 확인해 주세요.",
                );
              }
            }}
          >
            <Download size={17} />
            암호화 백업
          </Button>
          <Button variant="outline" onClick={lock}>
            지금 잠그기
          </Button>
        </div>
        <p className="device-help">
          10분간 사용하지 않으면 잠겨요. 자동 잠금은 백그라운드 탭의 타이머
          지연이 있을 수 있습니다. 브라우저 자료를 지우기 전에 백업하세요.
        </p>
      </Card>
      <Card>
        <h2>사건 잠금</h2>
        {state.cases.map((c) => (
          <label key={c.id} className="device-consent">
            <input
              type="checkbox"
              checked={c.locked}
              onChange={(e) => {
                const checked = e.target.checked;
                void commit((s) => {
                  s.cases.find((v) => v.id === c.id)!.locked = checked;
                }).catch((err) => setStatus(String(err)));
              }}
            />
            {c.title}
          </label>
        ))}
      </Card>
      <LegacyMigration />
      <Card>
        <h2>Google 계정</h2>
        <Link
          href="/link-google"
          className="mt-4 inline-flex text-sm text-blue-700"
        >
          Google 연결 상태·기존 계정 연결 →
        </Link>
        <p className="device-help">
          가입과 로그인은 같은 Google 버튼으로 진행합니다. 실명·이메일·사진은
          신규 계정의 서버 프로필에 보관하지 않고 계정 식별용 HMAC을 사용합니다.
          Google과 호스팅 제공자의 인증·접속 기록까지 없어진다는 뜻은 아닙니다.
        </p>
        <Button
          variant="outline"
          onClick={async () => {
            lock();
            notifyAuthChange(null);
            await fetch("/api/auth/logout", { method: "POST" });
            location.href = "/login";
          }}
        >
          로그아웃
        </Button>
      </Card>
      <Card><h2>계정 관리</h2><DeleteAccount localMode/></Card>
      {status && (
        <p role="status" className="notice">
          {status}
        </p>
      )}
    </div>
  );
}
function LegacyMigration() {
  return (
    <Card>
      <h2>이전 서버 자료</h2>
      <p className="device-help">
        이전 버전에 보관한 자료는 자동 삭제하지 않습니다. 기기로 가져오고
        원본·분석·타임라인을 확인한 뒤 서버에서 삭제해야 합니다. 새 자료의 서버
        저장은 차단했습니다.
      </p>
      <LegacyImport />
    </Card>
  );
}
function LegacyImport() {
  const { vault, commit, state } = useVault(),
    [status, setStatus] = useState(""),
    [receipt, setReceipt] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false);
  async function migrate() {
    setBusy(true);
    setReceipt("");
    setConfirmed(false);
    setStatus("기존 자료를 기기에 가져오는 중…");
    try {
      const r = await fetch("/api/private/migrate"),
        manifest = await r.json();
      if (!r.ok) throw Error(manifest.error);
      const prefix = "legacy:" + manifest.digest + ":",
        contents = new Map<string, Blob>();
      for (const entry of manifest.files) {
        const response = await fetch(
          "/api/private/migrate?file=" + encodeURIComponent(entry.key),
        );
        if (!response.ok)
          throw Error(
            "이전 원본을 읽지 못했습니다. 서버 사본은 삭제하지 않습니다.",
          );
        const bytes = await response.arrayBuffer();
        if ((await digest(bytes)) !== entry.sha256)
          throw Error("원본 확인에 실패했습니다. 다시 가져와 주세요.");
        const blob = new Blob([bytes]);
        await vault.putFile(prefix + entry.key, blob);
        if (
          (await digest(
            await (await vault.file(prefix + entry.key)).arrayBuffer(),
          )) !== entry.sha256
        )
          throw Error("기기 저장 확인에 실패했습니다.");
        contents.set(entry.key, blob);
      }
      const data = manifest.data;
      const cases: DeviceCase[] = [];
      for (const old of data.cases) {
        const c = newCase(old.title);
        c.id = old.id;
        c.description = old.description ?? "";
        c.createdAt = old.createdAt;
        c.locked = old.isLocked;
        for (const f of data.evidences.filter(
          (e: { caseId: string }) => e.caseId === c.id,
        )) {
          const key = f.fileUrl?.startsWith("local://")
            ? f.fileUrl.slice(8)
            : null;
          if (!key) continue;
          const blob = contents.get(key);
          if (!blob)
            throw Error(
              "이전 원본이 누락되었습니다. 서버 자료는 삭제하지 않습니다.",
            );
          if (
            f.fileHash &&
            (await digest(await blob.arrayBuffer())) !== f.fileHash
          )
            throw Error("원본 해시가 다릅니다.");
          const analysisBlob = contents.get(f.id + ".analysis"),
            a = analysisBlob ? JSON.parse(await analysisBlob.text()) : {};
          c.evidence.push({
            id: f.id,
            fileId: prefix + key,
            name: f.name,
            type: f.type || "application/octet-stream",
            hash: await digest(await blob.arrayBuffer()),
            size: blob.size,
            text: a.analysis?.text ?? a.extraction?.text ?? "",
            analysis: a.analysis ?? undefined,
            segments: a.extraction?.segments,
            date: a.referenceDate ?? String(f.createdAt).slice(0, 10),
            createdAt: f.createdAt,
          });
        }
        c.events = data.events
          .filter((e: { caseId: string }) => e.caseId === c.id)
          .map(
            (v: {
              id: string;
              rawStatement: string;
              datetime: string | null;
              isApproximateTime: boolean;
              actor: string | null;
              location: string | null;
              evidenceIds: string[];
              createdAt: string;
            }) => ({
              id: v.id,
              evidenceId: v.evidenceIds[0] ?? "",
              candidateId: "legacy:" + v.id,
              quote: v.rawStatement,
              datetime: v.datetime ?? null,
              approximate: v.isApproximateTime,
              actor: v.actor ?? null,
              location: v.location ?? null,
              createdAt: v.createdAt,
            }),
          );
        const diagram = contents.get(c.id + ".diagram");
        if (diagram) {
          const d = JSON.parse(await diagram.text());
          c.diagram = {
            revision: d.revision,
            updatedAt: d.updatedAt,
            document: diagramSchema.parse(d.document),
          };
        }
        cases.push(c);
      }
      const archiveKey = "legacy-archive:" + manifest.digest;
      if (!(await vault.read(archiveKey)))
        await vault.save(archiveKey, manifest, 0);
      if (
        JSON.stringify(await vault.read(archiveKey)) !==
        JSON.stringify(manifest)
      )
        throw Error("이전 기록 보관 확인에 실패했습니다.");
      await commit((s) => {
        for (const c of cases)
          if (!s.cases.some((v) => v.id === c.id)) s.cases.push(c);
      });
      setReceipt(manifest.digest);
      setStatus(
        cases.length +
          "개 사건과 이전 기록을 암호화 보관했습니다. 암호화 백업을 저장하고 자료를 직접 확인해 주세요.",
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "가져오기 실패");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-5 space-y-4">
      <Button variant="outline" disabled={busy} onClick={() => void migrate()}>
        이전 자료를 기기로 가져오기
      </Button>
      {status && (
        <p role="status" className="device-help">
          {status}
        </p>
      )}
      {receipt && (
        <>
          <Button
            variant="outline"
            onClick={async () =>
              download(
                await vault.backup(),
                "이음로그-이전자료포함-암호화백업.json",
              )
            }
          >
            <Download size={16} />
            이전 자료 포함 백업
          </Button>
          <label className="device-consent">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              백업을 보관했고 원본·이전 기록을 확인했습니다. 서버 사본을 영구
              삭제하겠습니다.
            </span>
          </label>
          <Button
            variant="danger"
            disabled={!confirmed || busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await fetch("/api/private/migrate", {
                    method: "DELETE",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      confirm: "DELETE_SERVER_COPY",
                      digest: receipt,
                    }),
                  }),
                  d = await r.json();
                if (!r.ok) throw Error(d.error);
                setReceipt("");
                setStatus(
                  "이전 서버 사본을 삭제했습니다. 로그인 계정과 이 기기의 자료는 유지됩니다.",
                );
              } catch (e) {
                setStatus(e instanceof Error ? e.message : "삭제 실패");
              } finally {
                setBusy(false);
              }
            }}
          >
            확인한 서버 사본 영구 삭제
          </Button>
        </>
      )}
    </div>
  );
}

function DemoLoader() {
  const { vault, state, commit } = useVault(),
    router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="device-demo">
      <div>
        <h2>처음이라면, 가상 사건부터</h2>
        <p>계약·송금·약속과 서로 다른 진술을 따라가 보세요.</p>
      </div>
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/demo/scenario.json"),
              demo = await response.json();
            if (
              !response.ok ||
              demo.format !== "eumlog-fictional-demo-v1" ||
              !Array.isArray(demo.files)
            )
              throw Error("시연 자료를 읽지 못했습니다.");
            if (!state.cases.some((c) => c.id === demo.caseId)) {
              const c = fictionalCase(demo);
              for (const file of demo.files) {
                if ((await digest(file.text)) !== file.sha256)
                  throw Error("시연 원문을 확인하지 못했습니다.");
                await vault.putFile(
                  file.id,
                  new Blob([file.text], { type: "text/plain" }),
                );
              }
              await commit((s) => {
                if (!s.cases.some((v) => v.id === c.id)) s.cases.push(c);
              });
            }
            router.push("/vault/cases/" + demo.caseId);
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "시연 자료를 불러오지 못했습니다.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "준비하는 중…" : "시연 자료 불러오기"}
        <ArrowRight size={16} />
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

type LegalResponse = {
  issues?: Array<{
    title: string;
    note: string;
    checks: Array<{
      label: string;
      status: string;
      quote: string | null;
      question: string;
    }>;
  }>;
  relatedReferences?: Array<{
    title: string;
    citation: string;
    sourceUrl: string;
    content: string;
  }>;
};
function LegalResult({ value }: { value: LegalResponse }) {
  return (
    <div className="space-y-5">
      {value.issues?.length ? (
        value.issues.map((issue) => (
          <section key={issue.title}>
            <h4 className="font-semibold">{issue.title}</h4>
            <ul className="mt-3 space-y-3">
              {issue.checks.map((c) => (
                <li key={c.label}>
                  <span className="text-xs text-slate-500">
                    {c.status === "mentioned" ? "원문에 언급" : "추가 확인"} ·{" "}
                    {c.label}
                  </span>
                  <p className="text-sm">{c.quote ?? c.question}</p>
                </li>
              ))}
            </ul>
            <p className="device-help">{issue.note}</p>
          </section>
        ))
      ) : (
        <p>
          확인 목록으로 분류하기 어려운 내용입니다. 관련 원문을 직접 대조해
          주세요.
        </p>
      )}
      <details>
        <summary>
          관련 공식 원문 {value.relatedReferences?.length ?? 0}개
        </summary>
        <div className="mt-4 space-y-3">
          {value.relatedReferences?.map((r) => (
            <LegalReferenceCard
              key={r.sourceUrl + r.citation}
              title={r.title}
              citation={r.citation}
              description="의미·형태소로 찾은 참고 원문이며 적용 가능성 판정이 아닙니다."
              content={r.content.slice(0, 250)}
              sourceUrl={r.sourceUrl}
            />
          ))}
        </div>
      </details>
    </div>
  );
}
