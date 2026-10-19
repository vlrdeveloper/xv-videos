import Link from "next/link";
import type { Video } from "@/lib/queries";
import { fmtDur, thumbUrl, isNew } from "@/lib/format";
export function VideoCard({ v }: { v: Video }) {
  return (
    <article className="card">
      <div className="thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbUrl(v.thumbnail_key)} alt="" loading="lazy" width={640} height={360} />
        {v.duration_seconds ? <span className="dur">{fmtDur(v.duration_seconds)}</span> : null}
        {isNew(v.created_at) && <span className="badge">NEW</span>}
        {v.is_popular && <span className="star" aria-label="Popular">★</span>}
      </div>
      <div className="body">
        <Link className="chan" href={`/channel/${v.channel_slug}`}>{v.channel_name}</Link>
        <h3><Link className="title" href={`/video/${v.id}`}>{v.title}</Link></h3>
        <p className="desc">{v.description}</p>
      </div>
    </article>
  );
}
export function Grid({ videos, similar }: { videos: Video[]; similar?: boolean }) {
  if (!videos.length) return <p className="empty">No videos here yet.</p>;
  return <div className={similar ? "grid similar" : "grid"}>{videos.map(v => <VideoCard key={v.id} v={v} />)}</div>;
}
export function Listing({ title, videos, note }: { title: string; videos: Video[]; note?: string }) {
  return (<><h1 className="h1">{title}</h1>{note && <p className="muted">{note}</p>}<Grid videos={videos} /></>);
}
