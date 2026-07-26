import { IdDocumentType, UserRole } from "@prisma/client";

import {
  deleteActivePassengerIdentityDocument,
  readActivePassengerIdentityDocument,
  replacePassengerIdentityDocument,
} from "@/lib/passenger-identity-documents";
import { prisma } from "@/lib/prisma";

const unique = `PASSENGER-ID-DOC-SMOKE-${Date.now()}`;

function tinyJpegFile() {
  const bytes = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
    0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c,
    0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d,
    0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34,
    0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4,
    0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x08, 0xff, 0xc4, 0x00, 0x14,
    0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3f, 0x00, 0x37, 0xff, 0xd9,
  ]);

  return new File([bytes], "smoke-id.jpg", { type: "image/jpeg" });
}

async function cleanup() {
  const passengers = await prisma.passenger.findMany({
    where: { notes: unique },
    select: {
      id: true,
      identityDocuments: {
        select: {
          deletedAt: true,
          id: true,
        },
      },
    },
  });

  for (const passenger of passengers) {
    await deleteActivePassengerIdentityDocument(passenger.id, null);
  }

  await prisma.passenger.deleteMany({ where: { notes: unique } });
  await prisma.user.deleteMany({ where: { email: `${unique.toLowerCase()}@aeroops.local` } });
}

async function main() {
  await cleanup();

  const actor = await prisma.user.create({
    data: {
      email: `${unique.toLowerCase()}@aeroops.local`,
      isActive: true,
      role: UserRole.OPS,
    },
  });
  const passenger = await prisma.passenger.create({
    data: {
      firstName: "Smoke",
      lastName: "Passenger",
      notes: unique,
    },
  });

  await replacePassengerIdentityDocument({
    actorId: actor.id,
    file: tinyJpegFile(),
    metadata: {
      documentType: IdDocumentType.PASSPORT,
      idDocumentExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
      idDocumentNumber: "SMOKE-ID-1",
      idIssuingCountry: "USA",
      idIssuingState: null,
    },
    passengerId: passenger.id,
  });

  const updated = await prisma.passenger.findUniqueOrThrow({
    where: { id: passenger.id },
    select: {
      idDocumentNumber: true,
      idDocumentType: true,
      identityDocuments: {
        where: { deletedAt: null },
        select: { id: true },
      },
    },
  });

  if (updated.idDocumentType !== IdDocumentType.PASSPORT || updated.idDocumentNumber !== "SMOKE-ID-1") {
    throw new Error("Passenger ID metadata was not updated.");
  }

  if (updated.identityDocuments.length !== 1) {
    throw new Error("Expected one active passenger identity document.");
  }

  const readable = await readActivePassengerIdentityDocument(passenger.id, actor.id);

  if (readable.body.length === 0 || readable.contentType !== "image/jpeg") {
    throw new Error("Stored passenger identity document was not readable.");
  }

  await deleteActivePassengerIdentityDocument(passenger.id, actor.id);

  const activeAfterDelete = await prisma.passengerIdentityDocument.count({
    where: {
      deletedAt: null,
      passengerId: passenger.id,
    },
  });

  if (activeAfterDelete !== 0) {
    throw new Error("Passenger identity document was not deleted.");
  }

  await cleanup();
  console.log("passenger identity document smoke: upload, read, metadata update, access log, and delete verified.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
