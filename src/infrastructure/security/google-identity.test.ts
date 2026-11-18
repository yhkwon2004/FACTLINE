import assert from "node:assert/strict";
import {test} from "node:test";
import {generateKeyPair,SignJWT} from "jose";
import {verifyGoogleIdentity} from "./GoogleIdentity";
const keys=await generateKeyPair("RS256"),nonce="n".repeat(43),client="client.apps.googleusercontent.com";
async function token(overrides:Record<string,unknown>={},aud=client,issuer="https://accounts.google.com",expires="5m") {
 return new SignJWT({email:"owner@gmail.com",email_verified:true,name:"소유자",nonce,...overrides}).setProtectedHeader({alg:"RS256"}).setIssuer(issuer).setAudience(aud).setSubject("google-123").setIssuedAt().setExpirationTime(expires).sign(keys.privateKey);
}
test("Google verifies signature, issuer, audience, expiry, verified email and nonce",async()=>{
 const resolver=async()=>keys.publicKey;
 const result=await verifyGoogleIdentity(await token(),nonce,client,resolver);assert.equal(result.subject,"google-123");
 for(const bad of [await token({nonce:"x".repeat(43)}),await token({email_verified:false}),await token({},"other"),await token({},client,"https://evil.example"),await token({},client,"https://accounts.google.com","-1m")]) await assert.rejects(verifyGoogleIdentity(bad,nonce,client,resolver));
 const altered=(await token()).split(".");altered[1]=Buffer.from(JSON.stringify({sub:"attacker",nonce})).toString("base64url");await assert.rejects(verifyGoogleIdentity(altered.join("."),nonce,client,resolver));
});
