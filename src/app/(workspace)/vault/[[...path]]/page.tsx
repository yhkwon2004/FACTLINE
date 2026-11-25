import { DeviceWorkspace } from "../../../../presentation/components/DeviceWorkspace";
import { workspaceSurface } from "../../../../presentation/workspace-surface";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  return <DeviceWorkspace path={(await params).path ?? []} mobile={(await workspaceSurface()) === "mobile"} />;
}
