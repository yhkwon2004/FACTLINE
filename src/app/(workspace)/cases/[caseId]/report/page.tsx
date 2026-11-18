import { requireCaseAccess } from "../../../../api/_utils";
import { createContainer } from "../../../../../infrastructure/di/container";
import { ExportPanel } from "../../../../../presentation/components/ExportPanel";
export default async function Page({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  await requireCaseAccess(caseId);
  const report = await createContainer().reportService.get(caseId);
  return (
    <ExportPanel caseId={caseId} initialContent={report?.content ?? null} />
  );
}
