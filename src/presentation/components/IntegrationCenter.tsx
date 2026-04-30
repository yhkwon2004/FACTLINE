"use client";

import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  AtSign,
  CheckCircle2,
  FileUp,
  Instagram,
  Link2,
  Mail,
  MessageCircle,
  MessagesSquare,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge, Button, Card, Field, Input, Textarea, cn } from "./UI";
import { NoticeModal } from "./NoticeModal";

type Provider = "KAKAOTALK" | "GMAIL" | "OUTLOOK" | "SMS" | "INSTAGRAM" | "MANUAL";
type SearchField = "ALL" | "NAME" | "CONTENT";
type KeywordMode = "ANY" | "ALL";

type Connector = {
  provider: Provider;
  label: string;
  capability: string;
  officialLimit: string;
  consentScopes: string[];
};

type SourceView = {
  id: string;
  provider: Provider;
  displayName: string;
  status: string;
  consentScopes: string[];
  consentedAt: string | null;
  lastSyncedAt: string | null;
};

type RecordView = {
  id: string;
  provider: Provider;
  kind: string;
  participantName: string | null;
  participantHandle: string | null;
  direction: string;
  content: string;
  occurredAt: string | null;
  approximateTimeText: string | null;
  location: string | null;
  metadata: Record<string, unknown>;
  attachmentNames: string[];
  fileHash: string | null;
  createdAt: string;
};

type SummaryView = {
  totalRecords: number;
  participants: Array<{ name: string; count: number }>;
  providers: Array<{ provider: string; label: string; count: number }>;
  witnessCandidates: Array<{ name: string; count: number }>;
  timeline: Array<{
    id: string;
    provider: string;
    participantName: string | null;
    occurredAt: string | null;
    approximateTimeText: string | null;
    content: string;
    fileHash: string | null;
  }>;
  missingQuestions: string[];
} | null;

type IntegrationData = {
  connectors: Connector[];
  sources: SourceView[];
  records: RecordView[];
  summary: SummaryView;
};

const providerIcons: Record<Provider, typeof MessageCircle> = {
  KAKAOTALK: MessageCircle,
  GMAIL: Mail,
  OUTLOOK: AtSign,
  SMS: Phone,
  INSTAGRAM: Instagram,
  MANUAL: MessagesSquare,
};

const providerStyles: Record<Provider, string> = {
  KAKAOTALK: "border-yellow-200 bg-yellow-50 text-yellow-950",
  GMAIL: "border-rose-100 bg-rose-50 text-rose-950",
  OUTLOOK: "border-sky-100 bg-sky-50 text-sky-950",
  SMS: "border-emerald-100 bg-emerald-50 text-emerald-950",
  INSTAGRAM: "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-950",
  MANUAL: "border-stone-200 bg-stone-50 text-slate-900",
};

const sampleText = [
  "--------------- 2026년 4월 30일 목요일 ---------------",
  "[상대방] [오전 9:10] 오늘 이야기한 내용 확인했습니다.",
  "[나] [오전 9:14] 관련 자료는 이메일로 다시 보내 주세요.",
  "[참고인] [오전 10:02] 그때 통화한 사실은 기억하고 있습니다.",
].join("\n");

function formatDate(value: string | null) {
  if (!value) return "시점 미정";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: string) {
  if (status === "ACTIVE") return "자동 수집 활성";
  if (status === "NEEDS_OAUTH") return "OAuth 설정 필요";
  if (status === "DISCONNECTED") return "연결 해제";
  return "가져오기 방식";
}

