import {
  IdDocumentType,
  PassengerIdentityDocumentAccessEvent,
  type PassengerIdentityDocument,
} from "@prisma/client";

import { assertCrewAssignedToFlightLeg } from "@/lib/crew-me-queries";
import { prisma } from "@/lib/prisma";
import {
  deletePassengerIdentityDocumentObject,
  readPassengerIdentityDocumentObject,
  storePassengerIdentityDocumentFile,
} from "@/lib/passenger-identity-document-storage";

export class PassengerIdentityDocumentError extends Error {}

type PassengerIdentityMetadata = {
  documentType: IdDocumentType | null;
  idDocumentExpiresAt: Date | null;
  idDocumentNumber: string | null;
  idIssuingCountry: string | null;
  idIssuingState: string | null;
};

function optionalText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDate(value: string | null, label: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new PassengerIdentityDocumentError(`${label} must be a valid date.`);
  }

  return parsed;
}

function parseIdDocumentType(value: string | null): IdDocumentType | null {
  if (!value) {
    return null;
  }

  if (
    value === IdDocumentType.PASSPORT ||
    value === IdDocumentType.DRIVERS_LICENSE ||
    value === IdDocumentType.STATE_ID ||
    value === IdDocumentType.MILITARY_ID ||
    value === IdDocumentType.OTHER
  ) {
    return value;
  }

  throw new PassengerIdentityDocumentError("ID document type is invalid.");
}

export function parsePassengerIdentityMetadata(formData: FormData): PassengerIdentityMetadata {
  return {
    documentType: parseIdDocumentType(optionalText(formData.get("idDocumentType"))),
    idDocumentExpiresAt: parseDate(optionalText(formData.get("idDocumentExpiresAt")), "ID expiration"),
    idDocumentNumber: optionalText(formData.get("idDocumentNumber")),
    idIssuingCountry: optionalText(formData.get("idIssuingCountry")),
    idIssuingState: optionalText(formData.get("idIssuingState")),
  };
}

export function getDocumentImageFile(formData: FormData): File {
  const file = formData.get("documentImage");

  if (!(file instanceof File)) {
    throw new PassengerIdentityDocumentError("Choose an ID photo before saving.");
  }

  return file;
}

export async function assertPassengerOnCrewFlight(userId: string, flightLegId: string, passengerId: string) {
  await assertCrewAssignedToFlightLeg(userId, flightLegId);

  const item = await prisma.manifestItem.findFirst({
    where: {
      passengerId,
      manifest: {
        flightLegId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!item) {
    throw new PassengerIdentityDocumentError("That passenger is not listed on this assigned flight.");
  }
}

export async function assertPassengerExists(passengerId: string) {
  const passenger = await prisma.passenger.findUnique({
    where: { id: passengerId },
    select: { id: true },
  });

  if (!passenger) {
    throw new PassengerIdentityDocumentError("Passenger was not found.");
  }
}

async function activeIdentityDocuments(passengerId: string) {
  return prisma.passengerIdentityDocument.findMany({
    where: {
      deletedAt: null,
      passengerId,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActivePassengerIdentityDocument(passengerId: string) {
  return prisma.passengerIdentityDocument.findFirst({
    where: {
      deletedAt: null,
      passengerId,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function replacePassengerIdentityDocument({
  actorId,
  file,
  metadata,
  passengerId,
}: {
  actorId: string;
  file: File;
  metadata: PassengerIdentityMetadata;
  passengerId: string;
}) {
  const existing = await activeIdentityDocuments(passengerId);
  const stored = await storePassengerIdentityDocumentFile(passengerId, file);
  let created: PassengerIdentityDocument;

  try {
    created = await prisma.$transaction(async (transaction) => {
      await transaction.passenger.update({
        where: { id: passengerId },
        data: {
          idDocumentExpiresAt: metadata.idDocumentExpiresAt,
          idDocumentNumber: metadata.idDocumentNumber,
          idDocumentType: metadata.documentType,
          idIssuingCountry: metadata.idIssuingCountry,
          idIssuingState: metadata.idIssuingState,
        },
      });

      if (existing.length > 0) {
        await transaction.passengerIdentityDocument.updateMany({
          where: {
            deletedAt: null,
            passengerId,
          },
          data: {
            deletedAt: new Date(),
            replacedById: actorId,
          },
        });
      }

      const document = await transaction.passengerIdentityDocument.create({
        data: {
          byteSize: stored.byteSize,
          checksumSha256: stored.checksumSha256,
          contentType: stored.contentType,
          documentType: metadata.documentType,
          originalFilename: stored.originalFilename,
          passengerId,
          storageKey: stored.storageKey,
          storageProvider: stored.storageProvider,
          uploadedById: actorId,
        },
      });

      await transaction.passengerIdentityDocumentAccessLog.create({
        data: {
          actorId,
          documentId: document.id,
          event:
            existing.length > 0
              ? PassengerIdentityDocumentAccessEvent.REPLACED
              : PassengerIdentityDocumentAccessEvent.UPLOADED,
          passengerId,
        },
      });

      return document;
    });
  } catch (error) {
    await deletePassengerIdentityDocumentObject(stored.storageProvider, stored.storageKey);
    throw error;
  }

  await Promise.allSettled(
    existing.map((document) =>
      deletePassengerIdentityDocumentObject(document.storageProvider, document.storageKey),
    ),
  );

  return created;
}

export async function readActivePassengerIdentityDocument(passengerId: string, actorId: string | null) {
  const document = await getActivePassengerIdentityDocument(passengerId);

  if (!document) {
    throw new PassengerIdentityDocumentError("No ID photo is on file for this passenger.");
  }

  const object = await readPassengerIdentityDocumentObject(document.storageProvider, document.storageKey);

  await prisma.passengerIdentityDocumentAccessLog.create({
    data: {
      actorId,
      documentId: document.id,
      event: PassengerIdentityDocumentAccessEvent.VIEWED,
      passengerId,
    },
  });

  return {
    body: object.body,
    contentType: document.contentType,
    document,
  };
}

export async function deleteActivePassengerIdentityDocument(passengerId: string, actorId: string | null) {
  const document = await getActivePassengerIdentityDocument(passengerId);

  if (!document) {
    return;
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.passengerIdentityDocument.update({
      where: { id: document.id },
      data: {
        deletedAt: new Date(),
        deletedById: actorId,
      },
    });

    await transaction.passengerIdentityDocumentAccessLog.create({
      data: {
        actorId,
        documentId: document.id,
        event: PassengerIdentityDocumentAccessEvent.DELETED,
        passengerId,
      },
    });
  });

  await deletePassengerIdentityDocumentObject(document.storageProvider, document.storageKey);
}
