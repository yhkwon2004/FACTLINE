import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
const googleKeys=createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
export const googleConfigured=()=>Boolean(process.env.GOOGLE_CLIENT_ID);
export const passwordLoginEnabled=()=>process.env.PASSWORD_LOGIN_ENABLED!=="false" || !googleConfigured();
export async function verifyGoogleIdentity(credential:string,nonce:string,clientId:string,keys:JWTVerifyGetKey=googleKeys) {
  if(!credential || credential.length>16000 || !nonce || nonce.length<32 || !clientId) throw new Error("Google 인증 요청이 유효하지 않습니다.");
  const {payload}=await jwtVerify(credential,keys,{issuer:["accounts.google.com","https://accounts.google.com"],audience:clientId,algorithms:["RS256"],maxTokenAge:"10m",clockTolerance:5});
  if(payload.nonce!==nonce || payload.email_verified!==true || !payload.sub || payload.sub.length>255 || typeof payload.email!=="string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || (payload.azp && payload.azp!==clientId)) throw new Error("Google 인증 정보를 확인할 수 없습니다.");
  return {subject:payload.sub,email:payload.email,name:typeof payload.name==="string"?payload.name:payload.email.split("@")[0]};
}
