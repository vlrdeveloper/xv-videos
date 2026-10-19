"use client";
import { useEffect, useState } from "react";
export default function ThemeToggle() {
  const [t, setT] = useState<"light" | "dark">("dark");
  useEffect(() => { setT(document.documentElement.dataset.theme === "light" ? "light" : "dark"); }, []);
  function flip() {
    const n = t === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = n;
    try { localStorage.setItem("theme", n); } catch {}
    document.cookie = `theme=${n};path=/;max-age=31536000`;
    setT(n);
  }
  return <button className="iconbtn" onClick={flip} aria-label={t === "dark" ? "Switch to light mode" : "Switch to dark mode"}>{t === "dark" ? "☀" : "☾"}</button>;
}
