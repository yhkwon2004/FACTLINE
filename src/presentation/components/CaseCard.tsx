import Link from "next/link";
import { CalendarDays, ChevronRight, LockKeyhole } from "lucide-react";
import { Badge, Card } from "./UI";

export interface CaseCardProps {
  id: string;
  title: string;
  type: string;
  status: string;
  updatedAt: string;
  isLocked?: boolean;
}

export function CaseCard(props: CaseCardProps) {
  return (
    <Link href={`/cases/${props.id}`}>
      <Card className="transition hover:border-emerald-300 hover:shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-bold text-slate-900">{props.title}</h3>
              {props.isLocked ? <LockKeyhole className="shrink-0 text-slate-400" size={15} /> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={props.status === "IN_PROGRESS" ? "amber" : "green"}>{props.status === "IN_PROGRESS" ? "정리 중" : "열림"}</Badge>
              <Badge tone="blue">{props.type}</Badge>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <CalendarDays size={14} />
                {props.updatedAt}
              </span>
            </div>
          </div>
          <ChevronRight className="mt-1 shrink-0 text-slate-400" size={20} />
        </div>
      </Card>
    </Link>
  );
}
