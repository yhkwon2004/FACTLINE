import { validateState } from "../../domain/services/DeviceWorkspaceState";
export type Envelope = { v: 1; iv: string; data: string };
export type VaultMeta = { v: 1; salt: string; check: Envelope };
const encode = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
};
const decode = (s: string) => {
  if (s.length > 140 * 1024 * 1024) throw Error("파일이 너무 큽니다.");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};
export async function passwordKey(password: string, salt: Uint8Array) {
  if (password.length < 10)
    throw Error("보관함 암호는 10자 이상 입력해 주세요.");
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 310000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encrypt(
  key: CryptoKey,
  bytes: Uint8Array,
  purpose: string,
): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12)),
    data = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode(purpose),
      },
      key,
      bytes as BufferSource,
    );
  return { v: 1, iv: encode(iv), data: encode(new Uint8Array(data)) };
}
export async function decrypt(key: CryptoKey, box: Envelope, purpose: string) {
  if (
    box.v !== 1 ||
    typeof box.iv !== "string" ||
    typeof box.data !== "string" ||
    decode(box.iv).length !== 12
  )
    throw Error("지원하지 않는 암호화 파일입니다.");
  return new Uint8Array(
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: decode(box.iv) as BufferSource,
        additionalData: new TextEncoder().encode(purpose),
      },
      key,
      decode(box.data) as BufferSource,
    ),
  );
}
export async function createTransfer(payload: unknown, token?: string) {
  const secret =
    token ??
    encode(crypto.getRandomValues(new Uint8Array(32)))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(secret))
    throw Error("전달 토큰은 생성된 43자 토큰을 사용해 주세요.");
  const key = await crypto.subtle.importKey(
    "raw",
    decode(secret.replaceAll("-", "+").replaceAll("_", "/") + "="),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  return {
    token: secret,
    file: await encrypt(
      key,
      new TextEncoder().encode(JSON.stringify(payload)),
      "eumlog-selected-transfer-v1",
    ),
  };
}
export async function openTransfer(file: Envelope, token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw Error("전달 토큰을 확인해 주세요.");
  const key = await crypto.subtle.importKey(
    "raw",
    decode(token.replaceAll("-", "+").replaceAll("_", "/") + "="),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  return JSON.parse(
    new TextDecoder().decode(
      await decrypt(key, file, "eumlog-selected-transfer-v1"),
    ),
  );
}
function request<T>(r: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function finish(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error ?? Error("기기 저장 실패"));
  });
}
export class DeviceVault {
  private constructor(
    private db: IDBDatabase,
    private key: CryptoKey,
  ) {}
  static async exists(userId:string){const req=indexedDB.open('eumlog-device-v1-'+userId,1);req.onupgradeneeded=()=>req.result.createObjectStore('sealed');const db=await request(req);try{return Boolean(await request(db.transaction('sealed').objectStore('sealed').get('meta')));}finally{db.close();}}
  static async open(userId: string, password: string) {
    const req = indexedDB.open("eumlog-device-v1-" + userId, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("sealed");
    const db = await request(req);
    db.onversionchange = () => db.close();
    try {
      let meta = (await request(
        db.transaction("sealed").objectStore("sealed").get("meta"),
      )) as VaultMeta | undefined;
      const salt = meta
        ? decode(meta.salt)
        : crypto.getRandomValues(new Uint8Array(16));
      if (salt.length !== 16) throw Error("보관함 형식 오류");
      const key = await passwordKey(password, salt);
      if (meta) {
        const value = new TextDecoder().decode(
          await decrypt(key, meta.check, "check"),
        );
        if (value !== "eumlog-local-v1")
          throw Error("암호가 일치하지 않습니다.");
      } else {
        meta = {
          v: 1,
          salt: encode(salt),
          check: await encrypt(
            key,
            new TextEncoder().encode("eumlog-local-v1"),
            "check",
          ),
        };
        const tx = db.transaction("sealed", "readwrite");
        tx.objectStore("sealed").add(meta, "meta");
        await finish(tx);
      }
      return new DeviceVault(db, key);
    } catch {
      db.close();
      throw Error(
        "보관함을 열지 못했습니다. 암호 또는 파일 손상을 확인해 주세요.",
      );
    }
  }
  close() {
    this.db.close();
  }
  async readVersioned<T>(
    id: string,
  ): Promise<{ revision: number; value: T } | null> {
    const row = await request(
      this.db.transaction("sealed").objectStore("sealed").get(id),
    );
    if (!row) return null;
    return {
      revision: row.revision,
      value: JSON.parse(
        new TextDecoder().decode(
          await decrypt(this.key, row.box, "record:" + id),
        ),
      ),
    };
  }
  async read<T>(id: string): Promise<T | null> {
    return (await this.readVersioned<T>(id))?.value ?? null;
  }
  // shortcut: workspace saves encrypt the full JSON; split by case when measured edit latency grows.
  async save(id: string, value: unknown, revision: number) {
    const box = await encrypt(
        this.key,
        new TextEncoder().encode(JSON.stringify(value)),
        "record:" + id,
      ),
      tx = this.db.transaction("sealed", "readwrite"),
      store = tx.objectStore("sealed"),
      pending = store.get(id);
    let conflict = false;
    pending.onsuccess = () => {
      if ((pending.result?.revision ?? 0) !== revision) {
        conflict = true;
        tx.abort();
      } else store.put({ revision: revision + 1, box }, id);
    };
    try {
      await finish(tx);
    } catch (e) {
      if (conflict)
        throw Error(
          "다른 화면에서 변경했습니다. 내보내기로 현재 내용을 보관한 뒤 다시 열어 주세요.",
        );
      throw e;
    }
    return revision + 1;
  }
  async revision(id: string) {
    return (
      (
        await request(
          this.db.transaction("sealed").objectStore("sealed").get(id),
        )
      )?.revision ?? 0
    );
  }
  async putFile(id: string, file: Blob) {
    const box = await encrypt(
        this.key,
        new Uint8Array(await file.arrayBuffer()),
        "file:" + id,
      ),
      tx = this.db.transaction("sealed", "readwrite");
    tx.objectStore("sealed").put({ box, type: file.type }, "file:" + id);
    await finish(tx);
  }
  async file(id: string) {
    const row = await request(
      this.db
        .transaction("sealed")
        .objectStore("sealed")
        .get("file:" + id),
    );
    if (!row) throw Error("기기에서 원본을 찾지 못했습니다.");
    return new Blob(
      [(await decrypt(this.key, row.box, "file:" + id)) as BlobPart],
      { type: row.type },
    );
  }
  async backup() {
    const tx = this.db.transaction("sealed"),
      store = tx.objectStore("sealed");
    const [keys, rows] = await Promise.all([
      request(store.getAllKeys()),
      request(store.getAll()),
    ]);
    const result={format:"eumlog-device-v1",keys,rows};
    // shortcut: full-browser backups are limited to 100MB; add streamed multipart restore before raising this bound.
    if(keys.length>5000 || new Blob([JSON.stringify(result)]).size>100*1024*1024)throw Error('전체 백업은 5,000개 항목·100MB까지 지원합니다. 원본과 확인 기록을 먼저 개별 저장해 주세요.');
    return result;
  }
  static async restore(userId: string, backup: unknown, password: string) {
    const b = backup as {
      format: string;
      keys: IDBValidKey[];
      rows: unknown[];
    };
    if (
      b?.format !== "eumlog-device-v1" ||
      !Array.isArray(b.keys) ||
      !Array.isArray(b.rows) ||
      b.keys.length !== b.rows.length ||
      b.keys.length > 5000 || new Set(b.keys).size !== b.keys.length
    )
      throw Error("백업 파일을 확인해 주세요.");
    const meta = b.rows[b.keys.indexOf("meta")] as VaultMeta;
    if (meta?.v !== 1 || typeof meta.salt !== "string") throw Error("백업 형식 오류");
    const salt = decode(meta.salt);
    if (salt.length !== 16) throw Error("백업 형식 오류");
    const key = await passwordKey(password, salt);
    if (
      new TextDecoder().decode(await decrypt(key, meta.check, "check")) !==
      "eumlog-local-v1"
    )
      throw Error("백업 암호를 확인해 주세요.");
    for (let i = 0; i < b.keys.length; i++) {
      if (b.keys[i] === "meta") continue;
      const id = b.keys[i];
      if (typeof id !== "string") throw Error("백업 항목이 잘못되었습니다.");
      const row = b.rows[i] as {box: Envelope; revision: number; type: string};
      const file = id.startsWith("file:");
      if (!row || (file ? typeof row.type !== "string" : !Number.isSafeInteger(row.revision) || row.revision < 1))
        throw Error("백업 항목이 잘못되었습니다.");
      const bytes = await decrypt(key, row.box, file ? id : "record:" + id);
      if (id === "workspace") validateState(JSON.parse(new TextDecoder().decode(bytes)));
    }
    const req = indexedDB.open("eumlog-device-v1-" + userId, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("sealed");
    const db = await request(req);
    try {
      const count = await request(
        db.transaction("sealed").objectStore("sealed").count(),
      );
      if (count > 0)
        throw Error(
          "기존 보관함을 덮어쓰지 않습니다. 비어 있는 보관함에서 복원해 주세요.",
        );
      const tx = db.transaction("sealed", "readwrite");
      b.keys.forEach((k, i) => tx.objectStore("sealed").add(b.rows[i], k));
      await finish(tx);
    } finally {
      db.close();
    }
  }
}
