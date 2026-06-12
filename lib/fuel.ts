import { AircraftFuelEventType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const DEFAULT_JET_A_DENSITY_LBS_PER_GALLON = "6.700";

export type FuelDisplayEvent = {
  eventType: AircraftFuelEventType;
  fuelChangeGallons: Prisma.Decimal | null;
  fuelChangeLbs: Prisma.Decimal | null;
  fuelDensityLbsPerGallon: Prisma.Decimal;
  fueledReady: boolean | null;
  fuelOnboardGallons: Prisma.Decimal;
  fuelOnboardLbs: Prisma.Decimal;
  recordedAt: Date;
};

export function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNonNegativeDecimalInput(
  value: FormDataEntryValue | null,
  label: string,
  options: { required?: boolean } = {},
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    if (options.required) {
      throw new Error(`${label} is required.`);
    }

    return null;
  }

  const parsed = Number(value.trim());

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }

  return parsed.toFixed(2);
}

export function parseFuelDensityInput(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Jet A density is required.");
  }

  const parsed = Number(value.trim());

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Jet A density must be greater than zero.");
  }

  if (parsed < 5 || parsed > 8) {
    throw new Error("Jet A density should be between 5.000 and 8.000 lb/gal.");
  }

  return parsed.toFixed(3);
}

export function gallonsFromPounds(pounds: string | number, density: string | number): string {
  const poundsNumber = Number(pounds);
  const densityNumber = Number(density);

  if (!Number.isFinite(poundsNumber) || !Number.isFinite(densityNumber) || densityNumber <= 0) {
    throw new Error("Fuel gallons could not be calculated from the supplied pounds and density.");
  }

  return (poundsNumber / densityNumber).toFixed(2);
}

export function formatFuelAmount(lbs: Prisma.Decimal | number | string | null | undefined, gallons?: Prisma.Decimal | number | string | null) {
  const lbsNumber = decimalToNumber(lbs);

  if (lbsNumber === null) {
    return "Unknown";
  }

  const gallonsNumber = decimalToNumber(gallons);
  const lbsLabel = `${Math.round(lbsNumber).toLocaleString("en-US")} lb`;

  if (gallonsNumber === null) {
    return lbsLabel;
  }

  return `${lbsLabel} / ${Math.round(gallonsNumber).toLocaleString("en-US")} gal approx`;
}

export function fuelReadyLabel(value: boolean | null | undefined) {
  if (value === true) {
    return "Ready Yes";
  }

  if (value === false) {
    return "Ready No";
  }

  return "Ready not set";
}

export function fuelEventLabel(eventType: AircraftFuelEventType) {
  const labels: Record<AircraftFuelEventType, string> = {
    CORRECTION: "Correction",
    DEFUEL: "Defuel",
    POSTFLIGHT_ONBOARD: "Postflight onboard",
    RELEASE_ONBOARD: "Release onboard",
    UPLIFT: "Uplift",
  };

  return labels[eventType];
}

export async function ensureOperatorFuelSetting(operatorId: string) {
  return prisma.operatorFuelSetting.upsert({
    where: { operatorId },
    create: {
      operatorId,
      defaultJetAFuelDensityLbsPerGallon: DEFAULT_JET_A_DENSITY_LBS_PER_GALLON,
    },
    update: {},
  });
}

export async function getDefaultOperatorFuelSetting(operatorId: string) {
  return ensureOperatorFuelSetting(operatorId);
}

export async function getDeploymentOperatorFuelSetting() {
  const operator = await prisma.operator.findFirst({
    orderBy: { code: "asc" },
    select: { id: true },
    where: { isActive: true },
  });

  if (!operator) {
    throw new Error("No active operator was found.");
  }

  return ensureOperatorFuelSetting(operator.id);
}

export async function getLatestAircraftFuelEvent(aircraftId: string) {
  return prisma.aircraftFuelEvent.findFirst({
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    where: { aircraftId },
  });
}

export async function getLatestFlightLegFuelEvent(flightLegId: string, eventType: AircraftFuelEventType) {
  return prisma.aircraftFuelEvent.findFirst({
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    where: {
      eventType,
      flightLegId,
    },
  });
}
