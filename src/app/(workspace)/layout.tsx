import { redirect } from "next/navigation";
import { currentSession } from "../api/_utils";
import { AppShell } from "../../presentation/components/AppShell";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await currentSession())) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
