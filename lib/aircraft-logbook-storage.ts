import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { AircraftLogbookAttachmentStorageProvider } from "@prisma/client";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const LOCAL_STORAGE_ROOT = path.join(process.cwd(), ".codex-local", "aircraft-logbook-attachments");
const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "text/plain",
]);

export class AircraftLogbookStorageError extends Error {}

type StoredAttachmentObject = {
  byteSize: number;
  checksumSha256: string;
  contentType: string;
  originalFilename: string | null;
  storageKey: string;
  storageProvider: AircraftLogbookAttachmentStorageProvider;
};

type AttachmentObject = {
  body: Buffer;
  contentType: string;
};

function activeStorageProvider(): AircraftLogbookAttachmentStorageProvider {
  const configured = process.env.AIRCRAFT_LOGBOOK_STORAGE?.toLowerCase();

  if (configured === "s3" || configured === "s3_compatible") {
    return AircraftLogbookAttachmentStorageProvider.S3_COMPATIBLE;
  }

  if (process.env.NODE_ENV === "production") {
    throw new AircraftLogbookStorageError(
      "Aircraft logbook attachment storage must be configured for private S3-compatible storage in production.",
    );
  }

  return AircraftLogbookAttachmentStorageProvider.LOCAL;
}

function fileExtension(contentType: string, filename: string | null): string {
  const explicit = filename ? path.extname(filename).toLowerCase().replace(/[^.\w-]/g, "") : "";

  if (explicit && explicit.length <= 12) {
    return explicit;
  }

  if (contentType === "application/pdf") {
    return ".pdf";
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
  if (contentType === "text/plain") {
    return ".txt";
  }

  return ".jpg";
}

function localPath(storageKey: string): string {
  const normalized = storageKey.replaceAll("\\", "/");

  if (normalized.includes("..")) {
    throw new AircraftLogbookStorageError("Stored aircraft logbook attachment key is invalid.");
  }

  return path.join(LOCAL_STORAGE_ROOT, normalized);
}

function s3Client() {
  const endpoint = process.env.AIRCRAFT_LOGBOOK_S3_ENDPOINT;
  const region = process.env.AIRCRAFT_LOGBOOK_S3_REGION ?? "us-east-1";
  const accessKeyId = process.env.AIRCRAFT_LOGBOOK_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AIRCRAFT_LOGBOOK_S3_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new AircraftLogbookStorageError("Aircraft logbook S3 credentials are not configured.");
  }

  return new S3Client({
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    endpoint,
    forcePathStyle: process.env.AIRCRAFT_LOGBOOK_S3_FORCE_PATH_STYLE === "true",
    region,
  });
}

function s3Bucket() {
  const bucket = process.env.AIRCRAFT_LOGBOOK_S3_BUCKET;

  if (!bucket) {
    throw new AircraftLogbookStorageError("Aircraft logbook S3 bucket is not configured.");
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

  throw new AircraftLogbookStorageError("Stored aircraft logbook attachment could not be read.");
}

export async function storeAircraftLogbookAttachmentFile({
  aircraftId,
  entryId,
  file,
}: {
  aircraftId: string;
  entryId: string;
  file: File;
}): Promise<StoredAttachmentObject> {
  if (file.size <= 0) {
    throw new AircraftLogbookStorageError("Choose a logbook attachment before saving.");
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new AircraftLogbookStorageError("Logbook attachments must be 10 MB or smaller.");
  }

  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    throw new AircraftLogbookStorageError("Logbook attachment must be an image, PDF, or plain-text file.");
  }

  const body = Buffer.from(await file.arrayBuffer());
  const checksumSha256 = createHash("sha256").update(body).digest("hex");
  const storageProvider = activeStorageProvider();
  const originalFilename = file.name?.trim() || null;
  const storageKey = `${aircraftId}/${entryId}/${randomUUID()}${fileExtension(file.type, originalFilename)}`;

  if (storageProvider === AircraftLogbookAttachmentStorageProvider.LOCAL) {
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

export async function readAircraftLogbookAttachmentObject(
  storageProvider: AircraftLogbookAttachmentStorageProvider,
  storageKey: string,
): Promise<AttachmentObject> {
  if (storageProvider === AircraftLogbookAttachmentStorageProvider.LOCAL) {
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

export async function deleteAircraftLogbookAttachmentObject(
  storageProvider: AircraftLogbookAttachmentStorageProvider,
  storageKey: string,
) {
  if (storageProvider === AircraftLogbookAttachmentStorageProvider.LOCAL) {
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
