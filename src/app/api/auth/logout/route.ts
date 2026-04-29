import type { NextRequest } from "next/server";
import { redirectToPath, SESSION_COOKIE } from "../../_utils";

export async function POST(request: NextRequest) {
  const response = redirectToPath(request, "/login");
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
