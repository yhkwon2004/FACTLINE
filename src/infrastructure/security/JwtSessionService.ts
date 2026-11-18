import { jwtVerify, SignJWT } from "jose";

const encoder = new TextEncoder();

export interface SessionPayload {
  userId: string;
  email: string;
}

export class JwtSessionService {
  private secret() {
    const value=process.env.JWT_SECRET;
    if(process.env.NODE_ENV==="production" && (!value || value.length<32)) throw new Error("JWT_SECRET 설정이 필요합니다.");
    return encoder.encode(value ?? "factline-development-secret-change-me");
  }

  async sign(payload: SessionPayload) {
    return new SignJWT({ email: payload.email })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.userId)
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(this.secret());
  }

  async verify(token: string): Promise<SessionPayload | null> {
    try {
      const verified = await jwtVerify(token, this.secret());
      return {
        userId: verified.payload.sub ?? "",
        email: String(verified.payload.email ?? ""),
      };
    } catch {
      return null;
    }
  }
}

