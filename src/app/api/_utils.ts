import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../infrastructure/di/container";

export const SESSION_COOKIE = "factline_session";

export async function parseRequestBody(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host"))
    throw new Error("허용되지 않은 요청 출처입니다.");
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 21 * 1024 * 1024) {
        await reader.cancel();
        throw new Error("요청은 21MB 이하여야 합니다.");
      }
      chunks.push(value);
    }
  }
  const buffered = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: Buffer.concat(chunks),
  });
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return buffered.json();

  const form = await buffered.formData();
  return Object.fromEntries(form.entries());
}

export async function currentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const container = createContainer();
  const session = await container.sessionService.verify(token);
  return session && (await container.authService.activeUser(session.userId))
    ? session
    : null;
}

export async function requireSession() {
  const session = await currentSession();
  if (!session?.userId) throw new Error("로그인이 필요합니다.");
  return session;
}

export async function requireCaseAccess(caseId: string, write = false) {
  const session = await requireSession();
  const caseData = await createContainer().caseService.get(caseId);
  if (caseData.userId !== session.userId)
    throw new Error("사건을 찾을 수 없습니다.");
  if (write && caseData.isLocked)
    throw new Error("잠긴 사건은 수정할 수 없습니다.");
  return caseData;
}

export function jsonError(error: unknown, status = 400) {
  const message =
    error instanceof Error ? error.message : "요청을 처리할 수 없습니다.";
  return NextResponse.json({ error: message }, { status });
}

function requestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== "null") return origin;

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto =
      request.headers.get("x-forwarded-proto") ??
      (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return process.env.APP_URL ?? "http://localhost:3000";
}

export function redirectToPath(
  request: NextRequest,
  path: string,
  status = 303,
) {
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
