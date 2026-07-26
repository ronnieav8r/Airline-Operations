import {
  AircraftStatus,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceComplianceStatus,
  MaintenanceControlHoldStatus,
  MaintenanceEventStatus,
} from "@prisma/client";

export type AircraftServiceabilityState =
  | "SERVICEABLE"
  | "NOT_SERVICEABLE"
  | "RTS_REQUIRED"
  | "DEFERRED_WITH_LIMITATIONS"
  | "DEFERRAL_EXPIRED"
  | "IN_MAINTENANCE"
  | "MX_HOLD"
  | "INSPECTION_REQUIRED"
  | "MX_RELEASE_REQUIRED"
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
  requiresIndependentInspection?: boolean;
  maintenanceApprovedAt?: Date | null;
  inspectionApprovedAt?: Date | null;
};

export type ServiceabilityMaintenanceControlHold = {
  id?: string;
  status: MaintenanceControlHoldStatus;
  reason?: string | null;
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
  maintenanceControlHolds?: ServiceabilityMaintenanceControlHold[];
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
  const activeHolds = (aircraft.maintenanceControlHolds ?? []).filter(
    (item) => item.status === MaintenanceControlHoldStatus.ACTIVE,
  );
  const activeMaintenance = (aircraft.maintenanceEvents ?? []).filter(
    (item) => item.status === MaintenanceEventStatus.IN_PROGRESS,
  );
  const completedPendingControlRelease = (aircraft.maintenanceEvents ?? []).filter(
    (item) => item.status === MaintenanceEventStatus.COMPLETED && !item.returnToServiceAt,
  );
  const pendingIndependentInspection = completedPendingControlRelease.filter(
    (item) =>
      item.requiresIndependentInspection === true &&
      Boolean(item.maintenanceApprovedAt) &&
      !item.inspectionApprovedAt,
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

  if (activeHolds.length > 0) {
    return {
      state: "MX_HOLD",
      label: "MX hold",
      message: activeHolds[0]?.reason || "Maintenance Control removed this aircraft from service.",
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

  if (activeMaintenance.length > 0) {
    return {
      state: "IN_MAINTENANCE",
      label: "Maintenance in progress",
      message: `${activeMaintenance.length} maintenance occurrence${activeMaintenance.length === 1 ? " is" : "s are"} in progress.`,
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
      state: "MX_RELEASE_REQUIRED",
      label: "MX release required",
      message: `${correctedPendingRts.length} corrected write-up${correctedPendingRts.length === 1 ? "" : "s"} waiting on Maintenance Control release.`,
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

  if (pendingIndependentInspection.length > 0) {
    return {
      state: "INSPECTION_REQUIRED",
      label: "Inspection required",
      message: `${pendingIndependentInspection.length} maintenance occurrence${pendingIndependentInspection.length === 1 ? "" : "s"} waiting on independent inspection.`,
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

  if (completedPendingControlRelease.length > 0) {
    return {
      state: "MX_RELEASE_REQUIRED",
      label: "MX release required",
      message: `${completedPendingControlRelease.length} completed maintenance occurrence${completedPendingControlRelease.length === 1 ? "" : "s"} waiting on Maintenance Control release.`,
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
    label: "Available",
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
