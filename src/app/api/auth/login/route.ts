import { NextResponse, type NextRequest } from "next/server";
import { createContainer } from "../../../../infrastructure/di/container";
import { jsonError, parseRequestBody, redirectToPath, setSessionCookie } from "../../_utils";
import { AuthNavigationPolicy } from "../../../../application/services/AuthNavigationPolicy";

export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request);
    const { user, token } = await createContainer().authService.login({
      email: String(body.email),
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
