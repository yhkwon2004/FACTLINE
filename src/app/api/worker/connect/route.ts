import { NextResponse } from "next/server";
import { connectWorker, workerAuthorized } from "../../../../infrastructure/ai/remote-worker";
export async function POST(request:Request) {
  if (!workerAuthorized(request.headers.get("authorization"))) return NextResponse.json({error:"인증이 필요합니다."},{status:401});
  try {
    const body=await request.text();
    if (body.length>2048) throw new Error("요청이 너무 큽니다.");
    await connectWorker(String(JSON.parse(body).endpoint));
    return NextResponse.json({connected:true});
  } catch(error) { return NextResponse.json({error:error instanceof Error ? error.message : "연결 실패"},{status:400}); }
}
