"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { sb } from "@/lib/supabase/server";
import { adminClient, THUMB_BUCKET } from "@/lib/supabase/admin";
import { deleteAllVersions } from "@/lib/b2";
import { normalizeTags, slugify } from "@/lib/tags";

const Payload = z.object({
  id: z.string().uuid().optional(), expected: z.string().optional(),
  title: z.string().trim().min(1).max(120), channel_name: z.string().trim().min(1).max(60),
  description: z.string().max(2000), tags: z.array(z.string()).max(40), category_ids: z.array(z.string().uuid()),
  is_popular: z.boolean(),
  video_key: z.string().regex(/^videos\/[0-9a-f-]{36}\.(mp4|webm)$/),
  video_bytes: z.number().int().nonnegative().nullable(), duration_seconds: z.number().int().nonnegative().nullable(),
  thumbnail_key: z.string().regex(/^thumbs\/[0-9a-f-]{36}\.webp$/),
});
const SAFE = /^(A video needs|This video was changed|Not allowed|Video not found)/;
const fail = (m: string) => { console.error("video save failed:", m); return { error: SAFE.test(m) ? m : "Could not save the video. Check the details and try again." }; };
async function removeThumb(key: string) { try { await adminClient().storage.from(THUMB_BUCKET).remove([key]); } catch (e) { console.error("thumb cleanup failed", e); } }

export async function saveVideo(input: unknown): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const p = Payload.safeParse(input);
  if (!p.success) return { error: "Please check the form: " + p.error.issues[0].message };
  const tags = normalizeTags(p.data.tags);
  if (tags.length < 5 || tags.length > 10) return { error: "Add between 5 and 10 valid, different tags." };
  const s = await sb();
  const body = { ...p.data, tags, channel_slug: slugify(p.data.channel_name, "channel") };
  if (!p.data.id) {
    const { error } = await s.rpc("create_video", { p: body });
    if (error) return fail(error.message);
  } else {
    if (!p.data.expected) return { error: "Reload the page and try again." };
    const { data, error } = await s.rpc("update_video", { p: body, p_expected: p.data.expected });
    if (error) return fail(error.message);
    const old = (data as { old_video_key: string; old_thumbnail_key: string }[] | null)?.[0];
    if (old && old.old_video_key !== p.data.video_key) await deleteAllVersions(old.old_video_key);
    if (old && old.old_thumbnail_key !== p.data.thumbnail_key) await removeThumb(old.old_thumbnail_key);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
const back = (path: string, k: "ok" | "error", m: string): never => redirect(`${path}?${k}=${encodeURIComponent(m)}`);
export async function deleteVideo(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  let ok = true;
  try {
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("bad id");
    const { data, error } = await (await sb()).rpc("delete_video", { p_id: id });
    if (error) throw error;
    for (const r of (data ?? []) as { video_key: string; thumbnail_key: string }[]) { await deleteAllVersions(r.video_key); await removeThumb(r.thumbnail_key); }
  } catch (e) { console.error("delete failed", e); ok = false; }
  revalidatePath("/", "layout");
  return ok ? back("/admin/videos", "ok", "Video deleted.") : back("/admin/videos", "error", "Could not delete the video.");
}
export async function togglePopular(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? ""), value = fd.get("value") === "true", to = String(fd.get("back") ?? "/admin/videos");
  if (/^[0-9a-f-]{36}$/.test(id)) { const { error } = await (await sb()).rpc("set_video_popular", { p_id: id, p_value: value }); if (error) console.error(error.message); }
  revalidatePath("/", "layout");
  redirect(to.startsWith("/admin") ? to : "/admin/videos");
}
