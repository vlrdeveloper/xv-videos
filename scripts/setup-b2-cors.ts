import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";
async function main() {
  const e = process.env;
  const id = e.B2_SETUP_KEY_ID || e.B2_KEY_ID, key = e.B2_SETUP_APPLICATION_KEY || e.B2_APPLICATION_KEY;
  if (!id || !key || !e.B2_BUCKET_NAME || !e.B2_ENDPOINT || !e.B2_REGION) { console.error("Fill the B2_ lines in .env.local first."); process.exit(1); }
  const origins = [...new Set(["http://localhost:3000", ...(e.SITE_ORIGINS ?? "").split(",").map(x => x.trim()).filter(Boolean)])];
  const c = new S3Client({ region: e.B2_REGION, endpoint: e.B2_ENDPOINT, forcePathStyle: true, credentials: { accessKeyId: id, secretAccessKey: key },
    requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
  try {
    await c.send(new PutBucketCorsCommand({ Bucket: e.B2_BUCKET_NAME, CORSConfiguration: { CORSRules: [{ AllowedOrigins: origins, AllowedMethods: ["GET", "HEAD", "PUT"], AllowedHeaders: ["*"], ExposeHeaders: ["ETag"], MaxAgeSeconds: 3600 }] } }));
    console.log("CORS rules saved:\n" + JSON.stringify((await c.send(new GetBucketCorsCommand({ Bucket: e.B2_BUCKET_NAME }))).CORSRules, null, 2));
  } catch (err) {
    const x = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
    if (x.name === "AccessDenied" || x.$metadata?.httpStatusCode === 403)
      console.error("Access denied. Your bucket key may not be allowed to change bucket settings.\nEither add B2_SETUP_KEY_ID and B2_SETUP_APPLICATION_KEY (a key with that permission) to .env.local, or set CORS in the Backblaze website (Bucket Settings > CORS Rules).");
    else console.error("Failed:", x.message);
    process.exit(1);
  }
}
main();
