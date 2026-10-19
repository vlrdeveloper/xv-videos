import Link from "next/link";
import { sb } from "@/lib/supabase/server";
import { thumbUrl } from "@/lib/format";
export default async function Overview() {
  const s = await sb();
  const c = async (t: string, f?: [string, boolean]) => { let q = s.from(t).select("*", { count: "exact", head: true }); if (f) q = q.eq(f[0], f[1]); return (await q).count ?? 0; };
  const [v, cat, tg, pop] = await Promise.all([c("videos"), c("categories"), c("tags"), c("videos", ["is_popular", true])]);
  const recent = ((await s.from("videos").select("id,title,channel_name,thumbnail_key,created_at").order("created_at", { ascending: false }).limit(5)).data ?? []) as
    { id: string; title: string; channel_name: string; thumbnail_key: string; created_at: string }[];
  return (<>
    <p className="eyebrow">DASHBOARD</p>
    <div className="head"><h1 className="h1">Overview</h1><div><Link className="abtn" href="/admin/videos/new">+ Add video</Link> <Link className="abtn sec" href="/admin/categories">Add category</Link></div></div>
    <div className="stats">{[[v, "VIDEOS"], [cat, "CATEGORIES"], [tg, "TAGS"], [pop, "POPULAR"]].map(([n, l]) => <div key={l}><b>{n}</b><span>{l}</span></div>)}</div>
    <h2 className="h2">Recently added</h2>
    <table className="tbl"><thead><tr><th></th><th>TITLE</th><th>CHANNEL</th><th>ADDED</th></tr></thead><tbody>
      {recent.map(r => <tr key={r.id}><td><img className="mini" src={thumbUrl(r.thumbnail_key)} alt="" /></td><td><Link href={`/admin/videos/${r.id}/edit`}>{r.title}</Link></td><td>{r.channel_name}</td><td>{new Date(r.created_at).toLocaleDateString()}</td></tr>)}
      {!recent.length && <tr><td colSpan={4} className="muted">No videos yet. Click Add video.</td></tr>}</tbody></table>
  </>);
}
