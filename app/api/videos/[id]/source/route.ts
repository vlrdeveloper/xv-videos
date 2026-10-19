import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { sb } from "@/lib/supabase/server";
import { b2Configured, signedVideoUrl } from "@/lib/b2";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await getAuth();
  if (!a?.active) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !b2Configured()) return NextResponse.json({ error: "Not available." }, { status: 404 });
  const { data } = await (await sb()).from("videos").select("video_key").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try { return NextResponse.json({ url: await signedVideoUrl(data.video_key) }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (e) { console.error("signing failed", e); return NextResponse.json({ error: "Could not prepare the video." }, { status: 500 }); }
}
