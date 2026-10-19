"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const L = [["Overview", "/admin"], ["Videos", "/admin/videos"], ["Categories", "/admin/categories"], ["Users", "/admin/users"]] as const;
export default function AdminNav() {
  const p = usePathname();
  return (<nav className="anav" aria-label="Admin"><p className="eyebrow">ADMIN</p>
    {L.map(([l, h]) => <Link key={h} href={h} className={(h === "/admin" ? p === h : p.startsWith(h)) ? "on" : ""}>{l}</Link>)}</nav>);
}
