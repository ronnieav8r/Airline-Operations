"use server";

import {
  IdDocumentType,
  PassengerAviationInterest,
  PassengerConversationPreference,
  PassengerTemperaturePreference,
  Prisma,
  UserRole,
} from "@prisma/client";
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

function errorMessage(error: unknown): string {
  if (error instanceof CustomerWorkflowError) {
    return error.message;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "That record already exists.";
  }

  throw error;
}

function getReturnTo(formData: FormData, fallback: string): string {
  const value = formData.get("returnTo");

  if (typeof value !== "string" || !value.startsWith("/customers")) {
    return fallback;
  }

  if (value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function customerWorkspaceHref(
  returnTo: string,
  updates: {
    customer?: string | null;
    error?: string | null;
    panel?: string | null;
    passenger?: string | null;
    view?: "customers" | "passengers" | null;
  },
) {
  const url = new URL(returnTo, "http://aeroops.local");

  if (url.pathname !== "/customers") {
    return "/customers";
  }

  if ("customer" in updates) {
    if (updates.customer) {
      url.searchParams.set("customer", updates.customer);
    } else {
      url.searchParams.delete("customer");
    }
  }
  if ("passenger" in updates) {
    if (updates.passenger) {
      url.searchParams.set("passenger", updates.passenger);
    } else {
      url.searchParams.delete("passenger");
    }
  }
  if ("panel" in updates) {
    if (updates.panel) {
      url.searchParams.set("panel", updates.panel);
    } else {
      url.searchParams.delete("panel");
    }
  }
  if ("view" in updates) {
    if (updates.view === "passengers") {
      url.searchParams.set("view", "passengers");
    } else {
      url.searchParams.delete("view");
    }
  }
  if ("error" in updates) {
    if (updates.error) {
      url.searchParams.set("error", updates.error);
    } else {
      url.searchParams.delete("error");
    }
  }

  const query = url.searchParams.toString();
  return query ? `/customers?${query}` : "/customers";
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

function parseTemperaturePreference(value: string | null): PassengerTemperaturePreference {
  if (
    value === PassengerTemperaturePreference.COOL ||
    value === PassengerTemperaturePreference.NEUTRAL ||
    value === PassengerTemperaturePreference.WARM
  ) {
    return value;
  }

  return PassengerTemperaturePreference.UNKNOWN;
}

function parseConversationPreference(value: string | null): PassengerConversationPreference {
  if (
    value === PassengerConversationPreference.ENGAGED ||
    value === PassengerConversationPreference.LIMITED ||
    value === PassengerConversationPreference.QUIET
  ) {
    return value;
  }

  return PassengerConversationPreference.UNKNOWN;
}

function parseAviationInterest(value: string | null): PassengerAviationInterest {
  if (
    value === PassengerAviationInterest.ENTHUSIAST ||
    value === PassengerAviationInterest.CASUAL ||
    value === PassengerAviationInterest.NOT_INTERESTED
  ) {
    return value;
  }

  return PassengerAviationInterest.UNKNOWN;
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
  const returnTo = getReturnTo(formData, "/customers?panel=new-customer");
  let customerId: string;

  try {
    const operatorId = await getDefaultOperatorId();

    const customer = await prisma.customer.create({
      data: {
        contactEmail: getOptionalText(formData, "contactEmail"),
        contactName: getOptionalText(formData, "contactName"),
        contactPhone: getOptionalText(formData, "contactPhone"),
        customerCode: getOptionalText(formData, "customerCode"),
        name: getRequiredText(formData, "name", "Customer name"),
        notes: getOptionalText(formData, "notes"),
        operatorId,
      },
      select: { id: true },
    });
    customerId = customer.id;
  } catch (error) {
    redirect(customerWorkspaceHref(returnTo, { error: errorMessage(error) }));
  }

  revalidateCustomerPaths();
  redirect(
    customerWorkspaceHref(returnTo, {
      customer: customerId,
      error: null,
      panel: null,
      passenger: null,
      view: null,
    }),
  );
}

export async function updateCustomerAction(customerId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);
  const returnTo = getReturnTo(formData, `/customers?customer=${customerId}`);

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
    redirect(customerWorkspaceHref(returnTo, { customer: customerId, error: errorMessage(error) }));
  }

  revalidateCustomerPaths();
  redirect(customerWorkspaceHref(returnTo, { customer: customerId, error: null, panel: null, passenger: null }));
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

function passengerServiceProfileData(formData: FormData) {
  return {
    aviationInterest: parseAviationInterest(getOptionalText(formData, "aviationInterest")),
    beveragePreferences: getOptionalText(formData, "beveragePreferences"),
    cabinComfortNotes: getOptionalText(formData, "cabinComfortNotes"),
    cateringAvoidances: getOptionalText(formData, "cateringAvoidances"),
    cateringPreferences: getOptionalText(formData, "cateringPreferences"),
    conversationPreference: parseConversationPreference(getOptionalText(formData, "conversationPreference")),
    flightDeckInteractionNotes: getOptionalText(formData, "flightDeckInteractionNotes"),
    serviceNotes: getOptionalText(formData, "serviceNotes"),
    temperaturePreference: parseTemperaturePreference(getOptionalText(formData, "temperaturePreference")),
  };
}

function hasPassengerServiceProfileData(data: ReturnType<typeof passengerServiceProfileData>) {
  return (
    data.aviationInterest !== PassengerAviationInterest.UNKNOWN ||
    data.beveragePreferences !== null ||
    data.cabinComfortNotes !== null ||
    data.cateringAvoidances !== null ||
    data.cateringPreferences !== null ||
    data.conversationPreference !== PassengerConversationPreference.UNKNOWN ||
    data.flightDeckInteractionNotes !== null ||
    data.serviceNotes !== null ||
    data.temperaturePreference !== PassengerTemperaturePreference.UNKNOWN
  );
}

async function syncPassengerServiceProfile(passengerId: string, formData: FormData) {
  const data = passengerServiceProfileData(formData);

  if (!hasPassengerServiceProfileData(data)) {
    await prisma.passengerServiceProfile.deleteMany({ where: { passengerId } });
    return;
  }

  await prisma.passengerServiceProfile.upsert({
    where: { passengerId },
    create: {
      passengerId,
      ...data,
    },
    update: data,
  });
}

export async function createPassengerAction(formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);
  const customerId = getOptionalText(formData, "customerId");
  const returnTo = getReturnTo(
    formData,
    customerId ? `/customers?customer=${customerId}` : "/customers?view=passengers&panel=new-passenger",
  );
  let passengerId: string;

  try {
    const passenger = await prisma.passenger.create({
      data: passengerData(formData),
      select: { id: true },
    });
    passengerId = passenger.id;
    await syncPassengerServiceProfile(passengerId, formData);

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
    redirect(customerWorkspaceHref(returnTo, { error: errorMessage(error) }));
  }

  revalidateCustomerPaths();
  redirect(
    customerWorkspaceHref(returnTo, {
      customer: customerId ?? null,
      error: null,
      panel: null,
      passenger: customerId ? null : passengerId,
      view: customerId ? null : "passengers",
    }),
  );
}

export async function updatePassengerAction(passengerId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);
  const returnTo = getReturnTo(formData, `/customers?view=passengers&passenger=${passengerId}`);

  try {
    await prisma.passenger.update({
      where: { id: passengerId },
      data: passengerData(formData),
    });
    await syncPassengerServiceProfile(passengerId, formData);
  } catch (error) {
    redirect(
      customerWorkspaceHref(returnTo, {
        error: errorMessage(error),
        passenger: passengerId,
        view: "passengers",
      }),
    );
  }

  revalidateCustomerPaths();
  redirect(
    customerWorkspaceHref(returnTo, {
      customer: null,
      error: null,
      panel: null,
      passenger: passengerId,
      view: "passengers",
    }),
  );
}

export async function linkPassengerToCustomerAction(customerId: string, formData: FormData) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);
  const returnTo = getReturnTo(formData, `/customers?customer=${customerId}`);

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
    redirect(customerWorkspaceHref(returnTo, { customer: customerId, error: errorMessage(error) }));
  }

  revalidateCustomerPaths();
  redirect(customerWorkspaceHref(returnTo, { customer: customerId, error: null, panel: null, passenger: null }));
}

export async function unlinkPassengerFromCustomerAction(
  customerId: string,
  passengerId: string,
  formData: FormData,
) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);
  const returnTo = getReturnTo(formData, `/customers?customer=${customerId}`);

  await prisma.customerPassenger.delete({
    where: {
      customerId_passengerId: {
        customerId,
        passengerId,
      },
    },
  });

  revalidateCustomerPaths();
  redirect(customerWorkspaceHref(returnTo, { customer: customerId, error: null, panel: null, passenger: null }));
}
