import { AlertTriangle } from "lucide-react";
import { Card } from "./UI";

export function RiskWarningCard({ phrase, reason, suggestion }: { phrase: string; reason: string; suggestion: string }) {
  return (
    <Card className="border-rose-200 bg-rose-50">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-rose-700" size={18} />
        <div className="space-y-2">
          <p className="text-sm font-bold text-rose-950">{phrase}</p>
          <p className="text-sm leading-6 text-rose-900">{reason}</p>
          <p className="text-sm leading-6 text-slate-700">{suggestion}</p>
        </div>
      </div>
    </Card>
  );
}
