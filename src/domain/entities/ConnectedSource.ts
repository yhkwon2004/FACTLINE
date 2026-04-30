import type { ConnectedSourceStatus, IntegrationProvider } from "../types";

export interface ConnectedSourceProps {
  id: string;
  userId: string;
  provider: IntegrationProvider;
  displayName: string;
  status?: ConnectedSourceStatus;
  consentScopes?: string[];
  consentedAt?: Date | null;
  lastSyncedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConnectedSource {
  public readonly id: string;
  public readonly userId: string;
  public provider: IntegrationProvider;
  public displayName: string;
  public status: ConnectedSourceStatus;
  public consentScopes: string[];
  public consentedAt: Date | null;
  public lastSyncedAt: Date | null;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: ConnectedSourceProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.provider = props.provider;
    this.displayName = props.displayName;
    this.status = props.status ?? "IMPORT_ONLY";
    this.consentScopes = [...(props.consentScopes ?? [])];
    this.consentedAt = props.consentedAt ?? null;
    this.lastSyncedAt = props.lastSyncedAt ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  markSynced(date = new Date()) {
    this.lastSyncedAt = date;
    this.updatedAt = date;
  }
}
