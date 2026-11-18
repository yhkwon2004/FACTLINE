import {passwordLoginEnabled} from "../../../../infrastructure/security/GoogleIdentity";
import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../infrastructure/di/container";
import { jsonError, parseRequestBody, redirectToPath, setSessionCookie } from "../../_utils";
import { AuthNavigationPolicy } from "../../../../application/services/AuthNavigationPolicy";

export async function POST(request: NextRequest) {
  try {
    if(!passwordLoginEnabled()) throw new Error("Google 로그인으로 계속해 주세요.");
    const body = await parseRequestBody(request);
    const { user, token } = await createContainer().authService.register({
      email: String(body.email),
      name: String(body.name),
      password: String(body.password),
    });

    const acceptsJson = request.headers.get("accept")?.includes("application/json");
    const next = new AuthNavigationPolicy().normalizeReturnPath(body.next);
    const response = acceptsJson ? NextResponse.json({ user, next }) : redirectToPath(request, next);
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
