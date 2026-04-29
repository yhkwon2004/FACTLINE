import { AppShell } from "../../presentation/components/AppShell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

