import { Card } from "./UI";

export function ReportView({ content }: { content: string }) {
  return (
    <Card className="bg-white">
      <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{content}</pre>
    </Card>
  );
}
