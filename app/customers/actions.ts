"use server";

import { IdDocumentType, Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

class CustomerWorkflowError extends Error {}

function getRequiredText(formData: FormData, key: string, label: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CustomerWorkflowError(`${label} is required.`);
  }

  return value.trim();
}

function getOptionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function encodeError(error: unknown): string {
  if (error instanceof CustomerWorkflowError) {
    return encodeURIComponent(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return encodeURIComponent("That record already exists.");
  }

  throw error;
}

function parseDate(value: string | null, label: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new CustomerWorkflowError(`${label} must be a valid date.`);
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

  throw new CustomerWorkflowError("ID document type is invalid.");
}

async function getDefaultOperatorId() {
  const operator = await prisma.operator.findFirst({
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
    select: { id: true },
  });

  if (!operator) {
    throw new CustomerWorkflowError("No operator is available for customer records.");
  }

  return operator.id;
}

function revalidateCustomerPaths() {
  revalidatePath("/customers");
  revalidatePath("/flights");
  revalidatePath("/operations-control");
}

export async function createCustomerAction(formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const operatorId = await getDefaultOperatorId();

    await prisma.customer.create({
      data: {
        contactEmail: getOptionalText(formData, "contactEmail"),
        contactName: getOptionalText(formData, "contactName"),
        contactPhone: getOptionalText(formData, "contactPhone"),
        customerCode: getOptionalText(formData, "customerCode"),
        name: getRequiredText(formData, "name", "Customer name"),
        notes: getOptionalText(formData, "notes"),
        operatorId,
      },
    });
  } catch (error) {
    redirect(`/customers?error=${encodeError(error)}`);
  }

  revalidateCustomerPaths();
  redirect("/customers");
}

export async function updateCustomerAction(customerId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        contactEmail: getOptionalText(formData, "contactEmail"),
        contactName: getOptionalText(formData, "contactName"),
        contactPhone: getOptionalText(formData, "contactPhone"),
        customerCode: getOptionalText(formData, "customerCode"),
        isActive: formData.get("isActive") === "on",
        name: getRequiredText(formData, "name", "Customer name"),
        notes: getOptionalText(formData, "notes"),
      },
    });
  } catch (error) {
    redirect(`/customers?customer=${customerId}&error=${encodeError(error)}`);
  }

  revalidateCustomerPaths();
  redirect(`/customers?customer=${customerId}`);
}

function passengerData(formData: FormData) {
  return {
    dateOfBirth: parseDate(getOptionalText(formData, "dateOfBirth"), "Date of birth"),
    email: getOptionalText(formData, "email"),
    firstName: getRequiredText(formData, "firstName", "First name"),
    idDocumentExpiresAt: parseDate(
      getOptionalText(formData, "idDocumentExpiresAt"),
      "ID expiration",
    ),
    idDocumentNumber: getOptionalText(formData, "idDocumentNumber"),
    idDocumentType: parseIdDocumentType(getOptionalText(formData, "idDocumentType")),
    idIssuingCountry: getOptionalText(formData, "idIssuingCountry"),
    idIssuingState: getOptionalText(formData, "idIssuingState"),
    lastName: getRequiredText(formData, "lastName", "Last name"),
    middleName: getOptionalText(formData, "middleName"),
    notes: getOptionalText(formData, "notes"),
    phone: getOptionalText(formData, "phone"),
  };
}

export async function createPassengerAction(formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);
  const customerId = getOptionalText(formData, "customerId");
  let passengerId: string;

  try {
    const passenger = await prisma.passenger.create({
      data: passengerData(formData),
      select: { id: true },
    });
    passengerId = passenger.id;

    if (customerId) {
      await prisma.customerPassenger.upsert({
        where: {
          customerId_passengerId: {
            customerId,
            passengerId,
          },
        },
        create: {
          customerId,
          passengerId,
          relationship: getOptionalText(formData, "relationship"),
        },
        update: {
          relationship: getOptionalText(formData, "relationship"),
        },
      });
    }
  } catch (error) {
    redirect(`/customers?view=passengers&error=${encodeError(error)}`);
  }

  revalidateCustomerPaths();
  redirect(customerId ? `/customers?customer=${customerId}` : `/customers?view=passengers&passenger=${passengerId}`);
}

export async function updatePassengerAction(passengerId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    await prisma.passenger.update({
      where: { id: passengerId },
      data: passengerData(formData),
    });
  } catch (error) {
    redirect(`/customers?view=passengers&passenger=${passengerId}&error=${encodeError(error)}`);
  }

  revalidateCustomerPaths();
  redirect(`/customers?view=passengers&passenger=${passengerId}`);
}

export async function linkPassengerToCustomerAction(customerId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  try {
    const passengerId = getRequiredText(formData, "passengerId", "Passenger");

    await prisma.customerPassenger.upsert({
      where: {
        customerId_passengerId: {
          customerId,
          passengerId,
        },
      },
      create: {
        customerId,
        notes: getOptionalText(formData, "notes"),
        passengerId,
        relationship: getOptionalText(formData, "relationship"),
      },
      update: {
        notes: getOptionalText(formData, "notes"),
        relationship: getOptionalText(formData, "relationship"),
      },
    });
  } catch (error) {
    redirect(`/customers?customer=${customerId}&error=${encodeError(error)}`);
  }

  revalidateCustomerPaths();
  redirect(`/customers?customer=${customerId}`);
}

export async function unlinkPassengerFromCustomerAction(customerId: string, passengerId: string) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);

  await prisma.customerPassenger.delete({
    where: {
      customerId_passengerId: {
        customerId,
        passengerId,
      },
    },
  });

  revalidateCustomerPaths();
  redirect(`/customers?customer=${customerId}`);
}
