import { requireCaseAccess } from "../../../../api/_utils";
import { CaseReview } from "../../../../../presentation/components/CaseReview";
export default async function Page({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  await requireCaseAccess(caseId);
  return <CaseReview caseId={caseId} />;
}
