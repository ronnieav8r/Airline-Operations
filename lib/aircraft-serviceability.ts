import {
  AircraftStatus,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceComplianceStatus,
  MaintenanceEventStatus,
} from "@prisma/client";

export type AircraftServiceabilityState =
  | "SERVICEABLE"
  | "NOT_SERVICEABLE"
  | "RTS_REQUIRED"
  | "DEFERRED_WITH_LIMITATIONS"
  | "DEFERRAL_EXPIRED"
  | "IN_MAINTENANCE"
  | "AOG";

export type AircraftServiceabilityTone = "green" | "amber" | "rose" | "zinc";

export type ServiceabilityDiscrepancy = {
  id?: string;
  status: DiscrepancyStatus;
  title?: string | null;
  discrepancyNumber?: string | null;
};

export type ServiceabilityDeferral = {
  id?: string;
  status: DeferralStatus;
  dueAt?: Date | null;
  operatingLimitations?: string | null;
  requiredProcedures?: string | null;
  discrepancy?: {
    title?: string | null;
  } | null;
};

export type ServiceabilityMaintenanceEvent = {
  id?: string;
  status: MaintenanceEventStatus;
  returnToServiceAt?: Date | null;
};

export type ServiceabilityMaintenanceComplianceState = {
  id?: string;
  status: MaintenanceComplianceStatus;
  task?: {
    title?: string | null;
    requiredForServiceability?: boolean | null;
  } | null;
};

export type AircraftServiceabilityInput = {
  status: AircraftStatus;
  configurations?: Array<unknown>;
  discrepancies?: ServiceabilityDiscrepancy[];
  deferrals?: ServiceabilityDeferral[];
  maintenanceEvents?: ServiceabilityMaintenanceEvent[];
  maintenanceComplianceStates?: ServiceabilityMaintenanceComplianceState[];
};

export type AircraftServiceabilityResult = {
  state: AircraftServiceabilityState;
  label: string;
  message: string;
  ready: boolean;
  blocksRelease: boolean;
  tone: AircraftServiceabilityTone;
  openDiscrepancyCount: number;
  correctedPendingRtsCount: number;
  activeDeferralCount: number;
  expiredDeferralCount: number;
  limitation: string | null;
};

function firstLimitation(deferrals: ServiceabilityDeferral[]): string | null {
  for (const deferral of deferrals) {
    const limitation = deferral.operatingLimitations ?? deferral.requiredProcedures;

    if (limitation) {
      return limitation;
    }
  }

  return null;
}

