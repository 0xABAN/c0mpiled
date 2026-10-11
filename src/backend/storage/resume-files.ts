import "server-only";

import { randomUUID } from "node:crypto";

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Resume files in the private S3 bucket:
 *
 *   resumes/{userId}/{uploadId}.pdf       the original PDF the student uploaded
 *   previews/{userId}/{setId}/{n}.png     its redacted pages (Contract 3), n starting at 1
 *
 * Every key starts with the owner's user id, so an upload id only resolves inside its owner's
 * folder. Locally the SDK uses your AWS CLI login; on Amplify it uses the app's compute role.
 */

function requireEnv(name: "APP_REGION" | "RESUME_BUCKET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See AGENTS.md for the env vars.`);
  return value;
}

const globalForS3 = globalThis as typeof globalThis & { rosterS3?: S3Client };
const s3 = (globalForS3.rosterS3 ??= new S3Client({ region: requireEnv("APP_REGION") }));
const bucket = requireEnv("RESUME_BUCKET");

/** How long a presigned download link works. */
const LINK_SECONDS = 5 * 60;

export function resumePdfKey(userId: string, uploadId: string): string {
  return `resumes/${userId}/${uploadId}.pdf`;
}

export async function putResumePdf(key: string, pdf: Uint8Array): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: pdf, ContentType: "application/pdf" }));
}

/** The stored PDF, or `null` if there's no object at `key`. */
export async function getResumePdf(key: string): Promise<Uint8Array | null> {
  try {
    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return await object.Body!.transformToByteArray();
  } catch (error) {
    if (error instanceof NoSuchKey) return null;
    throw error;
  }
}

/** Stores a set of redacted pages and returns their keys in page order. */
export async function putPreviewPages(userId: string, pages: Uint8Array[]): Promise<string[]> {
  const setId = randomUUID();
  const keys = pages.map((_, index) => `previews/${userId}/${setId}/${index + 1}.png`);

  await Promise.all(
    pages.map((png, index) =>
      s3.send(new PutObjectCommand({ Bucket: bucket, Key: keys[index], Body: png, ContentType: "image/png" })),
    ),
  );

  return keys;
}

/** Deletes objects; keys that don't exist are ignored by S3. */
export async function deleteFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  const result = await s3.send(
    new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }),
  );

  if (result.Errors?.length) {
    throw new Error(`Couldn't delete ${result.Errors.length} resume files: ${result.Errors[0].Message}`);
  }
}

/**
 * A short-lived link that serves one file straight from S3. With `downloadAs`, the browser
 * saves it under that file name instead of displaying it.
 */
export async function presignedFileUrl(key: string, { downloadAs }: { downloadAs?: string } = {}): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: downloadAs ? `attachment; filename="${downloadAs.replaceAll('"', "")}"` : undefined,
  });

  return getSignedUrl(s3, command, { expiresIn: LINK_SECONDS });
}
