import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash } from "node:crypto";
import { HttpError } from "@/lib/admin-auth";

let client: S3Client | null = null;

export function r2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_URL,
  );
}

function r2() {
  if (!r2Configured()) throw new HttpError(503, "Cloudflare R2 is not configured (R2_* in .env)");
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return client;
}

// Every file gets a new key, so it can be cached forever and a re-record is never served stale.
export function audioKey(slug: string, minutes: number, seed: string | Buffer) {
  const hash = createHash("sha256").update(seed).update(String(Date.now())).digest("hex").slice(0, 10);
  return `audio/${slug}/${minutes}-${hash}.mp3`;
}

const IMAGE_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export type ImageType = keyof typeof IMAGE_EXT;

export function imageKey(slug: string, contentType: ImageType) {
  const hash = createHash("sha256").update(slug).update(String(Date.now())).digest("hex").slice(0, 10);
  return `images/${slug}/${hash}.${IMAGE_EXT[contentType]}`;
}

export const publicUrl = (key: string) => `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;

const IMMUTABLE = "public, max-age=31536000, immutable";

export async function putAudio(key: string, body: Buffer) {
  await r2().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: body,
      ContentType: "audio/mpeg",
      CacheControl: IMMUTABLE,
    }),
  );
  return publicUrl(key);
}

// Browser uploads (audio or images) straight to R2 (bucket CORS must allow PUT from the website origin).
export async function presignUpload(key: string, contentType: string) {
  const url = await getSignedUrl(
    r2(),
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ContentType: contentType,
      CacheControl: IMMUTABLE,
    }),
    { expiresIn: 600 },
  );
  return { uploadUrl: url, publicUrl: publicUrl(key), headers: { "Content-Type": contentType, "Cache-Control": IMMUTABLE } };
}
