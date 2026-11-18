import { requireSession } from "../../api/_utils";
import { createContainer } from "../../../infrastructure/di/container";
import { ConversationImport } from "../../../presentation/components/ConversationImport";
export default async function Page() {
  const s = await requireSession();
  const cases = await createContainer().caseService.list(s.userId);
  return (
    <ConversationImport
      cases={cases.map((c) => ({ id: c.id, title: c.title }))}
    />
  );
}
