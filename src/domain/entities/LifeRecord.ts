import type { LifeRecordType } from "../types";

export interface LifeRecordProps {
  id: string;
  userId: string;
  caseId?: string | null;
  type?: LifeRecordType;
  title: string;
  content: string;
  occurredAt?: Date | null;
  approximateTimeText?: string | null;
  location?: string | null;
  people?: string | null;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class LifeRecord {
  public readonly id: string;
  public readonly userId: string;
  public caseId: string | null;
  public type: LifeRecordType;
  public title: string;
  public content: string;
  public occurredAt: Date | null;
  public approximateTimeText: string | null;
  public location: string | null;
  public people: string | null;
  public tags: string[];
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: LifeRecordProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.caseId = props.caseId ?? null;
    this.type = props.type ?? "NOTE";
    this.title = props.title;
    this.content = props.content;
    this.occurredAt = props.occurredAt ?? null;
    this.approximateTimeText = props.approximateTimeText ?? null;
    this.location = props.location ?? null;
    this.people = props.people ?? null;
    this.tags = [...(props.tags ?? [])];
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  linkToCase(caseId: string | null) {
    this.caseId = caseId;
    this.updatedAt = new Date();
  }
}
