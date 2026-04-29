"use client";

import { AlertTriangle, CheckCircle2, Info, ShieldCheck, X } from "lucide-react";
import { Button, cn } from "./UI";

type NoticeTone = "info" | "success" | "warning" | "danger";

const toneStyles: Record<NoticeTone, { icon: typeof Info; box: string; iconWrap: string; title: string }> = {
  info: {
    icon: Info,
    box: "border-sky-100 bg-sky-50",
    iconWrap: "bg-sky-700 text-white",
    title: "text-sky-950",
  },
  success: {
    icon: CheckCircle2,
    box: "border-emerald-100 bg-emerald-50",
    iconWrap: "bg-emerald-700 text-white",
    title: "text-emerald-950",
  },
  warning: {
    icon: ShieldCheck,
    box: "border-amber-100 bg-amber-50",
    iconWrap: "bg-amber-600 text-white",
    title: "text-amber-950",
  },
  danger: {
    icon: AlertTriangle,
    box: "border-rose-100 bg-rose-50",
    iconWrap: "bg-rose-700 text-white",
    title: "text-rose-950",
  },
};

export function NoticeModal({
  open,
  title,
  description,
  tone = "info",
  actionLabel = "확인",
  secondaryLabel,
  onClose,
  onAction,
}: {
  open: boolean;
  title: string;
  description: string;
  tone?: NoticeTone;
  actionLabel?: string;
  secondaryLabel?: string;
  onClose: () => void;
  onAction?: () => void;
}) {
  if (!open) return null;

  const styles = toneStyles[tone];
  const Icon = styles.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-white/60 bg-white shadow-2xl">
        <div className={cn("border-b p-5", styles.box)}>
          <div className="flex items-start gap-3">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", styles.iconWrap)}>
              <Icon size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className={cn("text-lg font-bold tracking-tight", styles.title)}>{title}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{description}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/70 hover:text-slate-800" aria-label="닫기">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end">
          {secondaryLabel ? (
            <Button type="button" variant="outline" onClick={onClose}>
              {secondaryLabel}
            </Button>
          ) : null}
          <Button type="button" variant={tone === "danger" ? "danger" : tone === "success" ? "secondary" : "primary"} onClick={onAction ?? onClose}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
