import { createHmac } from "node:crypto";
export const localPrivacy = () => process.env.PRIVACY_MODE !== "legacy";
export function accountKey(kind: "email" | "google", value: string) {
  const secret =
    process.env.ACCOUNT_HASH_KEY ||
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32))
    throw Error("계정 식별키 설정이 필요합니다.");
  return (
    "h1:" +
    createHmac("sha256", secret || "eumlog-development-account-key")
      .update(kind + "\0" + value)
      .digest("hex")
  );
}
export const privateEmail = (email: string) =>
  accountKey("email", email.trim().toLowerCase()).slice(3) + "@accounts.local";
