import Link from "next/link";
import { tagCounts } from "@/lib/queries";
export default async function Tags() {
  const t = await tagCounts();
  return (<><h1 className="h1">Tags</h1>{t.length === 0 ? <p className="empty">No tags yet.</p> : <ul className="chips">
    {t.map(x => <li key={x.slug}><Link className="chip" href={`/tag/${x.slug}`}>{x.name} <span>{x.video_count}</span></Link></li>)}
  </ul>}</>);
}
