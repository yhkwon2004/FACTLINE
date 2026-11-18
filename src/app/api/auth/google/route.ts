import {cookies} from "next/headers";
import {NextResponse,type NextRequest} from "next/server";
import {verifyGoogleIdentity} from "../../../../infrastructure/security/GoogleIdentity";
import {createContainer} from "../../../../infrastructure/di/container";
import {parseRequestBody,requireSession,setSessionCookie,jsonError} from "../../_utils";
import {AuthNavigationPolicy} from "../../../../application/services/AuthNavigationPolicy";
export async function POST(request:NextRequest) {
 try {
  const body=await parseRequestBody(request),nonce=(await cookies()).get("eumlog_google_nonce")?.value;
  if(!nonce || nonce!==body.nonce) throw new Error("로그인 화면을 새로 열고 다시 시도해 주세요.");
  const identity=await verifyGoogleIdentity(String(body.credential??""),nonce,process.env.GOOGLE_CLIENT_ID??"");
  const link=body.link===true?{userId:(await requireSession()).userId,password:String(body.password??"")}:undefined;
  const result=await createContainer().authService.googleLogin(identity,link);
  const next=new AuthNavigationPolicy().normalizeReturnPath(body.next);
  const response=NextResponse.json({user:result.user,next});setSessionCookie(response,result.token);
  response.cookies.set("eumlog_google_nonce","",{path:"/api/auth/google",maxAge:0});return response;
 }catch(error){return jsonError(error,401);}
}
