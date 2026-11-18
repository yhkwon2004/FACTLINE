import {randomBytes} from "node:crypto";
import {NextResponse} from "next/server";
export async function GET() {
 const nonce=randomBytes(32).toString("base64url"),clientId=process.env.GOOGLE_CLIENT_ID;
 const response=NextResponse.json({configured:Boolean(clientId),...(clientId?{clientId,nonce}:{})},{headers:{"cache-control":"no-store"}});
 if(clientId) response.cookies.set("eumlog_google_nonce",nonce,{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",path:"/api/auth/google",maxAge:600});
 return response;
}
