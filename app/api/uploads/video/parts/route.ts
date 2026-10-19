import { NextResponse } from "next/server";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { b2, bucket } from "@/lib/b2";
import { apiAdmin } from "@/lib/apiAdmin";
const Body = z.object({ key: z.string().regex(/^videos\/[0-9a-f-]{36}\.(mp4|webm)$/), uploadId: z.string().min(1).max(2000), partNumbers: z.array(z.number().int().min(1).max(10000)).min(1).max(10) });
export async function POST(req: Request) {
  if (!(await apiAdmin())) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    const urls: Record<number, string> = {};
    for (const n of p.data.partNumbers)
      urls[n] = await getSignedUrl(b2(), new UploadPartCommand({ Bucket: bucket(), Key: p.data.key, UploadId: p.data.uploadId, PartNumber: n }), { expiresIn: 3600 });
    return NextResponse.json({ urls });
  } catch (e) { console.error("sign part failed", e); return NextResponse.json({ error: "Could not prepare the upload." }, { status: 500 }); }
}
