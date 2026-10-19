import Link from "next/link";
import { Grid } from "@/components/VideoCard";
import { searchVideos } from "@/lib/queries";
export default async function S({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const { q = "", sort = "relevance" } = await searchParams;
  const r = q.trim() ? await searchVideos(q, sort) : [];
  const e = encodeURIComponent(q);
  return (<>
    <h1 className="h1">{r.length} results for &lsquo;{q}&rsquo;</h1>
    <p className="muted">Sort: <Link href={`/search?q=${e}&sort=relevance`}>Relevance</Link> · <Link href={`/search?q=${e}&sort=newest`}>Newest</Link></p>
    {r.length ? <Grid videos={r} /> : <p className="empty">Nothing matched. Try fewer words, or browse <Link href="/popular">Popular</Link> or <Link href="/tags">Tags</Link>.</p>}
  </>);
}
