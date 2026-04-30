import type { IntegrationProvider, MemoryRecordDirection, MemoryRecordKind } from "../types";

export interface MemoryRecordProps {
  id: string;
  userId: string;
  sourceId?: string | null;
  provider: IntegrationProvider;
  kind?: MemoryRecordKind;
  externalId?: string | null;
  participantName?: string | null;
  participantHandle?: string | null;
  direction?: MemoryRecordDirection;
  content: string;
  occurredAt?: Date | null;
  approximateTimeText?: string | null;
  location?: string | null;
  metadata?: Record<string, unknown>;
  attachmentNames?: string[];
  fileHash?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MemoryRecord {
  public readonly id: string;
  public readonly userId: string;
  public sourceId: string | null;
  public provider: IntegrationProvider;
  public kind: MemoryRecordKind;
  public externalId: string | null;
  public participantName: string | null;
  public participantHandle: string | null;
  public direction: MemoryRecordDirection;
  public content: string;
  public occurredAt: Date | null;
  public approximateTimeText: string | null;
  public location: string | null;
  public metadata: Record<string, unknown>;
  public attachmentNames: string[];
  public fileHash: string | null;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: MemoryRecordProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.sourceId = props.sourceId ?? null;
    this.provider = props.provider;
    this.kind = props.kind ?? "MESSAGE";
    this.externalId = props.externalId ?? null;
    this.participantName = props.participantName ?? null;
    this.participantHandle = props.participantHandle ?? null;
    this.direction = props.direction ?? "UNKNOWN";
    this.content = props.content;
    this.occurredAt = props.occurredAt ?? null;
    this.approximateTimeText = props.approximateTimeText ?? null;
    this.location = props.location ?? null;
    this.metadata = { ...(props.metadata ?? {}) };
    this.attachmentNames = [...(props.attachmentNames ?? [])];
    this.fileHash = props.fileHash ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}
