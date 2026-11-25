import { requireSession } from "../../api/_utils";
import { DeviceVaultProvider } from "../../../presentation/components/DeviceWorkspace";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  return (
    <DeviceVaultProvider userId={user.userId}>{children}</DeviceVaultProvider>
  );
}
