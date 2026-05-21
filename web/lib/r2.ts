import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const account = process.env.R2_ACCOUNT_ID!;

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${account}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET ?? "ads";
const PUBLIC_BASE = process.env.R2_PUBLIC_BASE;

export async function signPut(key: string, contentType: string) {
  return getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );
}

export async function signGet(key: string) {
  if (PUBLIC_BASE) return `${PUBLIC_BASE.replace(/\/$/, "")}/${key}`;
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    { expiresIn: 3600 },
  );
}
