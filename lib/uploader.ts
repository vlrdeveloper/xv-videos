// Browser-side multipart upload straight to Backblaze. Never reads the whole file into memory.
export type Ctl = { paused: boolean; cancelled: boolean; xhrs: Set<XMLHttpRequest> };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Request failed");
  return j;
}
function putPart(url: string, blob: Blob, ctl: Ctl, onBytes: (n: number) => void): Promise<string> {
  return new Promise((res, rej) => {
    const x = new XMLHttpRequest(); ctl.xhrs.add(x);
    x.open("PUT", url);
    x.upload.onprogress = e => onBytes(e.loaded);
    x.onload = () => { ctl.xhrs.delete(x); const et = x.getResponseHeader("ETag"); x.status >= 200 && x.status < 300 ? res(et ?? "") : rej(new Error(`Part failed (${x.status}). If this repeats, run: npm run setup-b2-cors`)); };
    x.onerror = () => { ctl.xhrs.delete(x); rej(new Error("Network error (check the bucket's CORS setting)")); };
    x.onabort = () => { ctl.xhrs.delete(x); rej(new Error("cancelled")); };
    x.send(blob);
  });
}
export async function uploadVideoFile(file: File, ctl: Ctl, onProgress: (sent: number) => void) {
  const { key, uploadId, partSize } = await post("/api/uploads/video/start", { filename: file.name, size: file.size, contentType: file.type });
  const total = Math.ceil(file.size / partSize);
  const done = new Map<number, string>(), live = new Map<number, number>();
  let next = 1;
  const report = () => { let s = 0; done.forEach((_, n) => { s += Math.min(partSize, file.size - (n - 1) * partSize); }); live.forEach(v => { s += v; }); onProgress(Math.min(s, file.size)); };
  async function worker() {
    for (;;) {
      if (ctl.cancelled) throw new Error("cancelled");
      const n = next++; if (n > total) return;
      const blob = file.slice((n - 1) * partSize, Math.min(n * partSize, file.size));
      let tries = 0;
      for (;;) {
        while (ctl.paused && !ctl.cancelled) await sleep(300);
        if (ctl.cancelled) throw new Error("cancelled");
        try {
          const { urls } = await post("/api/uploads/video/parts", { key, uploadId, partNumbers: [n] }); // fresh URL each attempt
          const etag = await putPart(urls[n], blob, ctl, b => { live.set(n, b); report(); });
          live.delete(n); done.set(n, etag); report(); break;
        } catch (e) {
          live.delete(n);
          if (ctl.cancelled) throw new Error("cancelled");
          if (++tries >= 5) throw e;
          await sleep(1000 * 2 ** (tries - 1));
        }
      }
    }
  }
  try { await Promise.all([worker(), worker(), worker()]); }
  catch (e) { ctl.cancelled = true; ctl.xhrs.forEach(x => x.abort()); await post("/api/uploads/video/abort", { key, uploadId }).catch(() => {}); throw e; }
  const parts = [...done.entries()].sort((a, b) => a[0] - b[0]).map(([PartNumber, ETag]) => ({ PartNumber, ETag }));
  const out = await post("/api/uploads/video/complete", { key, uploadId, parts });
  return { key: out.key as string, bytes: out.bytes as number };
}
export const discardUpload = (key: string) => post("/api/uploads/video/abort", { key }).catch(() => {});
