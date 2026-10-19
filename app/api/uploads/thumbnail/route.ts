import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { apiAdmin } from "@/lib/apiAdmin";
import { makeThumb } from "@/lib/imageProcess";
import { adminClient, THUMB_BUCKET } from "@/lib/supabase/admin";
export async function POST(req: Request) {
  if (!(await apiAdmin())) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const f = (await req.formData().catch(() => null))?.get("file");
  if (!(f instanceof File) || f.size === 0 || f.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Choose an image under 4 MB." }, { status: 400 });
  let buf: Buffer;
  try { buf = await makeThumb(Buffer.from(await f.arrayBuffer())); }
  catch (e) { console.error("thumb failed", e); return NextResponse.json({ error: "That image could not be read." }, { status: 400 }); }
  const key = `thumbs/${randomUUID()}.webp`;
  const { error } = await adminClient().storage.from(THUMB_BUCKET).upload(key, buf, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) { console.error("thumb upload failed", error.message); return NextResponse.json({ error: "Could not store the thumbnail." }, { status: 500 }); }
  return NextResponse.json({ key });
}
