// Asks Backblaze the same "may I upload?" question a browser asks. Prints no secrets.
import https from "node:https";
const e = process.env;
if (!e.B2_ENDPOINT || !e.B2_BUCKET_NAME) { console.error("Fill B2_ENDPOINT and B2_BUCKET_NAME in .env.local first."); process.exit(1); }
const host = new URL(e.B2_ENDPOINT).host;
function preflight(origin: string, method: string) {
  return new Promise<void>(done => {
    const r = https.request({ host, path: `/${e.B2_BUCKET_NAME}/videos/test.mp4?partNumber=1&uploadId=test`, method: "OPTIONS",
      headers: { Origin: origin, "Access-Control-Request-Method": method } }, resp => {
      console.log(`\n${method} from ${origin}: HTTP ${resp.statusCode}`);
      for (const k of ["access-control-allow-origin", "access-control-allow-methods", "access-control-allow-headers", "access-control-expose-headers"])
        console.log(`  ${k}: ${resp.headers[k] ?? "(missing)"}`);
      resp.resume(); resp.on("end", () => done());
    });
    r.on("error", err => { console.log("  request failed:", err.message); done(); });
    r.end();
  });
}
(async () => { console.log("Checking", host, "bucket", e.B2_BUCKET_NAME); await preflight("http://localhost:3000", "PUT"); await preflight("http://localhost:3000", "GET"); })();