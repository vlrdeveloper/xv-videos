import Link from "next/link";
import MenuBar from "@/components/MenuBar";
import ThemeToggle from "@/components/ThemeToggle";
import Brand from "@/components/Brand";
import { requireMember } from "@/lib/auth";
import { categoryCounts } from "@/lib/queries";
import { signOut } from "@/app/actions/auth";
const site = process.env.NEXT_PUBLIC_SITE_NAME ?? "XV Videos";
export default async function Layout({ children }: { children: React.ReactNode }) {
  const me = await requireMember();
  const cats = await categoryCounts();
  return (<>
    <a href="#main" className="skip">Skip to content</a>
    <header className="top"><div className="wrap row">
      <Link href="/" className="logo"><Brand name={site} /></Link>
      <form action="/search" role="search" className="search">
        <label className="sr" htmlFor="q">Search videos</label>
        <input id="q" name="q" type="search" placeholder="Search videos, tags, channels" />
      </form>
      <ThemeToggle />
      <form action={signOut}><button className="linkbtn" title={me.email}>Sign out</button></form>
    </div></header>
    <MenuBar cats={cats} isAdmin={me.role === "admin"} />
    <main id="main" className="wrap main">{children}</main>
    <footer className="foot"><div className="wrap">
      <div className="cols">
        <div><strong>{site}</strong><p className="muted">Your private video collection.</p></div>
        <div><Link href="/">Home</Link> <Link href="/popular">Popular</Link> <Link href="/new">New</Link> <Link href="/tags">Tags</Link></div>
        <div className="muted">Signed in as {me.email}</div>
      </div>
      <p className="muted small">© {new Date().getFullYear()} {site}. Members only. Please do not share your login.</p>
    </div></footer>
  </>);
}