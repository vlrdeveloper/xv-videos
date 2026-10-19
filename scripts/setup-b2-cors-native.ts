// Sets the bucket CORS rule through Backblaze's own (native) API. Prints no secrets.
async function call(url: string, init: RequestInit) {
  const r = await fetch(url, init);
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new Error(`${r.status} ${String(j.code ?? "")} ${String(j.message ?? "")}`.trim());
  return j;
}
async function main() {
  const e = process.env;
  const id = e.B2_SETUP_KEY_ID, key = e.B2_SETUP_APPLICATION_KEY, name = e.B2_BUCKET_NAME;
  if (!id || !key || !name) { console.error("Fill B2_SETUP_KEY_ID, B2_SETUP_APPLICATION_KEY and B2_BUCKET_NAME in .env.local first."); process.exit(1); }
  const origins = [...new Set(["http://localhost:3000", ...(e.SITE_ORIGINS ?? "").split(",").map(x => x.trim()).filter(Boolean)])];
  const auth = await call("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", { headers: { Authorization: "Basic " + Buffer.from(`${id}:${key}`).toString("base64") } });
  const api = String(auth.apiUrl), headers = { Authorization: String(auth.authorizationToken), "Content-Type": "application/json" };
  const list = await call(`${api}/b2api/v2/b2_list_buckets`, { method: "POST", headers, body: JSON.stringify({ accountId: auth.accountId, bucketName: name }) });
  const bucket = (list.buckets as { bucketId: string }[] | undefined)?.[0];
  if (!bucket) { console.error(`Bucket "${name}" was not found for this key.`); process.exit(1); }
  const rule = { corsRuleName: "video-library-web", allowedOrigins: origins,
    allowedOperations: ["s3_put", "s3_get", "s3_head", "b2_upload_part", "b2_download_file_by_name", "b2_download_file_by_id"],
    allowedHeaders: ["*"], exposeHeaders: ["ETag"], maxAgeSeconds: 3600 };
  const out = await call(`${api}/b2api/v2/b2_update_bucket`, { method: "POST", headers, body: JSON.stringify({ accountId: auth.accountId, bucketId: bucket.bucketId, corsRules: [rule] }) });
  console.log("CORS rules saved:\n" + JSON.stringify(out.corsRules, null, 2));
}
main().catch(err => { console.error("Failed:", err.message); process.exit(1); });