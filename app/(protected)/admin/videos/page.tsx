import Link from "next/link";
import { sb } from "@/lib/supabase/server";
import { thumbUrl } from "@/lib/format";
import { togglePopular, deleteVideo } from "@/app/actions/videos";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
type Row = { id: string; title: string; channel_name: string; thumbnail_key: string; is_popular: boolean; created_at: string; video_tags: { count: number }[] };
export default async function Videos({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; page?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1), q = (sp.q ?? "").replace(/[%_,()\\]/g, " ").trim();
  let query = (await sb()).from("videos").select("id,title,channel_name,thumbnail_key,is_popular,created_at,video_tags(count)", { count: "exact" });
  if (q) query = query.or(`title.ilike.%${q}%,channel_name.ilike.%${q}%`);
  query = sp.sort === "title" ? query.order("title") : sp.sort === "old" ? query.order("created_at") : query.order("created_at", { ascending: false });
  const { data, count } = await query.range((page - 1) * 20, page * 20 - 1);
  const rows = (data ?? []) as unknown as Row[], pages = Math.max(1, Math.ceil((count ?? 0) / 20));
  const here = `/admin/videos?${new URLSearchParams({ ...(q && { q }), ...(sp.sort && { sort: sp.sort }), page: String(page) })}`;
  const link = (p: number) => `/admin/videos?${new URLSearchParams({ ...(q && { q }), ...(sp.sort && { sort: sp.sort }), page: String(p) })}`;
  return (<>
    <p className="eyebrow">MANAGE</p>
    <div className="head"><div><h1 className="h1">Videos</h1><p className="muted">{count ?? 0} videos</p></div><Link className="abtn" href="/admin/videos/new">+ Add video</Link></div>
    <Flash ok={sp.ok} error={sp.error} />
    <form className="srow"><input name="q" defaultValue={q} placeholder="Search by title or channel" aria-label="Search" />
      <select name="sort" defaultValue={sp.sort ?? "new"} aria-label="Sort"><option value="new">Newest</option><option value="old">Oldest</option><option value="title">Title A-Z</option></select>
      <button className="abtn sec">Search</button></form>
    <table className="tbl"><thead><tr><th></th><th>TITLE</th><th>CHANNEL</th><th>TAGS</th><th>POPULAR</th><th>ADDED</th><th></th></tr></thead><tbody>
      {rows.map(r => <tr key={r.id}>
        <td><img className="mini" src={thumbUrl(r.thumbnail_key)} alt="" /></td><td><b>{r.title}</b></td><td>{r.channel_name}</td><td>{r.video_tags?.[0]?.count ?? 0}</td>
        <td><form action={togglePopular}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="value" value={String(!r.is_popular)} /><input type="hidden" name="back" value={here} />
          <button className="starbtn" aria-label={r.is_popular ? "Remove from Popular" : "Add to Popular"}>{r.is_popular ? "★" : "☆"}</button></form></td>
        <td>{new Date(r.created_at).toLocaleDateString()}</td>
        <td className="acts"><Link className="abtn sec" href={`/admin/videos/${r.id}/edit`}>Edit</Link>
          <form action={deleteVideo}><input type="hidden" name="id" value={r.id} /><ConfirmButton className="abtn sec" message={`Delete "${r.title}" and its files? This cannot be undone.`}>Delete</ConfirmButton></form></td></tr>)}
      {!rows.length && <tr><td colSpan={7} className="muted">Nothing found.</td></tr>}</tbody></table>
    <p className="pager">{page > 1 && <Link href={link(page - 1)}>← Previous</Link>} <span className="muted">Page {page} of {pages}</span> {page < pages && <Link href={link(page + 1)}>Next →</Link>}</p>
  </>);
}
