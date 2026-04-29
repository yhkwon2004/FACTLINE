export interface LegalReferenceProps {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  citation?: string | null;
  content: string;
  sourceUrl?: string | null;
  createdAt?: Date;
}

export class LegalReference {
  public readonly id: string;
  public title: string;
  public description: string;
  public category: string | null;
  public citation: string | null;
  public content: string;
  public sourceUrl: string | null;
  public readonly createdAt: Date;

  constructor(props: LegalReferenceProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.category = props.category ?? null;
    this.citation = props.citation ?? null;
    this.content = props.content;
    this.sourceUrl = props.sourceUrl ?? null;
    this.createdAt = props.createdAt ?? new Date();
  }
}

