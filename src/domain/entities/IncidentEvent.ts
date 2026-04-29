import type { EventSource } from "../types";

export interface IncidentEventProps {
  id: string;
  caseId: string;
  title: string;
  rawStatement: string;
  description: string;
  datetime?: Date | null;
  isApproximateTime?: boolean;
  approximateTimeText?: string | null;
  location?: string | null;
  actor?: string | null;
  action?: string | null;
  damage?: string | null;
  source?: EventSource;
  evidenceIds?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class IncidentEvent {
  public readonly id: string;
  public readonly caseId: string;
  public title: string;
  public rawStatement: string;
  public description: string;
  public datetime: Date | null;
  public isApproximateTime: boolean;
  public approximateTimeText: string | null;
  public location: string | null;
  public actor: string | null;
  public action: string | null;
  public damage: string | null;
  public source: EventSource;
  public evidenceIds: string[];
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: IncidentEventProps) {
    this.id = props.id;
    this.caseId = props.caseId;
    this.title = props.title;
    this.rawStatement = props.rawStatement;
    this.description = props.description;
    this.datetime = props.datetime ?? null;
    this.isApproximateTime = props.isApproximateTime ?? false;
    this.approximateTimeText = props.approximateTimeText ?? null;
    this.location = props.location ?? null;
    this.actor = props.actor ?? null;
    this.action = props.action ?? null;
    this.damage = props.damage ?? null;
    this.source = props.source ?? "INTERVIEW";
    this.evidenceIds = [...(props.evidenceIds ?? [])];
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  withEvidenceIds(evidenceIds: string[]) {
    return new IncidentEvent({
      ...this.toJSON(),
      evidenceIds,
      updatedAt: new Date(),
    });
  }

  toJSON(): IncidentEventProps {
    return {
      id: this.id,
      caseId: this.caseId,
      title: this.title,
      rawStatement: this.rawStatement,
      description: this.description,
      datetime: this.datetime,
      isApproximateTime: this.isApproximateTime,
      approximateTimeText: this.approximateTimeText,
      location: this.location,
      actor: this.actor,
      action: this.action,
      damage: this.damage,
      source: this.source,
      evidenceIds: this.evidenceIds,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

