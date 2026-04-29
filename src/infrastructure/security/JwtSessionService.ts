import { jwtVerify, SignJWT } from "jose";

const encoder = new TextEncoder();

export interface SessionPayload {
  userId: string;
  email: string;
}

export class JwtSessionService {
  private secret() {
    return encoder.encode(process.env.JWT_SECRET ?? "factline-development-secret-change-me");
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

