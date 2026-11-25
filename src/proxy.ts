import { NextResponse, type NextRequest } from "next/server";
import { AuthNavigationPolicy } from "./application/services/AuthNavigationPolicy";

import { localPrivacy } from "./infrastructure/security/AccountPrivacy";
const SESSION_COOKIE = "factline_session";
const authNavigationPolicy = new AuthNavigationPolicy();

export function proxy(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto");

  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    request.nextUrl.hostname,
  );
  if (process.env.NODE_ENV === "production" && proto === "http" && !local) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url);
  }

  const path = request.nextUrl.pathname;
  if (
    localPrivacy() &&
    /^\/api\/(cases|life-records|integrations)(?:\/|$)/.test(path) &&
    (!["GET", "HEAD", "OPTIONS"].includes(request.method) ||
      /^\/api\/cases\/[^/]+\/legal-reference\/?$/.test(path))
  )
    return NextResponse.json(
      { error: "새 자료는 기기 보관함에서만 저장합니다." },
      { status: 403 },
    );
  if (
    localPrivacy() &&
    /^\/(dashboard|cases|life|integrations|mypage|settings)(?:\/|$)/.test(path)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/vault" + (path === "/dashboard" ? "" : path);
    return NextResponse.redirect(url);
  }
  // A cookie can outlive a deleted account; keep sign-in pages reachable without trusting cookie presence.
  const authPage = ["/login", "/register"].includes(request.nextUrl.pathname);
  const decision = authNavigationPolicy.decide({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    isAuthenticated:
      !authPage && Boolean(request.cookies.get(SESSION_COOKIE)?.value),
  });

  if (decision.kind === "redirect") {
    return NextResponse.redirect(new URL(decision.location, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
    "/api/cases/:path*",
    "/api/life-records/:path*",
    "/api/integrations/:path*",
  ],
};
