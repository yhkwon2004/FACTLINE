export interface EvidenceProps {
  id: string;
  caseId: string;
  name: string;
  type: string;
  fileUrl?: string | null;
  fileHash?: string | null;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Evidence {
  public readonly id: string;
  public readonly caseId: string;
  public name: string;
  public type: string;
  public fileUrl: string | null;
  public fileHash: string | null;
  public description: string | null;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: EvidenceProps) {
    this.id = props.id;
    this.caseId = props.caseId;
    this.name = props.name;
    this.type = props.type;
    this.fileUrl = props.fileUrl ?? null;
    this.fileHash = props.fileHash ?? null;
    this.description = props.description ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}

