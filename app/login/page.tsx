import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import Brand from "@/components/Brand";
import LoginForm from "./LoginForm";
export const metadata = { title: "Sign in", robots: { index: false } };
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const a = await getAuth(); if (a?.active) redirect("/");
  const { next = "/" } = await searchParams;
  const site = process.env.NEXT_PUBLIC_SITE_NAME ?? "XV Videos";
  return (
    <div className="loginwrap">
      <section className="brandpanel">
        <p className="loginkicker">Members only</p>
        <h1 className="wordmark"><Brand name={site} stacked /></h1>
        <p className="logintag">Your private library. Sign in to browse.</p>
      </section>
      <section className="formpanel"><LoginForm next={next} /></section>
    </div>
  );
}