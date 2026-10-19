import { NextResponse } from "next/server";
import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { b2, bucket, deleteAllVersions } from "@/lib/b2";
import { apiAdmin } from "@/lib/apiAdmin";
import { adminClient } from "@/lib/supabase/admin";
const Body = z.object({ key: z.string().regex(/^videos\/[0-9a-f-]{36}\.(mp4|webm)$/), uploadId: z.string().optional() });
export async function POST(req: Request) {
  if (!(await apiAdmin())) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  try {
    if (p.data.uploadId) await b2().send(new AbortMultipartUploadCommand({ Bucket: bucket(), Key: p.data.key, UploadId: p.data.uploadId })).catch(() => {});
    // Only remove the file if no video uses it.
    const { data } = await adminClient().from("videos").select("id").eq("video_key", p.data.key).maybeSingle();
    if (!data) await deleteAllVersions(p.data.key);
  } catch (e) { console.error("abort cleanup failed", e); }
  return NextResponse.json({ ok: true });
}
