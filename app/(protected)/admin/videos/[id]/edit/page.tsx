import { notFound } from "next/navigation";
import VideoForm, { type Initial } from "@/components/admin/VideoForm";
import { sb } from "@/lib/supabase/server";
import { categoryCounts, tagCounts } from "@/lib/queries";
export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data } = await (await sb()).from("videos").select("*,video_tags(tags(name)),video_categories(category_id)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const v = data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const [c, t] = await Promise.all([categoryCounts(), tagCounts()]);
  const initial: Initial = { id: v.id, expected: v.updated_at, title: v.title, channel_name: v.channel_name, description: v.description,
    tags: v.video_tags.map((x: { tags: { name: string } }) => x.tags.name), category_ids: v.video_categories.map((x: { category_id: string }) => x.category_id),
    is_popular: v.is_popular, video_key: v.video_key, video_bytes: v.video_bytes, duration_seconds: v.duration_seconds, thumbnail_key: v.thumbnail_key };
  return (<><p className="eyebrow">VIDEOS</p><h1 className="h1">Edit video</h1><VideoForm initial={initial} categories={c.map(x => ({ id: x.id, name: x.name }))} allTags={t.map(x => x.name)} /></>);
}
