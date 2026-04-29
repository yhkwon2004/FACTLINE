import type { CaseStatus, IncidentType } from "../types";
import { Evidence } from "./Evidence";
import { IncidentEvent } from "./IncidentEvent";

export interface CaseProps {
  id: string;
  title: string;
  type: IncidentType;
  status?: CaseStatus;
  userId: string;
  description?: string | null;
  events?: IncidentEvent[];
  evidences?: Evidence[];
  isLocked?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Case {
  public readonly id: string;
  public title: string;
  public type: IncidentType;
  public status: CaseStatus;
  public readonly userId: string;
  public description: string | null;
  public events: IncidentEvent[];
  public evidences: Evidence[];
  public isLocked: boolean;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: CaseProps) {
    this.id = props.id;
    this.title = props.title;
    this.type = props.type;
    this.status = props.status ?? "OPEN";
    this.userId = props.userId;
    this.description = props.description ?? null;
    this.events = props.events ?? [];
    this.evidences = props.evidences ?? [];
    this.isLocked = props.isLocked ?? false;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  addEvent(event: IncidentEvent) {
    this.assertUnlocked();
    this.events = [...this.events, event];
    this.status = "IN_PROGRESS";
    this.updatedAt = new Date();
  }

  addEvidence(evidence: Evidence) {
    this.assertUnlocked();
    this.evidences = [...this.evidences, evidence];
    this.updatedAt = new Date();
  }

  lock() {
    this.isLocked = true;
    this.updatedAt = new Date();
  }

  unlock() {
    this.isLocked = false;
    this.updatedAt = new Date();
  }

  private assertUnlocked() {
    if (this.isLocked) {
      throw new Error("잠긴 사건은 수정할 수 없습니다.");
    }
  }
}

