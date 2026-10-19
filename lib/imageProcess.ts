import "server-only";
import sharp from "sharp";
// 640x360 WebP, EXIF honoured, metadata stripped, shrunk until under 60 KB (quality floor 50).
export async function makeThumb(input: Buffer): Promise<Buffer> {
  let q = 82, out: Buffer;
  for (;;) {
    out = await sharp(input, { limitInputPixels: 50_000_000 }).rotate().resize(640, 360, { fit: "cover" }).webp({ quality: q }).toBuffer();
    if (out.length < 60 * 1024 || q <= 50) return out;
    q -= 8;
  }
}
