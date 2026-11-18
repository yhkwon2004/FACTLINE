import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import {
  cloudStorage,
  readVault,
  writeVault,
  deleteVault,
  writeConflict,
} from "./PrivateVault";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { mkdir, readFile, rename, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import type { IStorageService } from "../../application/ports";
const root = () => path.join(process.cwd(), ".data", "evidence");
const key = () => {
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32)
    throw new Error("32자 이상의 ENCRYPTION_KEY를 설정해 주세요.");
  return createHash("sha256").update(process.env.ENCRYPTION_KEY).digest();
};
function safeId(id: string) {
  if (!/^[a-f0-9-]{36}(?:\.analysis)?$/.test(id))
    throw new Error("잘못된 파일 식별자입니다.");
  return id;
}
export function seal(bytes: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}
export async function saveEncrypted(id: string, bytes: Buffer) {
  if (cloudStorage()) {
    await writeVault("evidence/" + safeId(id), seal(bytes));
    return;
  }
  await mkdir(root(), { recursive: true });
  const target = path.join(root(), safeId(id));
  const temp = target + "." + randomUUID() + ".tmp";
  await writeFile(temp, seal(bytes), { mode: 0o600 });
  await rename(temp, target);
}
export function unseal(bytes: Buffer) {
  const cipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]);
}
export async function readEncrypted(id: string) {
  if (cloudStorage()) {
    const object = await readVault("evidence/" + safeId(id));
    if (!object)
      throw Object.assign(new Error("자료를 찾을 수 없습니다."), {
        code: "ENOENT",
      });
    return unseal(object.bytes);
  }
  return unseal(await readFile(path.join(root(), safeId(id))));
}
export class LocalEvidenceStorage implements IStorageService {
  hash(content: string) {
    return createHash("sha256").update(content).digest("hex");
  }
  async save(input: {
    name: string;
    type: string;
    content: string;
    encoding?: "base64";
  }) {
    const bytes = Buffer.from(
      input.content,
      input.encoding === "base64" ? "base64" : "utf8",
    );
    if (!bytes.length || bytes.length > 20 * 1024 * 1024)
      throw new Error("파일은 1바이트 이상, 20MB 이하여야 합니다.");
    const id = randomUUID();
    await saveEncrypted(id, bytes);
    return {
      fileUrl: "local://" + id,
      fileHash: createHash("sha256").update(bytes).digest("hex"),
    };
  }
}

export async function removeEncrypted(id: string) {
  if (cloudStorage()) {
    await deleteVault("evidence/" + safeId(id));
    return;
  }
  await rm(path.join(root(), safeId(id)), { force: true });
}

// shortcut: one encrypted JSON document per record; move metadata to Postgres when records become large.
export async function updateEncrypted<T>(
  id: string,
  initial: T,
  mutate: (value: T) => T,
): Promise<T> {
  if (!cloudStorage()) {
    let value = initial;
    try {
      value = JSON.parse(
        unseal(readFileSync(path.join(root(), safeId(id)))).toString(),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    const result = mutate(value);
    // Local mutations are synchronous until the atomic rename, avoiding lost leases in this single server.
    mkdirSync(root(), { recursive: true });
    const target = path.join(root(), safeId(id)),
      temp = target + "." + randomUUID() + ".tmp";
    writeFileSync(temp, seal(Buffer.from(JSON.stringify(result))), {
      mode: 0o600,
    });
    renameSync(temp, target);
    return result;
  }
  for (let attempt = 0; attempt < 12; attempt++) {
    const object = await readVault("evidence/" + safeId(id));
    const value = object
      ? (JSON.parse(unseal(object.bytes).toString()) as T)
      : initial;
    const result = mutate(value);
    try {
      await writeVault(
        "evidence/" + safeId(id),
        seal(Buffer.from(JSON.stringify(result))),
        object?.etag ?? null,
      );
      return result;
    } catch (error) {
      if (!writeConflict(error)) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, 100 + Math.random() * 150),
      );
    }
  }
  throw new Error("다른 변경과 겹쳤습니다. 다시 시도해 주세요.");
}
