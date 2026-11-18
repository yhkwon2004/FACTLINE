import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { seal, unseal } from "./LocalEvidenceStorage";
test("authenticated encryption preserves binary bytes and rejects tampering or a wrong key", () => {
  const previous = process.env.ENCRYPTION_KEY;
  try {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");
    const original = Buffer.from([0, 255, 17, 44, 0, 99]);
    const encrypted = seal(original);
    assert.deepEqual(unseal(encrypted), original);
    assert.notDeepEqual(encrypted, seal(original));
    const changed = Buffer.from(encrypted);
    changed[changed.length - 1] ^= 1;
    assert.throws(() => unseal(changed));
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");
    assert.throws(() => unseal(encrypted));
  } finally {
    if (previous) process.env.ENCRYPTION_KEY = previous;
    else delete process.env.ENCRYPTION_KEY;
  }
});
