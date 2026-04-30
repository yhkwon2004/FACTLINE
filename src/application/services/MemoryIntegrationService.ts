import { createHash, randomUUID } from "node:crypto";
import { ConnectedSource, MemoryRecord } from "../../domain/entities";
import type { IConnectedSourceRepository, IMemoryRecordRepository } from "../../domain/repositories";
import type { IntegrationProvider, MemoryRecordKind } from "../../domain/types";
import type { ConnectSourceInput, ImportMemoryInput } from "../dtos";

const providerLabels: Record<IntegrationProvider, string> = {
  KAKAOTALK: "카카오톡",
  GMAIL: "Gmail",
  OUTLOOK: "Outlook 이메일",
  SMS: "문자/SMS",
  INSTAGRAM: "인스타그램",
  MANUAL: "직접 기록",
};

const providerKinds: Record<IntegrationProvider, MemoryRecordKind> = {
  KAKAOTALK: "MESSAGE",
  GMAIL: "EMAIL",
  OUTLOOK: "EMAIL",
  SMS: "SMS",
  INSTAGRAM: "SOCIAL_DM",
  MANUAL: "NOTE",
};

const officialLimits: Record<IntegrationProvider, string> = {
  KAKAOTALK: "개인 카카오톡 대화 전체 자동 읽기는 공식 API로 제공되지 않아 내보내기 파일 또는 붙여넣기 방식으로 가져옵니다.",
  GMAIL: "Google OAuth 설정 후 Gmail API로 사용자가 동의한 메일 범위만 가져올 수 있습니다.",
  OUTLOOK: "Microsoft Graph OAuth 설정 후 사용자가 동의한 메일 범위만 가져올 수 있습니다.",
  SMS: "웹앱은 휴대폰 문자 전체를 직접 읽을 수 없어 모바일 앱 브리지 또는 내보내기 파일이 필요합니다.",
  INSTAGRAM: "개인 DM 전체 자동 수집은 제한되며, 비즈니스/프로페셔널 계정과 Meta 심사 범위에서만 자동화할 수 있습니다.",
  MANUAL: "사용자가 직접 붙여넣거나 업로드한 텍스트만 저장합니다.",
};

type ParsedMemoryLine = {
  participantName: string | null;
  content: string;
  occurredAt: Date | null;
  approximateTimeText: string | null;
};

function normalizeProvider(provider: IntegrationProvider) {
  return providerLabels[provider] ? provider : "MANUAL";
}

function hashContent(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function parseDate(dateText: string, timeText?: string) {
  const parts = dateText.replace(/[./]/g, "-").split("-").map((part) => part.padStart(2, "0"));
  const normalized = `${parts[0]}-${parts[1]}-${parts[2]}`;
  const value = timeText ? `${normalized}T${timeText.length === 5 ? `${timeText}:00` : timeText}` : `${normalized}T00:00:00`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseMemoryText(rawText: string): ParsedMemoryLine[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const dated = line.match(/^(\d{4}[.-]\d{1,2}[.-]\d{1,2})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?\s+(.+)$/);
      const body = dated ? dated[3].trim() : line;
      const occurredAt = dated ? parseDate(dated[1], dated[2]) : null;
      const speaker = body.match(/^(?:\[([^\]]+)\]|([^:：]{1,40}))[:：]\s*(.+)$/);

      if (speaker) {
        const participantName = (speaker[1] ?? speaker[2] ?? "").trim() || null;
        return {
          participantName,
          content: speaker[3].trim(),
          occurredAt,
          approximateTimeText: occurredAt ? null : dated?.[1] ?? null,
        };
      }

      return {
        participantName: null,
        content: body,
        occurredAt,
        approximateTimeText: occurredAt ? null : dated?.[1] ?? null,
      };
    });
}

export class MemoryIntegrationService {
  constructor(
    private readonly sources: IConnectedSourceRepository,
    private readonly records: IMemoryRecordRepository,
  ) {}

  connectors() {
    return (Object.keys(providerLabels) as IntegrationProvider[]).map((provider) => ({
      provider,
      label: providerLabels[provider],
      capability: provider === "GMAIL" || provider === "OUTLOOK" ? "OAuth 준비" : provider === "MANUAL" ? "즉시 입력" : "파일/붙여넣기 우선",
      officialLimit: officialLimits[provider],
      consentScopes: ["원문 저장", "시간순 정리", "사람/관계 추출", "위험 표현 감지"],
    }));
  }

