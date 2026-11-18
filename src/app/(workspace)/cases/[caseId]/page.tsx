import { requireCaseAccess } from "../../../api/_utils";
import { CaseLock } from "../../../../presentation/components/CaseLock";
import Link from "next/link";
import {
  Upload,
  MessageSquareText,
  Timer,
  ScanText,
  BookOpenText,
  FileDown,
  ArrowUpRight,
  FileCheck2,
} from "lucide-react";
import { createContainer } from "../../../../infrastructure/di/container";
import { CaseDetailActions } from "../../../../presentation/components/CaseDetailActions";
const actions = [
  [
    "evidence",
    "증거 보관함",
    "원본 업로드와 본문 분석",
    Upload,
    "var(--color-mint)",
  ],
  [
    "interview",
    "기억 남기기",
    "한 문장부터 차근차근",
    MessageSquareText,
    "var(--color-blue)",
  ],
  [
    "timeline",
    "타임라인",
    "확인한 사실을 시간순으로",
    Timer,
    "var(--color-peach)",
  ],
  [
    "analysis",
    "AI 검토",
    "연관 자료와 빈틈 확인",
    ScanText,
    "var(--color-lilac)",
  ],
  [
    "legal-reference",
    "법령·판례",
    "출처가 있는 참고자료",
    BookOpenText,
    "var(--color-blue)",
  ],
  [
    "report",
    "정리본 내보내기",
    "상담과 제출 준비",
    FileDown,
    "var(--color-mint)",
  ],
] as const;
export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  await requireCaseAccess(caseId);
  const c = await createContainer().caseService.get(caseId);
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="!mt-0 !mb-2">
            {c.isLocked ? "잠긴 사건" : "정리 중인 사건"}
          </p>
          <h1>{c.title}</h1>
          {c.description ? <p>{c.description}</p> : null}
        </div>
        <span className="local-indicator">
          <FileCheck2 size={15} />
          증거 {c.evidences.length} · 기록 {c.events.length}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {actions.map(([href, title, description, Icon, color]) => (
          <Link
            href={"/cases/" + caseId + "/" + href}
            className="case-row !p-6"
            key={href}
          >
            <span className="case-symbol" style={{ background: color }}>
              <Icon size={23} />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
            <ArrowUpRight size={16} className="row-arrow" />
          </Link>
        ))}
      </div>
      <details className="mt-8 text-sm text-slate-500">
        <summary>사건 관리</summary>
        <div className="mt-4 space-y-4">
          <CaseLock caseId={caseId} locked={c.isLocked} />
          <CaseDetailActions caseId={caseId} initialTitle={c.title} />
        </div>
      </details>
    </div>
  );
}
