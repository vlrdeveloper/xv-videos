import { NextResponse } from "next/server";
import { CompleteMultipartUploadCommand, HeadObjectCommand, ListPartsCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { b2, bucket } from "@/lib/b2";
import { apiAdmin } from "@/lib/apiAdmin";
// The browser may not be able to read each part's ETag (depends on the bucket's CORS rule),
// so the server asks Backblaze for the list of uploaded parts instead.
const Body = z.object({ key: z.string().regex(/^videos\/[0-9a-f-]{36}\.(mp4|webm)$/), uploadId: z.string().min(1), parts: z.array(z.unknown()).max(10000).optional() });
export async function POST(req: Request) {
  if (!(await apiAdmin())) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    const parts: { PartNumber: number; ETag: string }[] = [];
    let marker: string | undefined;
    for (;;) {
      const r = await b2().send(new ListPartsCommand({ Bucket: bucket(), Key: p.data.key, UploadId: p.data.uploadId, PartNumberMarker: marker }));
      for (const x of r.Parts ?? []) if (x.PartNumber && x.ETag) parts.push({ PartNumber: x.PartNumber, ETag: x.ETag });
      if (!r.IsTruncated) break;
      marker = String(r.NextPartNumberMarker);
    }
    if (!parts.length || (p.data.parts && p.data.parts.length !== parts.length))
      return NextResponse.json({ error: "Some upload pieces are missing. Please try again." }, { status: 409 });
    await b2().send(new CompleteMultipartUploadCommand({ Bucket: bucket(), Key: p.data.key, UploadId: p.data.uploadId, MultipartUpload: { Parts: parts } }));
    const h = await b2().send(new HeadObjectCommand({ Bucket: bucket(), Key: p.data.key }));
    return NextResponse.json({ key: p.data.key, bytes: h.ContentLength ?? 0 });
  } catch (e) { console.error("complete failed", e); return NextResponse.json({ error: "Could not finish the upload." }, { status: 500 }); }
}
