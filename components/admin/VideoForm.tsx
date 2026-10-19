"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveVideo } from "@/app/actions/videos";
import { uploadVideoFile, discardUpload, type Ctl } from "@/lib/uploader";
import { normalizeTags, cleanTag, tagValid } from "@/lib/tags";
import { thumbUrl } from "@/lib/format";

export type Initial = { id: string; expected: string; title: string; channel_name: string; description: string; tags: string[]; category_ids: string[];
  is_popular: boolean; video_key: string; video_bytes: number | null; duration_seconds: number | null; thumbnail_key: string };
type Cat = { id: string; name: string };
type B2File = { key: string; size: number; modified?: string };
const MiB = 1048576;
const size = (b: number) => (b >= 1024 * MiB ? (b / 1024 / MiB).toFixed(2) + " GB" : (b / MiB).toFixed(1) + " MB");
const clock = (s: number) => (isFinite(s) ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : "...");

async function toJpeg(src: ImageBitmapSource & { width?: number }, maxSide = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(src as Blob);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("Image failed"))), "image/jpeg", 0.88));
}

export default function VideoForm({ initial, categories, allTags }: { initial?: Initial; categories: Cat[]; allTags: string[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [channel, setChannel] = useState(initial?.channel_name ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagText, setTagText] = useState(""); const [tagErr, setTagErr] = useState("");
  const [cats, setCats] = useState<Set<string>>(new Set(initial?.category_ids ?? []));
  const [catFilter, setCatFilter] = useState("");
  const [popular, setPopular] = useState(initial?.is_popular ?? false);
  const [mode, setMode] = useState<"keep" | "upload" | "existing">(initial ? "keep" : "upload");
  const [file, setFile] = useState<File | null>(null); const [vurl, setVurl] = useState("");
  const [files, setFiles] = useState<B2File[] | null>(null); const [sel, setSel] = useState<B2File | null>(null);
  const [duration, setDuration] = useState(initial?.duration_seconds ? String(initial.duration_seconds) : "");
  const [tmode, setTmode] = useState<"capture" | "upload">("upload");
  const [thumb, setThumb] = useState<Blob | null>(null); const [thumbPrev, setThumbPrev] = useState("");
  const [vdur, setVdur] = useState(0); const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false); const [step, setStep] = useState(""); const [error, setError] = useState("");
  const [prog, setProg] = useState({ sent: 0, total: 0, speed: 0 }); const [paused, setPaused] = useState(false);
  const ctl = useRef<Ctl>({ paused: false, cancelled: false, xhrs: new Set() });
  const vref = useRef<HTMLVideoElement>(null), t0 = useRef(0);

  useEffect(() => { if (!file) { setVurl(""); return; } const u = URL.createObjectURL(file); setVurl(u); return () => URL.revokeObjectURL(u); }, [file]);
  useEffect(() => { if (thumb) { const u = URL.createObjectURL(thumb); setThumbPrev(u); return () => URL.revokeObjectURL(u); } setThumbPrev(""); }, [thumb]);
  useEffect(() => {
    if (mode !== "existing" || files) return;
    fetch("/api/admin/b2-files").then(r => r.json()).then(j => setFiles(j.files ?? [])).catch(() => setFiles([]));
  }, [mode, files]);
  useEffect(() => {
    if (!busy) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h);
  }, [busy]);

  function addTag(raw = tagText) {
    const t = cleanTag(raw); if (!t) return;
    if (!tagValid(t)) return setTagErr("Use 2 to 30 letters, numbers, spaces or hyphens.");
    if (tags.includes(t)) return setTagErr("That tag is already added.");
    if (tags.length >= 10) return setTagErr("Maximum 10 tags.");
    setTags([...tags, t]); setTagText(""); setTagErr("");
  }
  function useFrame() {
    const v = vref.current; if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas"); c.width = 640; c.height = 360;
    const s = Math.max(640 / v.videoWidth, 360 / v.videoHeight), w = v.videoWidth * s, h = v.videoHeight * s;
    c.getContext("2d")!.drawImage(v, (640 - w) / 2, (360 - h) / 2, w, h);
    c.toBlob(b => b && setThumb(b), "image/jpeg", 0.9);
  }
  const tagsOk = tags.length >= 5 && tags.length <= 10;
  const canSubmit = !busy && tagsOk && title.trim() && channel.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!initial && !thumb) return setError("Add a thumbnail (capture a frame or upload an image).");
    if (mode === "upload" && !file) return setError("Choose a video file.");
    if (mode === "existing" && !sel) return setError("Choose a file from Backblaze.");
    let key = initial?.video_key ?? "", bytes = initial?.video_bytes ?? null, newKey: string | null = null;
    setBusy(true);
    try {
      if (mode === "upload" && file) {
        setStep("Uploading video..."); ctl.current = { paused: false, cancelled: false, xhrs: new Set() }; setPaused(false); t0.current = Date.now();
        const r = await uploadVideoFile(file, ctl.current, sent => setProg({ sent, total: file.size, speed: sent / Math.max(1, (Date.now() - t0.current) / 1000) }));
        key = r.key; bytes = r.bytes; newKey = r.key;
      } else if (mode === "existing" && sel) { key = sel.key; bytes = sel.size; }
      let thumbnail_key = initial?.thumbnail_key ?? "";
      if (thumb) {
        setStep("Compressing thumbnail...");
        const fd = new FormData(); fd.append("file", thumb, "thumb.jpg");
        const r = await fetch("/api/uploads/thumbnail", { method: "POST", body: fd }); const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Thumbnail failed.");
        thumbnail_key = j.key;
      }
      setStep("Saving...");
      const res = await saveVideo({ id: initial?.id, expected: initial?.expected, title, channel_name: channel, description: desc, tags: normalizeTags(tags),
        category_ids: [...cats], is_popular: popular, video_key: key, video_bytes: bytes, duration_seconds: duration ? Math.round(Number(duration)) : null, thumbnail_key });
      if ("error" in res) { if (newKey) await discardUpload(newKey); throw new Error(res.error); }
      router.push("/admin/videos?ok=" + encodeURIComponent("Video saved.")); router.refresh();
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      setError(m === "cancelled" ? "Upload cancelled." : m || "Something went wrong.");
    } finally { setBusy(false); setStep(""); }
  }
  const pct = prog.total ? Math.round((prog.sent / prog.total) * 100) : 0;
  const shown = categories.filter(c => c.name.toLowerCase().includes(catFilter.toLowerCase()));

  return (
    <form onSubmit={submit} className="af">
      <div className="field"><label htmlFor="t">Title</label><input id="t" value={title} maxLength={120} onChange={e => setTitle(e.target.value)} required /></div>
      <div className="field"><label htmlFor="ch">Channel name</label><input id="ch" value={channel} maxLength={60} onChange={e => setChannel(e.target.value)} required /></div>
      <div className="field"><label htmlFor="d">Description <span className="muted">({desc.length}/2000)</span></label><textarea id="d" rows={4} maxLength={2000} value={desc} onChange={e => setDesc(e.target.value)} /></div>

      <fieldset className="field"><legend>Categories <span className="muted">({cats.size} selected, optional)</span></legend>
        {categories.length > 8 && <input placeholder="Filter categories..." value={catFilter} onChange={e => setCatFilter(e.target.value)} aria-label="Filter categories" />}
        <div className="chips">{shown.map(c => <label key={c.id} className={"pick" + (cats.has(c.id) ? " on" : "")}>
          <input type="checkbox" checked={cats.has(c.id)} onChange={() => { const n = new Set(cats); n.has(c.id) ? n.delete(c.id) : n.add(c.id); setCats(n); }} />{c.name}</label>)}
          {!categories.length && <span className="muted">No categories yet. Create some under Categories.</span>}</div>
      </fieldset>

      <div className="field"><label htmlFor="tg">Tags <span className={tagsOk ? "good" : "bad"}>({tags.length} of 10, minimum 5)</span></label>
        <div className="chips">{tags.map(t => <span key={t} className="chip">{t} <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} aria-label={`Remove ${t}`}>×</button></span>)}</div>
        <input id="tg" list="taglist" value={tagText} placeholder="Type a tag, press Enter" onChange={e => setTagText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }} onBlur={() => tagText && addTag()} />
        <datalist id="taglist">{allTags.map(t => <option key={t} value={t} />)}</datalist>
        {tagErr && <p className="bad" role="alert">{tagErr}</p>}
      </div>

      <fieldset className="field"><legend>Video file</legend>
        <div className="seg">{(initial ? (["keep", "upload", "existing"] as const) : (["upload", "existing"] as const)).map(m =>
          <button type="button" key={m} aria-pressed={mode === m} onClick={() => setMode(m)} disabled={busy}>{m === "keep" ? "Keep current file" : m === "upload" ? "Upload new video" : "Choose existing file in Backblaze"}</button>)}</div>
        {mode === "upload" && <>
          <input type="file" accept="video/mp4,video/webm" disabled={busy} onChange={e => { setFile(e.target.files?.[0] ?? null); setThumb(null); }} />
          <p className="muted small">Use MP4 (H.264 video + AAC audio) for playback everywhere. Compress first to save free storage.{file && ` Selected: ${size(file.size)}.`}</p></>}
        {mode === "existing" && (files === null ? <p className="muted">Loading files...</p> : !files.length ? <p className="muted">No unused files found in your bucket.</p> :
          <select value={sel?.key ?? ""} onChange={e => setSel(files.find(f => f.key === e.target.value) ?? null)}><option value="">Choose a file...</option>
            {files.map(f => <option key={f.key} value={f.key}>{f.key.slice(7, 15)}... ({size(f.size)})</option>)}</select>)}
        <div className="field"><label htmlFor="du">Duration in seconds</label><input id="du" type="number" min={0} value={duration} onChange={e => setDuration(e.target.value)} /></div>
      </fieldset>

      <fieldset className="field"><legend>Thumbnail</legend>
        <div className="seg">
          <button type="button" aria-pressed={tmode === "capture"} onClick={() => setTmode("capture")} disabled={!file}>Capture from video</button>
          <button type="button" aria-pressed={tmode === "upload"} onClick={() => setTmode("upload")}>Upload image</button></div>
        {tmode === "capture" && file && <div>
          <video ref={vref} src={vurl} muted preload="auto" className="capvid" onLoadedMetadata={e => { setVdur(e.currentTarget.duration); if (!duration) setDuration(String(Math.round(e.currentTarget.duration))); }} />
          <input type="range" min={0} max={vdur || 1} step={0.1} value={at} aria-label="Scrub to a frame" onChange={e => { setAt(Number(e.target.value)); if (vref.current) vref.current.currentTime = Number(e.target.value); }} />
          <button type="button" className="abtn sec" onClick={useFrame}>Use this frame</button></div>}
        {tmode === "upload" && <input type="file" accept="image/jpeg,image/png,image/webp" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { setThumb(await toJpeg(f)); setError(""); } catch { setError("That image could not be read."); } }} />}
        <div className="prev16">{thumbPrev || initial ? <img src={thumbPrev || thumbUrl(initial!.thumbnail_key)} alt="Thumbnail preview" /> : <span className="muted">No thumbnail yet</span>}</div>
      </fieldset>

      <label className="pick"><input type="checkbox" checked={popular} onChange={e => setPopular(e.target.checked)} /> Show in Popular</label>

      {busy && step.startsWith("Uploading") && <div aria-live="polite">
        <div className="bar"><span style={{ width: pct + "%" }} /></div>
        <p className="small">{pct}% · {size(prog.sent)} of {size(prog.total)} · {(prog.speed / MiB).toFixed(1)} MB/s · {clock((prog.total - prog.sent) / Math.max(1, prog.speed))} left</p>
        <button type="button" className="abtn sec" onClick={() => { ctl.current.paused = !ctl.current.paused; setPaused(ctl.current.paused); }}>{paused ? "Resume" : "Pause"}</button>{" "}
        <button type="button" className="abtn danger" onClick={() => { ctl.current.cancelled = true; ctl.current.xhrs.forEach(x => x.abort()); }}>Cancel</button></div>}
      {error && <p role="alert" className="flash bad">{error}</p>}
      <div className="row2"><button className="abtn" disabled={!canSubmit}>{busy ? step || "Working..." : initial ? "Save changes" : "Create video"}</button>
        <button type="button" className="abtn sec" disabled={busy} onClick={() => router.push("/admin/videos")}>Cancel</button></div>
    </form>
  );
}
