import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { b2, bucket } from "@/lib/b2";
import { apiAdmin } from "@/lib/apiAdmin";
import { adminClient } from "@/lib/supabase/admin";
export async function GET() {
  if (!(await apiAdmin())) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  try {
    const used = new Set(((await adminClient().from("videos").select("video_key")).data ?? []).map((r: { video_key: string }) => r.video_key));
    const files: { key: string; size: number; modified?: Date }[] = [];
    let token: string | undefined;
    do {
      const r = await b2().send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: "videos/", ContinuationToken: token }));
      for (const o of r.Contents ?? []) if (o.Key && !used.has(o.Key) && /^videos\/[0-9a-f-]{36}\.(mp4|webm)$/.test(o.Key)) files.push({ key: o.Key, size: o.Size ?? 0, modified: o.LastModified });
      token = r.NextContinuationToken;
    } while (token && files.length < 200);
    return NextResponse.json({ files: files.slice(0, 200) });
  } catch (e) { console.error("list failed", e); return NextResponse.json({ error: "Could not list files." }, { status: 500 }); }
}
