import "server-only";
import { S3Client, GetObjectCommand, ListObjectVersionsCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { need } from "@/lib/env";
let client: S3Client | undefined;
export function b2(): S3Client {
  // WHEN_REQUIRED is mandatory: recent AWS SDKs otherwise put a CRC32 of an empty body in presigned upload URLs.
  return (client ??= new S3Client({
    region: need("B2_REGION"), endpoint: need("B2_ENDPOINT"), forcePathStyle: true,
    credentials: { accessKeyId: need("B2_KEY_ID"), secretAccessKey: need("B2_APPLICATION_KEY") },
    requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
  }));
}
export const bucket = () => need("B2_BUCKET_NAME");
export const b2Configured = () => !!(process.env.B2_KEY_ID && process.env.B2_APPLICATION_KEY && process.env.B2_BUCKET_NAME);
export async function signedVideoUrl(key: string) {
  const cmd = new GetObjectCommand({ Bucket: bucket(), Key: key, ResponseContentType: key.endsWith(".webm") ? "video/webm" : "video/mp4" });
  return getSignedUrl(b2(), cmd, { expiresIn: Number(process.env.VIDEO_URL_TTL_SECONDS ?? 7200) });
}
// B2 keeps old versions; a plain delete only hides the file. Delete every version so space is really freed.
export async function deleteAllVersions(key: string) {
  try {
    let km: string | undefined, vm: string | undefined;
    do {
      const r = await b2().send(new ListObjectVersionsCommand({ Bucket: bucket(), Prefix: key, KeyMarker: km, VersionIdMarker: vm }));
      for (const v of [...(r.Versions ?? []), ...(r.DeleteMarkers ?? [])])
        if (v.Key === key) await b2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key, VersionId: v.VersionId }));
      km = r.IsTruncated ? r.NextKeyMarker : undefined; vm = r.IsTruncated ? r.NextVersionIdMarker : undefined;
    } while (km || vm);
  } catch (e) { console.error("B2 cleanup failed (continuing)", e); }
}
