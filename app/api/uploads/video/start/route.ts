import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { b2, bucket } from "@/lib/b2";
import { apiAdmin } from "@/lib/apiAdmin";
const MiB = 1024 * 1024;
const Body = z.object({ filename: z.string().max(255), size: z.number().int().min(MiB).max(5 * 1024 * MiB), contentType: z.enum(["video/mp4", "video/webm"]) });
export async function POST(req: Request) {
  if (!(await apiAdmin())) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Use an MP4 or WebM file between 1 MB and 5 GB." }, { status: 400 });
  const partSize = Math.max(16 * MiB, Math.ceil(p.data.size / 9000));
  const key = `videos/${randomUUID()}.${p.data.contentType === "video/mp4" ? "mp4" : "webm"}`;
  try {
    const out = await b2().send(new CreateMultipartUploadCommand({ Bucket: bucket(), Key: key, ContentType: p.data.contentType }));
    return NextResponse.json({ key, uploadId: out.UploadId, partSize });
  } catch (e) { console.error("multipart start failed", e); return NextResponse.json({ error: "Could not start the upload. Check the Backblaze settings in .env.local." }, { status: 500 }); }
}
