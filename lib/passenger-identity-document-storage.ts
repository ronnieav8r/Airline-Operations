import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { PassengerIdentityDocumentStorageProvider } from "@prisma/client";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const LOCAL_STORAGE_ROOT = path.join(process.cwd(), ".codex-local", "passenger-identity-documents");
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export class PassengerIdentityDocumentStorageError extends Error {}

type StoredDocumentObject = {
  byteSize: number;
  checksumSha256: string;
  contentType: string;
  originalFilename: string | null;
  storageKey: string;
  storageProvider: PassengerIdentityDocumentStorageProvider;
};

type DocumentObject = {
  body: Buffer;
  contentType: string;
};

function activeStorageProvider(): PassengerIdentityDocumentStorageProvider {
  const configured = process.env.PASSENGER_ID_DOCUMENT_STORAGE?.toLowerCase();

  if (configured === "s3" || configured === "s3_compatible") {
    return PassengerIdentityDocumentStorageProvider.S3_COMPATIBLE;
  }

  if (process.env.NODE_ENV === "production") {
    throw new PassengerIdentityDocumentStorageError(
      "Passenger ID document storage must be configured for private S3-compatible storage in production.",
    );
  }

  return PassengerIdentityDocumentStorageProvider.LOCAL;
}

function fileExtension(contentType: string, filename: string | null): string {
  const explicit = filename ? path.extname(filename).toLowerCase().replace(/[^.\w-]/g, "") : "";

  if (explicit === ".jpg" || explicit === ".jpeg" || explicit === ".png" || explicit === ".webp") {
    return explicit;
  }

  if (contentType === "image/png") {
    return ".png";
  }
  if (contentType === "image/webp") {
    return ".webp";
  }
  if (contentType === "image/heic") {
    return ".heic";
  }
  if (contentType === "image/heif") {
    return ".heif";
  }

  return ".jpg";
}

function localPath(storageKey: string): string {
  const normalized = storageKey.replaceAll("\\", "/");

  if (normalized.includes("..")) {
    throw new PassengerIdentityDocumentStorageError("Stored passenger ID document key is invalid.");
  }

  return path.join(LOCAL_STORAGE_ROOT, normalized);
}

function s3Client() {
  const endpoint = process.env.PASSENGER_ID_DOCUMENT_S3_ENDPOINT;
  const region = process.env.PASSENGER_ID_DOCUMENT_S3_REGION ?? "us-east-1";
  const accessKeyId = process.env.PASSENGER_ID_DOCUMENT_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.PASSENGER_ID_DOCUMENT_S3_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new PassengerIdentityDocumentStorageError("Passenger ID S3 credentials are not configured.");
  }

  return new S3Client({
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    endpoint,
    forcePathStyle: process.env.PASSENGER_ID_DOCUMENT_S3_FORCE_PATH_STYLE === "true",
    region,
  });
}

function s3Bucket() {
  const bucket = process.env.PASSENGER_ID_DOCUMENT_S3_BUCKET;

  if (!bucket) {
    throw new PassengerIdentityDocumentStorageError("Passenger ID S3 bucket is not configured.");
  }

  return bucket;
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];

    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  if (body && typeof body === "object" && "transformToByteArray" in body) {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(bytes);
  }

  throw new PassengerIdentityDocumentStorageError("Stored passenger ID document could not be read.");
}

export async function storePassengerIdentityDocumentFile(
  passengerId: string,
  file: File,
): Promise<StoredDocumentObject> {
  if (file.size <= 0) {
    throw new PassengerIdentityDocumentStorageError("Choose an ID photo before saving.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new PassengerIdentityDocumentStorageError("ID photo must be 5 MB or smaller after compression.");
  }

  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    throw new PassengerIdentityDocumentStorageError("ID photo must be a JPEG, PNG, WebP, HEIC, or HEIF image.");
  }

  const body = Buffer.from(await file.arrayBuffer());
  const checksumSha256 = createHash("sha256").update(body).digest("hex");
  const storageProvider = activeStorageProvider();
  const originalFilename = file.name?.trim() || null;
  const storageKey = `${passengerId}/${randomUUID()}${fileExtension(file.type, originalFilename)}`;

  if (storageProvider === PassengerIdentityDocumentStorageProvider.LOCAL) {
    const target = localPath(storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body, { flag: "wx" });
  } else {
    await s3Client().send(
      new PutObjectCommand({
        Body: body,
        Bucket: s3Bucket(),
        ContentType: file.type,
        Key: storageKey,
        ServerSideEncryption: "AES256",
      }),
    );
  }

  return {
    byteSize: file.size,
    checksumSha256,
    contentType: file.type,
    originalFilename,
    storageKey,
    storageProvider,
  };
}

export async function readPassengerIdentityDocumentObject(
  storageProvider: PassengerIdentityDocumentStorageProvider,
  storageKey: string,
): Promise<DocumentObject> {
  if (storageProvider === PassengerIdentityDocumentStorageProvider.LOCAL) {
    return {
      body: await readFile(localPath(storageKey)),
      contentType: "application/octet-stream",
    };
  }

  const object = await s3Client().send(
    new GetObjectCommand({
      Bucket: s3Bucket(),
      Key: storageKey,
    }),
  );

  return {
    body: await streamToBuffer(object.Body),
    contentType: object.ContentType ?? "application/octet-stream",
  };
}

export async function deletePassengerIdentityDocumentObject(
  storageProvider: PassengerIdentityDocumentStorageProvider,
  storageKey: string,
) {
  if (storageProvider === PassengerIdentityDocumentStorageProvider.LOCAL) {
    await rm(localPath(storageKey), { force: true });
    return;
  }

  await s3Client().send(
    new DeleteObjectCommand({
      Bucket: s3Bucket(),
      Key: storageKey,
    }),
  );
}
