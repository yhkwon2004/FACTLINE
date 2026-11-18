import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (!existsSync(".env.local")) {
  const lines = [
    "FACTLINE_STORAGE_MODE=local",
    "NEXT_TELEMETRY_DISABLED=1",
    "JWT_SECRET=" + randomBytes(48).toString("hex"),
    "ENCRYPTION_KEY=" + randomBytes(48).toString("hex"),
  ];
  writeFileSync(".env.local", lines.join("\n") + "\n", { mode: 0o600 });
  console.log("Created .env.local. Keep it with your data backup.");
} else console.log("Existing local settings preserved.");