  async list(userId: string) {
    const [sources, records] = await Promise.all([
      this.sources.findByUserId(userId),
      this.records.findByUserId(userId),
    ]);
    return { connectors: this.connectors(), sources, records, summary: this.summarize(records) };
  }

  async connect(input: ConnectSourceInput) {
    const provider = normalizeProvider(input.provider);
    const existing = await this.sources.findByUserAndProvider(input.userId, provider);
    const source = new ConnectedSource({
      id: existing?.id ?? randomUUID(),
      userId: input.userId,
      provider,
      displayName: input.displayName?.trim() || providerLabels[provider],
      status: provider === "GMAIL" || provider === "OUTLOOK" ? "NEEDS_OAUTH" : "IMPORT_ONLY",
      consentScopes: input.consentScopes?.length ? input.consentScopes : ["원문 저장", "시간순 정리", "사람/관계 추출"],
      consentedAt: existing?.consentedAt ?? new Date(),
      lastSyncedAt: existing?.lastSyncedAt ?? null,
      createdAt: existing?.createdAt,
    });
    return this.sources.save(source);
  }

  async importText(input: ImportMemoryInput) {
    const provider = normalizeProvider(input.provider);
    const source =
      (await this.sources.findByUserAndProvider(input.userId, provider)) ??
      (await this.connect({
        userId: input.userId,
        provider,
        displayName: input.sourceName ?? providerLabels[provider],
      }));

    const parsed = parseMemoryText(input.rawText);
    if (parsed.length === 0) throw new Error("가져올 메시지 내용이 없습니다.");

    const records = parsed.map((line, index) => {
      const sourceName = input.sourceName?.trim() || source.displayName;
      const raw = `${provider}:${sourceName}:${index}:${line.participantName ?? ""}:${line.occurredAt?.toISOString() ?? ""}:${line.content}`;
      return new MemoryRecord({
        id: randomUUID(),
        userId: input.userId,
        sourceId: source.id,
        provider,
        kind: providerKinds[provider],
        externalId: hashContent(raw).slice(0, 24),
        participantName: line.participantName,
        direction: "UNKNOWN",
        content: line.content,
        occurredAt: line.occurredAt,
        approximateTimeText: line.approximateTimeText,
        metadata: { sourceName, importedFrom: "manual-text" },
        fileHash: hashContent(line.content),
      });
    });

    const saved = await this.records.saveMany(records);
    source.markSynced();
    await this.sources.save(source);
    return { source, records: saved, summary: this.summarize(saved) };
  }

  async personBrief(userId: string, participantName: string) {
    const records = await this.records.findByUserAndParticipant(userId, participantName);
    return this.summarize(records);
  }

  summarize(records: MemoryRecord[]) {
    const sorted = [...records].sort((a, b) => {
      const left = a.occurredAt?.getTime() ?? a.createdAt.getTime();
      const right = b.occurredAt?.getTime() ?? b.createdAt.getTime();
      return left - right;
    });
    const participantCounts = new Map<string, number>();
    const providerCounts = new Map<string, number>();

    for (const record of sorted) {
      if (record.participantName) participantCounts.set(record.participantName, (participantCounts.get(record.participantName) ?? 0) + 1);
      providerCounts.set(record.provider, (providerCounts.get(record.provider) ?? 0) + 1);
    }

    const participants = Array.from(participantCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    const providers = Array.from(providerCounts.entries()).map(([provider, count]) => ({ provider, label: providerLabels[provider as IntegrationProvider] ?? provider, count }));
    const witnessCandidates = participants.filter((participant) => participant.count >= 2).slice(0, 6);
    const missingQuestions = [
      sorted.some((record) => !record.occurredAt) ? "시점이 없는 메시지가 있습니다. 대략적인 날짜나 시간대를 확인해 주세요." : null,
      sorted.some((record) => !record.participantName) ? "발신자/상대방 이름이 없는 줄이 있습니다. 누구의 말인지 확인해 주세요." : null,
      sorted.some((record) => !record.fileHash) ? "원문 무결성 확인을 위해 가져온 파일 또는 캡처 원본을 보관해 주세요." : null,
    ].filter(Boolean) as string[];

    return {
      totalRecords: sorted.length,
      participants,
      providers,
      witnessCandidates,
      timeline: sorted.slice(0, 20).map((record) => ({
        id: record.id,
        provider: record.provider,
        participantName: record.participantName,
        occurredAt: record.occurredAt?.toISOString() ?? null,
        approximateTimeText: record.approximateTimeText,
        content: record.content,
        fileHash: record.fileHash,
      })),
      missingQuestions,
    };
  }
}
