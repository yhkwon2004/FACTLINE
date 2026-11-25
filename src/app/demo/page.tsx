import { PublicDemo } from "../../presentation/components/PublicDemo";
import { workspaceSurface } from "../../presentation/workspace-surface";
export default async function Page({searchParams}:{searchParams:Promise<{view?:string}>}) {
  const {view}=await searchParams;
  const surface=view==="mobile"||view==="desktop"?view:await workspaceSurface();
  return <PublicDemo mobile={surface==="mobile"}/>;
}