function clip(value: string, length = 96) {
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

function splitKeywords(value: string) {
  return value
    .split(",")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

function directionLabel(direction: string) {
  if (direction === "OUTBOUND") return "보낸 메시지";
  if (direction === "INBOUND") return "받은 메시지";
  return "방향 확인";
}

export function IntegrationCenter({ initialData }: { initialData: IntegrationData }) {
  const [data, setData] = useState(initialData);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [notice, setNotice] = useState<{ title: string; description: string; tone: "info" | "success" | "warning" | "danger" } | null>(null);
  const [provider, setProvider] = useState<Provider>("KAKAOTALK");
  const [sourceName, setSourceName] = useState("카카오톡 내보내기");
  const [rawText, setRawText] = useState("");
  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("ALL");
  const [keywordMode, setKeywordMode] = useState<KeywordMode>("ANY");
  const [selectedPerson, setSelectedPerson] = useState("ALL");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sourceByProvider = useMemo(() => new Map(data.sources.map((source) => [source.provider, source])), [data.sources]);
  const filteredRecords = useMemo(() => {
    const keywords = splitKeywords(query);
    return data.records
      .filter((record) => selectedPerson === "ALL" || record.participantName === selectedPerson)
      .filter((record) => {
        if (keywords.length === 0) return true;
        const fields =
          searchField === "NAME"
            ? [record.participantName, record.participantHandle]
            : searchField === "CONTENT"
              ? [record.content]
              : [record.content, record.participantName, record.participantHandle, record.location, record.provider, record.kind];
        const haystack = fields.filter(Boolean).join(" ").toLowerCase();
        return keywordMode === "ALL"
          ? keywords.every((keyword) => haystack.includes(keyword))
          : keywords.some((keyword) => haystack.includes(keyword));
      })
      .sort((a, b) => new Date(b.occurredAt ?? b.createdAt).getTime() - new Date(a.occurredAt ?? a.createdAt).getTime());
  }, [data.records, keywordMode, query, searchField, selectedPerson]);

  const recommendedQuestions = useMemo(() => {
    const missing = data.summary?.missingQuestions ?? [];
    const person = data.summary?.participants[0];
    const questions = [...missing];
    if (person) questions.push(`${person.name}님과의 기록이 ${person.count}건 있습니다. 같은 사람인지, 별도 인물인지 확인해 주세요.`);
    if (data.records.some((record) => record.fileHash)) questions.push("가져온 원문과 캡처/파일 원본이 같은 자료인지 보관 위치를 표시해 주세요.");
    return questions.slice(0, 4);
  }, [data.records, data.summary]);

  async function refresh() {
    const response = await fetch("/api/integrations", { headers: { accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "연동 정보를 불러올 수 없습니다.");
    setData(payload);
  }

  async function connect(connector: Connector) {
    const response = await fetch("/api/integrations/connect", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        provider: connector.provider,
        displayName: connector.label,
        consentScopes: connector.consentScopes,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "연동을 저장할 수 없습니다.");
    await refresh();
    setSelectedConnector(null);
    setProvider(connector.provider);
    setSourceName(connector.label);
    setNotice({
      title: `${connector.label} 연결 정보를 저장했습니다`,
      description:
        connector.provider === "GMAIL" || connector.provider === "OUTLOOK"
          ? "현재는 OAuth 앱 설정 전 단계입니다. 이후 API 키와 동의 화면을 연결하면 사용자가 허용한 범위만 자동으로 가져옵니다."
          : "현재 채널은 원문 파일 또는 붙여넣기 방식으로 안전하게 가져옵니다.",
      tone: "success",
    });
  }

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submittedRawText = String(form.get("rawText") ?? rawText);
    setIsImporting(true);
    try {
      const response = await fetch("/api/integrations/import", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ provider, sourceName, rawText: submittedRawText }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "원문을 가져올 수 없습니다.");
      await refresh();
      setRawText("");
      setNotice({
        title: "원문을 기억 자료로 정리했습니다",
        description: `${payload.records?.length ?? 0}개 줄을 실제 원문 기반 기록으로 저장했습니다. 날짜, 사람, 채널별 검색에서 바로 확인할 수 있습니다.`,
        tone: "success",
      });
    } catch (error) {
      setNotice({
        title: "가져오기에 실패했습니다",
        description: error instanceof Error ? error.message : "원문을 가져올 수 없습니다.",
        tone: "danger",
      });
    } finally {
      setIsImporting(false);
    }
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawText(text);
    setSourceName(file.name);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
      <div className="space-y-4">
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold">연동 채널</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">연동 전 동의 범위와 공식 제한을 먼저 확인합니다.</p>
            </div>
            <ShieldCheck className="text-emerald-800" size={20} />
          </div>
          <div className="grid gap-2">
            {data.connectors.map((connector) => {
              const source = sourceByProvider.get(connector.provider);
              return (
                <button
                  key={connector.provider}
                  type="button"
                  onClick={() => setSelectedConnector(connector)}
                  className={cn("rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm", providerStyles[connector.provider])}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ChannelVisual provider={connector.provider} />
                      <span className="font-bold">{connector.label}</span>
                    </div>
                    <Badge tone={source ? "green" : "slate"}>{source ? statusLabel(source.status) : connector.capability}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 opacity-80">{connector.officialLimit}</p>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-3 border-yellow-200 bg-yellow-50">
          <div className="flex items-start gap-3">
            <ChannelVisual provider="KAKAOTALK" />
            <div>
              <h2 className="font-bold text-yellow-950">카카오톡 가져오기 방식</h2>
              <p className="mt-1 text-sm leading-6 text-yellow-950/80">
                PC 카카오톡에서 대화방을 열고 대화 내보내기로 저장한 텍스트를 가져옵니다. 자동 GUI 조작 방식은 환경 의존성이 커서 서버 기능으로 제공하지 않고, 사용자 기기에서 생성된 파일만 처리합니다.
              </p>
            </div>
          </div>
          <div className="grid gap-2 text-xs leading-5 text-yellow-950/80">
            <div className="rounded-lg bg-white/70 p-3">1. PC 카카오톡 대화방 열기</div>
            <div className="rounded-lg bg-white/70 p-3">2. 대화 내용 저장 또는 내보내기 실행</div>
            <div className="rounded-lg bg-white/70 p-3">3. FACTLINE에서 텍스트 파일 선택 또는 원문 붙여넣기</div>
            <div className="rounded-lg bg-white/70 p-3">4. 날짜, 시간, 발신자, 보낸/받은 방향, 문구, SHA-256 해시 저장</div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="font-bold">원문 가져오기</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">내보낸 대화, 메일 본문, 문자 내역을 그대로 붙여넣거나 텍스트 파일로 불러옵니다.</p>
          </div>
          <form className="space-y-4" onSubmit={submitImport}>
            <Field label="채널">
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value as Provider)}
                className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm"
              >
                {data.connectors.map((connector) => <option key={connector.provider} value={connector.provider}>{connector.label}</option>)}
              </select>
            </Field>
            <Field label="자료 이름">
              <Input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="예: 2026년 4월 카카오톡 대화" />
            </Field>
            <div className="grid gap-2">
              <input ref={fileInputRef} type="file" accept=".txt,.csv,.log" onChange={readFile} className="hidden" />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                <FileUp size={16} />
                텍스트 파일 선택
              </Button>
              <Button type="button" variant="ghost" onClick={() => setRawText(sampleText)} className="w-full">
                예시 형식 채우기
              </Button>
            </div>
            <Field label="원문">
              <Textarea
                name="rawText"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                placeholder="--------------- 2026년 4월 30일 목요일 ---------------
[나] [오후 2:05] 실제 보낸 메시지
[상대방] [오후 2:07] 실제 받은 메시지"
                className="min-h-48"
                required
              />
            </Field>
            <Button type="submit" className="w-full" disabled={isImporting}>
              <Link2 size={16} />
              {isImporting ? "정리 중" : "기억 자료로 가져오기"}
            </Button>
          </form>
        </Card>
      </div>

      <div className="space-y-4">
        <section className="grid gap-3 md:grid-cols-3">
          <Card>
            <MessagesSquare className="text-emerald-800" size={20} />
            <p className="mt-3 text-2xl font-bold">{data.summary?.totalRecords ?? 0}</p>
            <p className="text-sm text-slate-500">저장된 원문 기록</p>
          </Card>
          <Card>
            <CheckCircle2 className="text-sky-800" size={20} />
            <p className="mt-3 text-2xl font-bold">{data.sources.length}</p>
            <p className="text-sm text-slate-500">동의한 채널</p>
          </Card>
          <Card>
            <Sparkles className="text-amber-700" size={20} />
            <p className="mt-3 text-2xl font-bold">{data.summary?.participants.length ?? 0}</p>
            <p className="text-sm text-slate-500">식별된 사람</p>
          </Card>
        </section>

        <Card className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-bold">기록 검색</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">검색 기준을 고르고 쉼표로 여러 키워드를 입력해 관련 메시지를 가져옵니다.</p>
            </div>
            <div className="relative md:w-80">
              <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 계약금, 환불, 약속" className="pl-9" />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="flex flex-wrap gap-2">
              {[
                { value: "ALL", label: "전체" },
                { value: "NAME", label: "이름" },
                { value: "CONTENT", label: "내용" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSearchField(item.value as SearchField)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-semibold",
                    searchField === item.value ? "border-slate-900 bg-slate-900 text-white" : "border-stone-200 bg-white text-slate-700",
                  )}
                >
                  {item.label} 검색
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              {[
                { value: "ANY", label: "하나라도 포함" },
                { value: "ALL", label: "모두 포함" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setKeywordMode(item.value as KeywordMode)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-semibold",
                    keywordMode === item.value ? "border-emerald-800 bg-emerald-800 text-white" : "border-stone-200 bg-white text-slate-700",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedPerson("ALL")}
              className={cn("rounded-lg border px-3 py-2 text-xs font-semibold", selectedPerson === "ALL" ? "border-slate-900 bg-slate-900 text-white" : "border-stone-200 bg-white text-slate-700")}
            >
              전체
            </button>
            {(data.summary?.participants ?? []).slice(0, 10).map((participant) => (
              <button
                key={participant.name}
                type="button"
                onClick={() => setSelectedPerson(participant.name)}
                className={cn("rounded-lg border px-3 py-2 text-xs font-semibold", selectedPerson === participant.name ? "border-slate-900 bg-white text-slate-900" : "border-stone-200 bg-white text-slate-700")}
              >
                {participant.name} {participant.count}
              </button>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">시간순 기억 자료</h2>
              <span className="text-xs font-semibold text-slate-500">{filteredRecords.length}건</span>
            </div>
            {filteredRecords.length === 0 ? (
              <Card className="text-sm leading-6 text-slate-600">아직 가져온 기록이 없습니다.</Card>
            ) : (
              filteredRecords.slice(0, 30).map((record) => <MemoryRecordCard key={record.id} record={record} />)
            )}
          </section>

          <aside className="space-y-4">
            <Card className="space-y-3">
              <h2 className="font-bold">원문 기반 질문</h2>
              <p className="text-sm leading-6 text-slate-600">저장된 기록에서 부족한 확인 지점만 묻습니다.</p>
              {recommendedQuestions.length > 0 ? (
                recommendedQuestions.map((question) => (
                  <div key={question} className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-slate-700">
                    {question}
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-slate-600">원문을 가져오면 질문이 표시됩니다.</p>
              )}
            </Card>

            <Card className="space-y-3">
              <h2 className="font-bold">관계/증인 후보</h2>
              {(data.summary?.witnessCandidates ?? []).length > 0 ? (
                data.summary?.witnessCandidates.map((candidate) => (
                  <div key={candidate.name} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
                    <span className="font-semibold text-slate-800">{candidate.name}</span>
                    <span className="text-xs text-slate-500">{candidate.count}회 등장</span>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-slate-600">반복 등장한 사람이 있으면 후보로 표시됩니다.</p>
              )}
            </Card>
          </aside>
        </div>
      </div>

      <NoticeModal
        open={Boolean(selectedConnector)}
        title={selectedConnector ? `${selectedConnector.label} 연동 동의` : ""}
        description={
          selectedConnector
            ? [
                selectedConnector.officialLimit,
                "",
                "동의 범위:",
                ...selectedConnector.consentScopes.map((scope) => `- ${scope}`),
                "",
                "FACTLINE은 사용자가 제공하거나 동의한 자료만 저장하며, 자료 내용을 근거 없이 보태지 않습니다.",
              ].join("\n")
            : ""
        }
        tone="info"
        actionLabel="동의하고 연결"
        secondaryLabel="취소"
        onClose={() => setSelectedConnector(null)}
        onAction={() => selectedConnector ? connect(selectedConnector).catch((error) => setNotice({
          title: "연동을 저장할 수 없습니다",
          description: error instanceof Error ? error.message : "연동을 저장할 수 없습니다.",
          tone: "danger",
        })) : undefined}
      />
      <NoticeModal
        open={Boolean(notice)}
        title={notice?.title ?? ""}
        description={notice?.description ?? ""}
        tone={notice?.tone ?? "info"}
        onClose={() => setNotice(null)}
      />
    </div>
  );
}

function MemoryRecordCard({ record }: { record: RecordView }) {
  const Icon = providerIcons[record.provider];
  return (
    <Card className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", providerStyles[record.provider])}>
            <Icon size={17} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{record.participantName ?? "발신자 확인 필요"}</p>
            <p className="text-xs text-slate-500">{formatDate(record.occurredAt)}</p>
          </div>
        </div>
        <Badge tone={record.fileHash ? "green" : "amber"}>{record.fileHash ? "해시 저장" : "원본 보관 확인"}</Badge>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{clip(record.content, 220)}</p>
      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-md bg-stone-100 px-2 py-1">{record.provider}</span>
        <span className="rounded-md bg-stone-100 px-2 py-1">{directionLabel(record.direction)}</span>
        {record.location ? <span className="rounded-md bg-stone-100 px-2 py-1">{record.location}</span> : null}
        {record.fileHash ? <span className="rounded-md bg-stone-100 px-2 py-1">sha256 {record.fileHash.slice(0, 12)}...</span> : null}
      </div>
    </Card>
  );
}

function ChannelVisual({ provider }: { provider: Provider }) {
  if (provider === "KAKAOTALK") {
    return (
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FEE500] text-[10px] font-black text-[#3B1E1E]">
        TALK
      </span>
    );
  }

  if (provider === "GMAIL") {
    return (
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-stone-200">
        <span className="h-4 w-6 rounded-sm border-l-4 border-r-4 border-t-4 border-l-blue-500 border-r-green-500 border-t-red-500 border-b-yellow-400" />
      </span>
    );
  }

  if (provider === "INSTAGRAM") {
    return (
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 via-rose-500 to-yellow-400 text-white">
        <Instagram size={20} />
      </span>
    );
  }

  if (provider === "OUTLOOK") {
    return (
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-700 text-white">
        <Mail size={19} />
      </span>
    );
  }

  if (provider === "SMS") {
    return (
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-500 text-white">
        <Phone size={19} />
      </span>
    );
  }

  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
      <MessageCircle size={19} />
    </span>
  );
}
