import { BookOpenText } from "lucide-react";
import { Badge, Card } from "./UI";

export function LegalReferenceCard({
  title,
  description,
  citation,
  content,
  sourceUrl,
}: {
  title: string;
  description: string;
  citation?: string | null;
  content?: string | null;
  sourceUrl?: string | null;
}) {
  return (
    <Card>
      <div className="flex gap-3">
        <BookOpenText className="mt-1 shrink-0 text-emerald-800" size={18} />
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-900">{title}</h3>
            {citation ? <Badge tone="slate">{citation}</Badge> : null}
          </div>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
          {content ? <p className="text-sm leading-6 text-slate-700">{content}</p> : null}
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-semibold text-emerald-800">
              공식 원문/검색 결과 열기
            </a>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
