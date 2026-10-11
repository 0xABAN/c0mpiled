import "server-only";

import { DeleteObjectCommand, HeadObjectCommand, NotFound, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Resume PDFs in the private S3 bucket. Keys are `resumes/{userId}/{uploadId}.pdf`, so an
 * upload id only ever resolves inside its owner's folder.
 *
 * Locally the SDK uses your AWS CLI login; on Amplify it uses the app's compute role.
 */

function requireEnv(name: "APP_REGION" | "RESUME_BUCKET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See AGENTS.md for the env vars.`);
  return value;
}

const globalForS3 = globalThis as typeof globalThis & { rosterS3?: S3Client };
const s3 = (globalForS3.rosterS3 ??= new S3Client({ region: requireEnv("APP_REGION") }));
const bucket = requireEnv("RESUME_BUCKET");

export function resumePdfKey(userId: string, uploadId: string): string {
  return `resumes/${userId}/${uploadId}.pdf`;
}

export async function putResumePdf(key: string, pdf: Uint8Array): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: pdf,
      ContentType: "application/pdf",
    }),
  );
}

export async function resumePdfExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error instanceof NotFound) return false;
    throw error;
  }
}

export async function deleteResumePdf(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
