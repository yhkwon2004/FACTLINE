import { NextResponse, type NextRequest } from "next/server";
import { AuthNavigationPolicy } from "./application/services/AuthNavigationPolicy";

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

  // A cookie can outlive a deleted account; keep sign-in pages reachable without trusting cookie presence.
  const authPage = ["/login", "/register"].includes(request.nextUrl.pathname);
  const decision = authNavigationPolicy.decide({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    isAuthenticated: !authPage && Boolean(request.cookies.get(SESSION_COOKIE)?.value),
  });

  if (decision.kind === "redirect") {
    return NextResponse.redirect(new URL(decision.location, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
