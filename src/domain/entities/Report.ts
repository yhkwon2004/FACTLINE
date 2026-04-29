import { LEGAL_SAFETY_NOTICE } from "../constants";
import type { ReportStatus } from "../types";

export interface ReportProps {
  id: string;
  caseId: string;
  content: string;
  status?: ReportStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Report {
  public readonly id: string;
  public readonly caseId: string;
  public content: string;
  public status: ReportStatus;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: ReportProps) {
    this.id = props.id;
    this.caseId = props.caseId;
    this.content = props.content;
    this.status = props.status ?? "DRAFT";
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  contentWithNotice() {
    return this.content.includes(LEGAL_SAFETY_NOTICE)
      ? this.content
      : `${this.content.trim()}\n\n${LEGAL_SAFETY_NOTICE}`;
  }
}

