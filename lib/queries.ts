import "server-only";
import { sb } from "@/lib/supabase/server";
export type Video = { id: string; title: string; channel_name: string; channel_slug: string; description: string;
  thumbnail_key: string; duration_seconds: number | null; is_popular: boolean; created_at: string; video_key: string };
export type Detail = Video & { video_tags: { tags: { name: string; slug: string } }[]; video_categories: { categories: { name: string; slug: string } }[] };
const COLS = "id,title,channel_name,channel_slug,description,thumbnail_key,duration_seconds,is_popular,created_at,video_key";
const ok = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) { console.error(r.error.message); throw new Error("The website could not read its data. Check Supabase settings and the SQL files."); }
  return r.data as T;
};
export async function listVideos(o: { popular?: boolean; tag?: string; category?: string; channel?: string; limit?: number } = {}) {
  const s = await sb();
  const join = o.tag ? ",video_tags!inner(tags!inner(slug))" : o.category ? ",video_categories!inner(categories!inner(slug))" : "";
  let q = s.from("videos").select(COLS + join);
  if (o.popular) q = q.eq("is_popular", true);
  if (o.tag) q = q.eq("video_tags.tags.slug", o.tag);
  if (o.category) q = q.eq("video_categories.categories.slug", o.category);
  if (o.channel) q = q.eq("channel_slug", o.channel);
  q = o.popular ? q.order("popular_at", { ascending: false }) : q.order("created_at", { ascending: false });
  return ok(await q.limit(o.limit ?? 48)) as unknown as Video[];
}
export async function getVideo(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const s = await sb();
  const r = await s.from("videos").select(`${COLS},video_tags(tags(name,slug)),video_categories(categories(name,slug))`).eq("id", id).maybeSingle();
  return ok(r) as unknown as Detail | null;
}
export async function similarVideos(id: string) {
  const s = await sb();
  const rows = ok(await s.rpc("similar_videos", { p_video_id: id, p_min: 10, p_max: 20 })) as { id: string; match_type: string }[];
  if (!rows.length) return { videos: [] as Video[], matched: false };
  const vids = ok(await s.from("videos").select(COLS).in("id", rows.map(r => r.id))) as unknown as Video[];
  const by = new Map(vids.map(v => [v.id, v]));
  return { videos: rows.map(r => by.get(r.id)).filter((v): v is Video => !!v), matched: rows.some(r => r.match_type === "tags") };
}
export async function searchVideos(q: string, sort: string) {
  const s = await sb();
  return ok(await s.rpc("search_videos", { p_q: q.slice(0, 100), p_sort: sort === "newest" ? "newest" : "relevance", p_limit: 48, p_offset: 0 })) as unknown as Video[];
}
export async function tagCounts() { const s = await sb(); return ok(await s.rpc("list_tags_with_counts")) as { name: string; slug: string; video_count: number }[]; }
export async function categoryCounts() { const s = await sb(); return ok(await s.rpc("list_categories_with_counts")) as { id: string; name: string; slug: string; video_count: number }[]; }
export async function counts() {
  const s = await sb();
  const c = async (t: string) => (await s.from(t).select("*", { count: "exact", head: true })).count ?? 0;
  return { videos: await c("videos"), categories: await c("categories"), tags: await c("tags"), users: await c("profiles") };
}
