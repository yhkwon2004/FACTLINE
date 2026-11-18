import { upload } from "@vercel/blob/client";
export async function evidenceUpload(
  caseId: string,
  file: File,
  cloud: boolean,
  recordingDate?:string,
) {
  const base = "/api/cases/" + caseId;
  let body: BodyInit;
  let headers: HeadersInit | undefined;
  if (cloud) {
    const session = await fetch("/api/auth/me").then((r) => r.json());
    const userId = session.session?.userId;
    if (!userId) throw new Error("다시 로그인해 주세요.");
    const extension =
      file.name
        .split(".")
        .at(-1)
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 12) || "bin";
    const object = await upload(
      "pending/" +
        userId +
        "/" +
        caseId +
        "/" +
        crypto.randomUUID() +
        "/source." +
        extension,
      file,
      {
        access: "private",
        handleUploadUrl: base + "/uploads",
        contentType: file.type || "application/octet-stream",
      },
    );
    body = JSON.stringify({
      pathname: object.pathname,
      name: file.name,
      type: file.type,
      recordingDate,
    });
    headers = { "content-type": "application/json" };
  } else {
    const form = new FormData();
    form.set("file", file);
    if(recordingDate) form.set("recordingDate",recordingDate);
    body = form;
  }
  const response = await fetch(base + "/evidence", {
    method: "POST",
    body,
    headers,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "업로드하지 못했습니다.");
  return data;
}
