import Link from "next/link";
import { notFound } from "next/navigation";
import { Grid } from "@/components/VideoCard";
import Player from "@/components/Player";
import { getVideo, similarVideos } from "@/lib/queries";
import { b2Configured, signedVideoUrl } from "@/lib/b2";
import { fmtDur, thumbUrl } from "@/lib/format";
export default async function Watch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const v = await getVideo(id); if (!v) notFound();
  const sim = await similarVideos(id);
  let src: string | null = null;
  if (b2Configured()) { try { src = await signedVideoUrl(v.video_key); } catch (e) { console.error("signing failed", e); } }
  const long = v.description.length > 300;
  return (<>
    <Player id={v.id} src={src} poster={thumbUrl(v.thumbnail_key)} />
    <h1 className="h1">{v.title}</h1>
    <p className="meta"><Link href={`/channel/${v.channel_slug}`}>{v.channel_name}</Link> · {new Date(v.created_at).toLocaleDateString()}{v.duration_seconds ? ` · ${fmtDur(v.duration_seconds)}` : ""}
      {v.video_categories.map(c => <span key={c.categories.slug}> · <Link href={`/category/${c.categories.slug}`}>{c.categories.name}</Link></span>)}</p>
    <ul className="chips">{v.video_tags.map(t => <li key={t.tags.slug}><Link className="chip" href={`/tag/${t.tags.slug}`}>{t.tags.name}</Link></li>)}</ul>
    {v.description && <div className="panel">{long
      ? <details><summary>Show more / Show less</summary><p className="pre">{v.description}</p></details>
      : <p className="pre">{v.description}</p>}</div>}
    {sim.videos.length > 0 && <>
      <h2 className="h2">{sim.matched ? "Similar videos" : "Popular videos"}</h2>
      <Grid videos={sim.videos.slice(0, 10)} similar />
      {sim.videos.length > 10 && <details className="more"><summary className="btn">Show more</summary><Grid videos={sim.videos.slice(10)} similar /></details>}
    </>}
  </>);
}
