import { redirect } from "next/navigation";
import { currentSession } from "../api/_utils";
import { AppShell } from "../../presentation/components/AppShell";
import { workspaceSurface } from "../../presentation/workspace-surface";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await currentSession())) redirect("/login");
  return <AppShell surface={await workspaceSurface()}>{children}</AppShell>;
}
