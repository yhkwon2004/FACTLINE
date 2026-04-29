import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../infrastructure/di/container";

export const SESSION_COOKIE = "factline_session";

export async function parseRequestBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return request.json();

  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

export async function currentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return createContainer().sessionService.verify(token);
}

export async function requireSession() {
  const session = await currentSession();
  if (!session?.userId) throw new Error("로그인이 필요합니다.");
  return session;
}

export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "요청을 처리할 수 없습니다.";
  return NextResponse.json({ error: message }, { status });
}

function requestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== "null") return origin;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return process.env.APP_URL ?? "http://localhost:3000";
}

export function redirectToPath(request: NextRequest, path: string, status = 303) {
  return NextResponse.redirect(new URL(path, requestOrigin(request)), status);
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
