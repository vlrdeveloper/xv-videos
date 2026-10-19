"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
type Cat = { name: string; slug: string; video_count: number };
export default function MenuBar({ cats, isAdmin }: { cats: Cat[]; isAdmin: boolean }) {
  const p = usePathname();
  const items = [["HOME", "/"], ["POPULAR", "/popular"], ["NEW", "/new"], ["TAGS", "/tags"]] as const;
  const on = (h: string) => (h === "/" ? p === "/" : p.startsWith(h));
  return (
    <nav className="menubar" aria-label="Main"><div className="wrap"><ul>
      {items.map(([l, h]) => (
        <li key={h}><Link href={h} className={on(h) ? "active" : ""}>{l}{l === "POPULAR" && <span className="gold" aria-hidden> ★</span>}</Link></li>
      ))}
      <li className="dd"><details>
        <summary className={p.startsWith("/category") ? "active" : ""}>CATEGORIES ▾</summary>
        <ul className="ddlist">
          {cats.length === 0 && <li><span className="muted pad">No categories yet</span></li>}
          {cats.map(c => <li key={c.slug}><Link href={`/category/${c.slug}`}>{c.name}<span>{c.video_count}</span></Link></li>)}
        </ul>
      </details></li>
      {isAdmin && <li><Link href="/admin" className={on("/admin") ? "active" : ""}>ADMIN</Link></li>}
    </ul></div></nav>
  );
}
