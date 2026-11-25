"use server";

import { cookies, headers } from "next/headers";
import { userAgent } from "next/server";

export async function workspaceSurface(): Promise<"mobile" | "desktop"> {
  const saved = (await cookies()).get("eumlog_view")?.value;
  if (saved === "mobile" || saved === "desktop") return saved;
  const requestHeaders = await headers();
  const device = userAgent({headers: requestHeaders}).device.type;
  return device === "mobile" || requestHeaders.get("sec-ch-ua-mobile") === "?1" ? "mobile" : "desktop";
}

export async function changeWorkspaceSurface(form: FormData) {
  const next = form.get("view");
  if (next !== "mobile" && next !== "desktop") return;
  (await cookies()).set("eumlog_view", next, {path:"/", sameSite:"lax", httpOnly:true, maxAge:31536000});
}
