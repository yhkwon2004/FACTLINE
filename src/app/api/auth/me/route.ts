import { NextResponse } from "next/server";
import { currentSession } from "../../_utils";

export async function GET() {
  const session = await currentSession();
  return NextResponse.json({ session });
}

