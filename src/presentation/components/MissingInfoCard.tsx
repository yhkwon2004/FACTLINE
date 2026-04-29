import { CircleHelp } from "lucide-react";
import { Card } from "./UI";

export function MissingInfoCard({ label, reason }: { label: string; reason: string }) {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <div className="flex gap-3">
        <CircleHelp className="mt-0.5 shrink-0 text-amber-700" size={18} />
        <div>
          <p className="text-sm font-bold text-amber-950">{label}</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">{reason}</p>
        </div>
      </div>
    </Card>
  );
}
