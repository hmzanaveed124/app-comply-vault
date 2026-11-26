/**
 * CV-TR-01 — Object Lock storage for sealed audit packs.
 * Working media stays in S3_BUCKET_NAME (R2). Sealed packs use SEALED_S3_BUCKET_NAME.
 */

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "~/env";
import {
  resolveSealedObjectLockMode,
  type ObjectLockRetentionMode,
} from "~/server/seal/object-lock-mode";

function getSealedS3Client(): S3Client {
  if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error(
      "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY environment variables are required",
    );
  }

  const isR2Endpoint = !!env.S3_ENDPOINT?.includes("r2.cloudflarestorage.com");

  return new S3Client({
    region: env.S3_REGION || "auto",
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: isR2Endpoint,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}

export function sealedObjectKey(packHash: string): string {
  return `seals/${packHash}.zip`;
}

export function sealedStorageUri(packHash: string): string {
  const bucket = env.SEALED_S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error("SEALED_S3_BUCKET_NAME environment variable is not set");
  }
  return `s3://${bucket}/${sealedObjectKey(packHash)}`;
}

export type PutSealedObjectArgs = {
  packHash: string;
  body: Buffer;
  retainUntil: Date;
  workspaceId: string;
  meetingId: string;
  sealId: string;
};

export type PutSealedObjectResult = {
  storageUri: string;
  objectKey: string;
  retentionMode: ObjectLockRetentionMode;
};

/**
 * Content-addressed PUT with Object Lock RetainUntilDate.
 * Idempotent: same key + same bytes on retry.
 */
export async function putSealedObject(
  args: PutSealedObjectArgs,
): Promise<PutSealedObjectResult> {
  const bucket = env.SEALED_S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error("SEALED_S3_BUCKET_NAME environment variable is not set");
  }

  const retentionMode = resolveSealedObjectLockMode();
  const objectKey = sealedObjectKey(args.packHash);
  const storageUri = `s3://${bucket}/${objectKey}`;
  const client = getSealedS3Client();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: args.body,
    ContentType: "application/zip",
    ObjectLockMode: retentionMode,
    ObjectLockRetainUntilDate: args.retainUntil,
    Metadata: {
      workspaceId: args.workspaceId,
      meetingId: args.meetingId,
      sealId: args.sealId,
      packHash: args.packHash,
    },
  });

  await client.send(command);

  return { storageUri, objectKey, retentionMode };
}

/**
 * Read sealed pack bytes (export path for FINALIZED meetings).
 */
export async function getSealedObject(packHash: string): Promise<Buffer> {
  const bucket = env.SEALED_S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error("SEALED_S3_BUCKET_NAME environment variable is not set");
  }

  const client = getSealedS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: sealedObjectKey(packHash),
    }),
  );

  if (!response.Body) {
    throw new Error("Sealed object body is empty");
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Attempt delete before expiry — must fail under Object Lock.
 * Used by tests / ops probes; never call from product finalize paths.
 */
export async function tryDeleteSealedObject(
  _packHash: string,
): Promise<{ ok: boolean; error?: string }> {
  return {
    ok: false,
    error:
      "Sealed-record deletion probes are disabled in the application. Storage retention must be verified through the authorised storage administration process.",
  };
}
