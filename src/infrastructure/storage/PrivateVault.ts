import {
  get,
  put,
  del,
  list,
  BlobNotFoundError,
  BlobPreconditionFailedError,
} from "@vercel/blob";
export const cloudStorage = () => process.env.FACTLINE_STORAGE_MODE === "blob";
export async function readVault(name: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    throw new Error("비공개 저장소가 연결되지 않았습니다.");
  try {
    // Compression changes a strong ETag to W/; identity preserves the version required by conditional writes.
    const result = await get("eumlog/" + name, {
      access: "private",
      useCache: false,
      headers: { "accept-encoding": "identity" },
      abortSignal: AbortSignal.timeout(30000),
    });
    if (!result || result.statusCode !== 200) return null;
    return {
      bytes: Buffer.from(await new Response(result.stream).arrayBuffer()),
      etag: result.blob.etag,
    };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
}
export async function writeVault(
  name: string,
  bytes: Buffer,
  expected?: string | null,
) {
  return put("eumlog/" + name, bytes, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/octet-stream",
    cacheControlMaxAge: 0,
    allowOverwrite: expected !== null,
    ...(typeof expected === "string" ? { ifMatch: expected } : {}),
  });
}
export const deleteVault = (name: string) => del("eumlog/" + name);
export function writeConflict(error: unknown) {
  return (
    error instanceof BlobPreconditionFailedError ||
    (error instanceof Error &&
      /already exists|conditional request cannot succeed due to a conflicting operation/i.test(
        error.message,
      ))
  );
}

export async function deletePendingUploads(userId: string) {
  let cursor: string | undefined;
  do {
    const page = await list({
      prefix: "pending/" + userId + "/",
      cursor,
      limit: 1000,
    });
    if (page.blobs.length) await del(page.blobs.map((x) => x.url));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}
