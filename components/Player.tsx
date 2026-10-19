"use client";
import { useEffect, useRef, useState } from "react";
export default function Player({ id, src, poster }: { id: string; src: string | null; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState(src);
  const [msg, setMsg] = useState("");
  const tries = useRef(0), resume = useRef<number | null>(null);
  const key = `pos:${id}`;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const v = ref.current, t = e.target as HTMLElement;
      if (!v || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === " " || k === "k") { if (t.tagName === "VIDEO" && k === " ") return; e.preventDefault(); v.paused ? v.play() : v.pause(); }
      else if (k === "j") v.currentTime = Math.max(0, v.currentTime - 10);
      else if (k === "l") v.currentTime += 10;
      else if (k === "m") v.muted = !v.muted;
      else if (k === "f") { document.fullscreenElement ? document.exitFullscreen() : v.requestFullscreen?.(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  async function refresh() {
    if (tries.current >= 2) { setMsg("The video could not be loaded. Refresh the page."); return; }
    tries.current++; resume.current = ref.current?.currentTime ?? null;
    try { const r = await fetch(`/api/videos/${id}/source`, { cache: "no-store" }); const j = await r.json(); if (j.url) setUrl(j.url); else setMsg("The video is not available."); }
    catch { setMsg("The video could not be loaded."); }
  }
  if (!url) return <div className="player" style={{ backgroundImage: `url("${poster}")` }}><div className="ph"><p>The video file is not connected yet. Finish the Backblaze setup and upload a video.</p></div></div>;
  return (
    <div className="player">
      <video ref={ref} src={url} poster={poster} controls playsInline preload="metadata" controlsList="nodownload"
        onLoadedMetadata={e => { let t = resume.current; if (t == null) { try { t = Number(localStorage.getItem(key)) || 0; } catch { t = 0; } } if (t) e.currentTarget.currentTime = t; resume.current = null; }}
        onTimeUpdate={e => { const t = Math.floor(e.currentTarget.currentTime); if (t % 5 === 0) { try { localStorage.setItem(key, String(t)); } catch {} } }}
        onError={refresh} />
      {msg && <div className="ph"><p>{msg}</p></div>}
    </div>
  );
}
