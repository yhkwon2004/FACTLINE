import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCaseAccess } from "../../../api/_utils";
const tabs = [
  ["", "개요"],
  ["/evidence", "증거"],
  ["/interview", "기록"],
  ["/timeline", "타임라인"],
  ["/analysis", "검토"],
  ["/legal-reference", "법령·판례"],
  ["/report", "내보내기"],
];
export default async function CaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  try {
    await requireCaseAccess(caseId);
  } catch {
    notFound();
  }
  return (
    <>
      <nav className="case-tabs" aria-label="사건 메뉴">
        {tabs.map(([suffix, label]) => (
          <Link key={suffix} href={`/cases/${caseId}${suffix}`}>
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
