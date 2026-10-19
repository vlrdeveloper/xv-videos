"use client";
import { useActionState, useState } from "react";
import { signIn } from "@/app/actions/auth";
const Eye = ({ off }: { off: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </svg>
);
export default function LoginForm({ next }: { next: string }) {
  const [st, act, pending] = useActionState(signIn, {} as { error?: string });
  const [show, setShow] = useState(false);
  return (
    <form action={act} className="loginform">
      <h2 className="logintitle">Welcome back</h2>
      <p className="loginsub">Sign in to open the library.</p>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <label htmlFor="pw">Password</label>
      <div className="pwfield">
        <input id="pw" name="password" type={show ? "text" : "password"} autoComplete="current-password" required />
        <button type="button" className="eyebtn" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}><Eye off={show} /></button>
      </div>
      {st.error && <p role="alert" className="err">{st.error}</p>}
      <button className="loginbtn" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</button>
    </form>
  );
}