export function evaluateAircraftServiceability(
  aircraft: AircraftServiceabilityInput | null | undefined,
  now = new Date(),
): AircraftServiceabilityResult {
  if (!aircraft) {
    return {
      state: "NOT_SERVICEABLE",
      label: "Not serviceable",
      message: "No aircraft is assigned.",
      ready: false,
      blocksRelease: true,
      tone: "rose",
      openDiscrepancyCount: 0,
      correctedPendingRtsCount: 0,
      activeDeferralCount: 0,
      expiredDeferralCount: 0,
      limitation: null,
    };
  }

  const discrepancies = aircraft.discrepancies ?? [];
  const deferrals = aircraft.deferrals ?? [];
  const activeDeferrals = deferrals.filter((item) => item.status === DeferralStatus.ACTIVE);
  const expiredDeferrals = activeDeferrals.filter((item) => item.dueAt && item.dueAt <= now);
  const openDiscrepancies = discrepancies.filter((item) => item.status === DiscrepancyStatus.OPEN);
  const correctedPendingRts = discrepancies.filter(
    (item) => item.status === DiscrepancyStatus.CORRECTED_PENDING_RTS,
  );
  const activeDeferredDiscrepancies = discrepancies.filter(
    (item) => item.status === DiscrepancyStatus.DEFERRED,
  );
  const overdueRequiredMaintenance = (aircraft.maintenanceComplianceStates ?? []).filter(
    (item) =>
      item.status === MaintenanceComplianceStatus.OVERDUE &&
      item.task?.requiredForServiceability !== false,
  );
  const hasActiveConfiguration = !aircraft.configurations || aircraft.configurations.length > 0;

  if (aircraft.status === AircraftStatus.OUT_OF_SERVICE) {
    return {
      state: "AOG",
      label: "AOG",
      message: "Aircraft is marked out of service.",
      ready: false,
      blocksRelease: true,
      tone: "rose",
      openDiscrepancyCount: openDiscrepancies.length,
      correctedPendingRtsCount: correctedPendingRts.length,
      activeDeferralCount: activeDeferrals.length,
      expiredDeferralCount: expiredDeferrals.length,
      limitation: firstLimitation(activeDeferrals),
    };
  }

  if (aircraft.status === AircraftStatus.IN_MAINTENANCE) {
    return {
      state: "IN_MAINTENANCE",
      label: "In maintenance",
      message: "Aircraft is currently marked in maintenance.",
      ready: false,
      blocksRelease: true,
      tone: "rose",
      openDiscrepancyCount: openDiscrepancies.length,
      correctedPendingRtsCount: correctedPendingRts.length,
      activeDeferralCount: activeDeferrals.length,
      expiredDeferralCount: expiredDeferrals.length,
      limitation: firstLimitation(activeDeferrals),
    };
  }

  if (expiredDeferrals.length > 0) {
    return {
      state: "DEFERRAL_EXPIRED",
      label: "Deferral expired",
      message: `${expiredDeferrals.length} active deferral${expiredDeferrals.length === 1 ? "" : "s"} expired.`,
      ready: false,
      blocksRelease: true,
      tone: "rose",
      openDiscrepancyCount: openDiscrepancies.length,
      correctedPendingRtsCount: correctedPendingRts.length,
      activeDeferralCount: activeDeferrals.length,
      expiredDeferralCount: expiredDeferrals.length,
      limitation: firstLimitation(expiredDeferrals),
    };
  }

  if (correctedPendingRts.length > 0) {
    return {
      state: "RTS_REQUIRED",
      label: "RTS required",
      message: `${correctedPendingRts.length} corrected write-up${correctedPendingRts.length === 1 ? "" : "s"} waiting on return to service.`,
      ready: false,
      blocksRelease: true,
      tone: "amber",
      openDiscrepancyCount: openDiscrepancies.length,
      correctedPendingRtsCount: correctedPendingRts.length,
      activeDeferralCount: activeDeferrals.length,
      expiredDeferralCount: expiredDeferrals.length,
      limitation: firstLimitation(activeDeferrals),
    };
  }

  if (openDiscrepancies.length > 0) {
    return {
      state: "NOT_SERVICEABLE",
      label: "Not serviceable",
      message: `${openDiscrepancies.length} open write-up${openDiscrepancies.length === 1 ? "" : "s"} need deferral or repair.`,
      ready: false,
      blocksRelease: true,
      tone: "rose",
      openDiscrepancyCount: openDiscrepancies.length,
      correctedPendingRtsCount: correctedPendingRts.length,
      activeDeferralCount: activeDeferrals.length,
      expiredDeferralCount: expiredDeferrals.length,
      limitation: firstLimitation(activeDeferrals),
    };
  }

  if (overdueRequiredMaintenance.length > 0) {
    return {
      state: "NOT_SERVICEABLE",
      label: "Not serviceable",
      message: `${overdueRequiredMaintenance.length} required maintenance task${overdueRequiredMaintenance.length === 1 ? "" : "s"} overdue.`,
      ready: false,
      blocksRelease: true,
      tone: "rose",
      openDiscrepancyCount: openDiscrepancies.length,
      correctedPendingRtsCount: correctedPendingRts.length,
      activeDeferralCount: activeDeferrals.length,
      expiredDeferralCount: expiredDeferrals.length,
      limitation: firstLimitation(activeDeferrals),
    };
  }

  if (activeDeferredDiscrepancies.length > 0 || activeDeferrals.length > 0) {
    return {
      state: "DEFERRED_WITH_LIMITATIONS",
      label: "Deferred",
      message: `${Math.max(activeDeferredDiscrepancies.length, activeDeferrals.length)} active deferral${Math.max(activeDeferredDiscrepancies.length, activeDeferrals.length) === 1 ? "" : "s"} in effect.`,
      ready: true,
      blocksRelease: false,
      tone: "amber",
      openDiscrepancyCount: openDiscrepancies.length,
      correctedPendingRtsCount: correctedPendingRts.length,
      activeDeferralCount: activeDeferrals.length,
      expiredDeferralCount: expiredDeferrals.length,
      limitation: firstLimitation(activeDeferrals),
    };
  }

  if (!hasActiveConfiguration) {
    return {
      state: "NOT_SERVICEABLE",
      label: "Not serviceable",
      message: "No active aircraft configuration is available.",
      ready: false,
      blocksRelease: true,
      tone: "rose",
      openDiscrepancyCount: 0,
      correctedPendingRtsCount: 0,
      activeDeferralCount: 0,
      expiredDeferralCount: 0,
      limitation: null,
    };
  }

  return {
    state: "SERVICEABLE",
    label: "Serviceable",
    message: "No open write-ups or expired deferrals.",
    ready: true,
    blocksRelease: false,
    tone: "green",
    openDiscrepancyCount: 0,
    correctedPendingRtsCount: 0,
    activeDeferralCount: 0,
    expiredDeferralCount: 0,
    limitation: null,
  };
}
