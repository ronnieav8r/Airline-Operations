import {
  AirworthinessReleaseStatus,
  AircraftFuelEventType,
  CrewComplianceRecordStatus,
  DispatchPackageStatus,
  FlightLocatingStatus,
  ManifestStatus,
  OperatorManifestMode,
  Prisma,
  ReleaseFindingStatus,
  ReleaseRuleSeverity,
  ReleaseSnapshotStatus,
  SeatRole,
  WeightBalanceStatus,
} from "@prisma/client";

import { evaluateDutyRestForFlightLeg } from "@/lib/duty-rest-evaluator";
import {
  isFlightPlanBasisReady,
  isLocatingRequired,
  resolveOperatorReleaseSetting,
} from "@/lib/flight-workflow";
import { ReleaseEvidenceDetail } from "@/lib/release-evidence-detail-queries";

export type ReleaseReadinessClassification = "READY" | "WOULD_BLOCK" | "WOULD_WARN";

export type ReleaseReadinessItem = {
  classification: ReleaseReadinessClassification;
  details?: Prisma.JsonObject;
  evidenceRefId?: string;
  evidenceRefType?: string;
  href?: string;
  label: string;
  message: string;
  readinessCategory: string;
  ready: boolean;
  ruleKey: string;
};

export function mapReadinessClassificationToSeverity(
  classification: ReleaseReadinessClassification,
): ReleaseRuleSeverity {
  if (classification === "WOULD_WARN") {
    return ReleaseRuleSeverity.WARN;
  }

  if (classification === "READY") {
    return ReleaseRuleSeverity.INFO;
  }

  return ReleaseRuleSeverity.BLOCK;
}

export function mapReleaseReadinessFindingStatus(
  ready: boolean,
  severity: ReleaseRuleSeverity,
): ReleaseFindingStatus {
  if (ready) {
    return ReleaseFindingStatus.PASS;
  }

  return severity === ReleaseRuleSeverity.BLOCK
    ? ReleaseFindingStatus.FAIL
    : ReleaseFindingStatus.WARNING;
}

export function getReleaseSnapshotStatus(
  failCount: number,
  warningCount: number,
): ReleaseSnapshotStatus {
  if (failCount > 0) {
    return ReleaseSnapshotStatus.BLOCKED;
  }

  if (warningCount > 0) {
    return ReleaseSnapshotStatus.WARNING_ONLY;
  }

  return ReleaseSnapshotStatus.PASS;
}

function releaseReadinessDate(value: Date | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function hasExpiredStatus(status: CrewComplianceRecordStatus): boolean {
  return status === CrewComplianceRecordStatus.EXPIRED || status === CrewComplianceRecordStatus.VOIDED;
}

function isExpired(expiresAt: Date | null, now: Date): boolean {
  return Boolean(expiresAt && expiresAt < now);
}

function buildCrewComplianceWarnings(detail: ReleaseEvidenceDetail): string[] {
  const now = new Date();
  const warnings: string[] = [];
  const crewAssignments = detail.crewAssignments;
  const assignedRoles = new Set(crewAssignments.map((assignment) => assignment.seatRole));
  const missingRequiredRoles = [SeatRole.CPT, SeatRole.FO].filter(
    (role) => !assignedRoles.has(role),
  );

  if (crewAssignments.length === 0) {
    warnings.push("No FlightLeg crew snapshot assignments are recorded.");
  }

  if (missingRequiredRoles.length > 0) {
    warnings.push(`Missing cockpit crew snapshot role(s): ${missingRequiredRoles.join(", ")}.`);
  }

  for (const assignment of crewAssignments) {
    const crewMember = assignment.crewMember;
    const missingCategories = [
      crewMember.certificates.length === 0 ? "certificate" : null,
      crewMember.medicals.length === 0 ? "medical" : null,
      crewMember.trainingEvents.length === 0 ? "training" : null,
      crewMember.checkEvents.length === 0 ? "check" : null,
      crewMember.recencyEvents.length === 0 ? "recency" : null,
      crewMember.dutyPeriods.length === 0 ? "duty" : null,
      crewMember.restPeriods.length === 0 ? "rest" : null,
    ].filter(Boolean);
    const expiredCount =
      crewMember.certificates.filter((item) => hasExpiredStatus(item.status) || isExpired(item.expiresAt, now)).length +
      crewMember.medicals.filter((item) => hasExpiredStatus(item.status) || isExpired(item.expiresAt, now)).length +
      crewMember.trainingEvents.filter((item) => hasExpiredStatus(item.status) || isExpired(item.expiresAt, now)).length +
      crewMember.checkEvents.filter((item) => hasExpiredStatus(item.status) || isExpired(item.expiresAt, now)).length +
      crewMember.recencyEvents.filter((item) => hasExpiredStatus(item.status)).length;

    if (missingCategories.length > 0 || expiredCount > 0) {
      warnings.push(
        `${crewMember.firstName} ${crewMember.lastName} has ${
          missingCategories.length > 0 ? `missing ${missingCategories.join(", ")} evidence` : ""
        }${missingCategories.length > 0 && expiredCount > 0 ? " and " : ""}${
          expiredCount > 0 ? `${expiredCount} expired/voided record(s)` : ""
        }.`,
      );
    }
  }

  return warnings;
}

export function getReleaseReadinessItems(detail: ReleaseEvidenceDetail): ReleaseReadinessItem[] {
  const manifest = detail.manifest;
  const aircraftAssignment = detail.aircraftAssignments[0] ?? null;
  const aircraft = aircraftAssignment?.aircraft ?? null;
  const currentConfiguration = aircraft?.configurations[0] ?? null;
  const latestAirworthinessRelease = aircraft?.airworthinessReleases[0] ?? null;
  const currentAirworthinessRelease =
    aircraft?.airworthinessReleases.find(
      (release) => release.status === AirworthinessReleaseStatus.RELEASED,
    ) ?? null;
  const currentAirworthinessReleaseExpired =
    !!currentAirworthinessRelease?.expiresAt &&
    currentAirworthinessRelease.expiresAt.getTime() <= Date.now();
  const currentAirworthinessReleaseUsable =
    !!currentAirworthinessRelease && !currentAirworthinessReleaseExpired;
  const latestUsableWeightBalanceRun =
    detail.weightBalanceRuns.find((run) => run.status !== WeightBalanceStatus.VOIDED) ?? null;
  const releaseFuel =
    detail.fuelEvents.find((event) => event.eventType === AircraftFuelEventType.RELEASE_ONBOARD) ??
    null;
  const locating = detail.flightLocatingRecord;
  const dispatch = detail.dispatchPackage;
  const releaseSetting = resolveOperatorReleaseSetting(detail.operator.releaseSetting);
  const weather = dispatch?.weatherBriefing ?? null;
  const notam = dispatch?.notamSnapshot ?? null;
  const flightPlan = dispatch?.flightPlanReference ?? null;
  const manifestReady =
    !!manifest &&
    manifest.items.length > 0 &&
    (manifest.status === ManifestStatus.READY || manifest.status === ManifestStatus.LOCKED);
  const weightBalanceReady =
    !!latestUsableWeightBalanceRun &&
    (latestUsableWeightBalanceRun.status === WeightBalanceStatus.CALCULATED ||
      latestUsableWeightBalanceRun.status === WeightBalanceStatus.APPROVED);
  const fuelReady = !!releaseFuel && releaseFuel.fueledReady === true;
  const locatingReady =
    !!locating &&
    (locating.status === FlightLocatingStatus.FILED ||
      locating.status === FlightLocatingStatus.ACTIVE ||
      locating.status === FlightLocatingStatus.CLOSED);
  const flightPlanBasisReady = isFlightPlanBasisReady(detail.faaFlightPlanStatus);
  const locatingApplies = isLocatingRequired(detail.faaFlightPlanStatus);
  const dispatchNotVoided = dispatch?.status !== DispatchPackageStatus.VOIDED;
  const dispatchReady = !!dispatch && dispatchNotVoided && !!weather && !!notam && !!flightPlan;
  const weatherReady = !!weather?.routeSummary;
  const notamReady = !!notam?.affectedStationCodes;
  const flightPlanReady = !!flightPlan?.externalReference && !!flightPlan.routeText;
  const airworthinessHasFutureBlocker =
    !aircraft || !currentConfiguration || !currentAirworthinessReleaseUsable;
  const airworthinessReady =
    !!aircraft &&
    !!currentConfiguration &&
    currentAirworthinessReleaseUsable &&
    aircraft.discrepancies.length === 0 &&
    aircraft.deferrals.length === 0;
  const airworthinessRuleKey = !aircraft
    ? "flightLeg.assignedAircraft.missing"
    : !currentConfiguration
      ? "aircraftConfiguration.active.missing"
      : !latestAirworthinessRelease || !currentAirworthinessRelease
        ? "airworthinessRelease.current.missing"
        : currentAirworthinessReleaseExpired
          ? "airworthinessRelease.current.expired"
          : aircraft.discrepancies.length > 0
            ? "discrepancy.open.exists"
            : aircraft.deferrals.length > 0
              ? "deferral.active.exists"
              : "airworthinessRelease.current.missing";
  const crewComplianceWarnings = buildCrewComplianceWarnings(detail);
  const crewComplianceReady = crewComplianceWarnings.length === 0;
  const dutyRestEvaluation = evaluateDutyRestForFlightLeg(detail);

  return [
    {
      classification: airworthinessReady
        ? "READY"
        : airworthinessHasFutureBlocker
          ? "WOULD_BLOCK"
          : "WOULD_WARN",
      details: {
        aircraftId: aircraft?.id ?? null,
        tailNumber: aircraft?.tailNumber ?? null,
        activeConfiguration: currentConfiguration?.configurationLabel ?? null,
        currentAirworthinessRelease: currentAirworthinessRelease?.releaseNumber ?? null,
        openDiscrepancies: aircraft?.discrepancies.length ?? 0,
        activeDeferrals: aircraft?.deferrals.length ?? 0,
      },
      evidenceRefId: aircraft?.id,
      evidenceRefType: aircraft ? "Aircraft" : undefined,
      label: "Airworthiness",
      message: airworthinessReady
        ? `${aircraft.tailNumber} has active configuration and current aircraft airworthiness release ${currentAirworthinessRelease?.releaseNumber ?? "record"}.`
        : [
            !aircraft ? "Assigned aircraft is missing." : null,
            aircraft && !currentConfiguration ? "No active configuration." : null,
            aircraft && !latestAirworthinessRelease
              ? "No aircraft airworthiness release record."
              : null,
            aircraft && latestAirworthinessRelease && !currentAirworthinessRelease
              ? `Latest aircraft airworthiness release ${latestAirworthinessRelease.releaseNumber} is ${latestAirworthinessRelease.status}; no current RELEASED record.`
              : null,
            aircraft && currentAirworthinessReleaseExpired
              ? `Current aircraft airworthiness release ${currentAirworthinessRelease.releaseNumber} expired ${releaseReadinessDate(
                  currentAirworthinessRelease.expiresAt,
                )}.`
              : null,
            aircraft && aircraft.discrepancies.length > 0
              ? `${aircraft.discrepancies.length} open/deferred discrepancy warning(s).`
              : null,
            aircraft && aircraft.deferrals.length > 0
              ? `${aircraft.deferrals.length} active deferral warning(s).`
              : null,
          ]
            .filter(Boolean)
            .join(" "),
      readinessCategory: "airworthiness",
      ready: airworthinessReady,
      ruleKey: airworthinessRuleKey,
    },
    {
      classification: crewComplianceReady ? "READY" : "WOULD_WARN",
      details: {
        crewAssignments: detail.crewAssignments.length,
        warnings: crewComplianceWarnings,
      },
      evidenceRefType: detail.crewAssignments.length > 0 ? "CrewLegAssignment" : undefined,
      label: "Crew compliance",
      message: crewComplianceReady
        ? "Crew snapshot assignments have supporting compliance evidence."
        : crewComplianceWarnings.join(" "),
      readinessCategory: "crew-compliance",
      ready: crewComplianceReady,
      ruleKey: crewComplianceReady ? "crewCompliance.current.ready" : "crewCompliance.warning.exists",
    },
    {
      classification: dutyRestEvaluation.ready ? "READY" : "WOULD_WARN",
      details: {
        findings: dutyRestEvaluation.findings.map((finding) => ({
          ruleKey: finding.ruleKey,
          label: finding.label,
          status: finding.status,
          severity: finding.severity,
          message: finding.message,
          evidenceRefType: finding.evidenceRefType ?? null,
          evidenceRefId: finding.evidenceRefId ?? null,
          details: finding.details ?? {},
        })),
        operatingPart: detail.operatingAuthority.operatingPart,
        policyProfileKey: detail.operatingAuthority.dutyRestPolicyProfiles[0]?.profileKey ?? null,
      },
      evidenceRefType: detail.crewAssignments.length > 0 ? "CrewLegAssignment" : undefined,
      label: "Duty/rest",
      message: dutyRestEvaluation.message,
      readinessCategory: "duty-rest",
      ready: dutyRestEvaluation.ready,
      ruleKey: dutyRestEvaluation.ruleKey,
    },
    {
      classification: fuelReady ? "READY" : "WOULD_WARN",
      details: {
        fuelOnboardLbs: releaseFuel?.fuelOnboardLbs?.toString() ?? null,
        fuelOnboardGallons: releaseFuel?.fuelOnboardGallons?.toString() ?? null,
        fuelDensityLbsPerGallon: releaseFuel?.fuelDensityLbsPerGallon?.toString() ?? null,
        fueledReady: releaseFuel?.fueledReady ?? null,
        recordedAt: releaseFuel?.recordedAt?.toISOString() ?? null,
      },
      evidenceRefId: releaseFuel?.id,
      evidenceRefType: releaseFuel ? "AircraftFuelEvent" : undefined,
      href: `/operations-control/${detail.id}/fuel`,
      label: "Fuel",
      message: fuelReady
        ? `Preflight fuel onboard ${releaseFuel.fuelOnboardLbs.toString()} lb and fueled-ready is confirmed.`
        : releaseFuel
          ? "Release fuel onboard is recorded, but fueled-ready is not confirmed."
          : "Preflight needs fuel onboard and fueled-ready confirmation.",
      readinessCategory: "fuel",
      ready: fuelReady,
      ruleKey: releaseFuel ? "preflight.fuel.readyNotConfirmed" : "preflight.fuel.missing",
    },
    {
      classification:
        releaseSetting.manifestMode === OperatorManifestMode.NOT_REQUIRED
          ? "READY"
          : manifestReady
            ? "READY"
            : releaseSetting.manifestMode === OperatorManifestMode.OPS_REQUIRED
              ? "WOULD_BLOCK"
              : "WOULD_WARN",
      details: {
        itemCount: manifest?.items.length ?? 0,
        status: manifest?.status ?? null,
      },
      evidenceRefType: manifest ? "Manifest" : undefined,
      href: `/operations-control/${detail.id}/manifest`,
      label: "Manifest",
      message:
        releaseSetting.manifestMode === OperatorManifestMode.NOT_REQUIRED
          ? "Manifest is not required by operator release settings."
          : manifestReady
            ? `${manifest.items.length} item(s), status ${manifest.status}.`
            : releaseSetting.manifestMode === OperatorManifestMode.OPS_REQUIRED
              ? "Ops Release requires a READY or LOCKED manifest with at least one item."
              : "Preflight requires manifest verification.",
      readinessCategory: "manifest",
      ready: releaseSetting.manifestMode === OperatorManifestMode.NOT_REQUIRED || manifestReady,
      ruleKey:
        releaseSetting.manifestMode === OperatorManifestMode.OPS_REQUIRED
          ? !manifest
            ? "manifest.current.missing"
            : "manifest.current.empty"
          : "preflight.manifest.verification.missing",
    },
    {
      classification: weightBalanceReady ? "READY" : "WOULD_WARN",
      details: {
        runLabel: latestUsableWeightBalanceRun?.runLabel ?? null,
        status: latestUsableWeightBalanceRun?.status ?? null,
      },
      evidenceRefId: latestUsableWeightBalanceRun?.id,
      evidenceRefType: latestUsableWeightBalanceRun ? "WeightBalanceRun" : undefined,
      href: `/operations-control/${detail.id}/weight-balance`,
      label: "Weight and balance",
      message: weightBalanceReady
        ? `${latestUsableWeightBalanceRun.runLabel} is ${latestUsableWeightBalanceRun.status}.`
        : "Preflight needs a latest non-voided W&B run marked CALCULATED or APPROVED.",
      readinessCategory: "weight-balance",
      ready: weightBalanceReady,
      ruleKey: !latestUsableWeightBalanceRun
        ? "preflight.weightBalance.current.missing"
        : "preflight.weightBalance.current.notCalculated",
    },
    {
      classification:
        !flightPlanBasisReady
          ? "WOULD_BLOCK"
          : !locatingApplies
            ? "READY"
            : locatingReady
              ? "READY"
              : "WOULD_BLOCK",
      details: {
        faaFlightPlanStatus: detail.faaFlightPlanStatus,
        status: locating?.status ?? null,
      },
      evidenceRefType: locating ? "FlightLocatingRecord" : undefined,
      href: `/operations-control/${detail.id}/locating`,
      label: "Flight locating",
      message: !flightPlanBasisReady
        ? "FAA flight-plan status must be set before Ops Release."
        : !locatingApplies
          ? "FAA flight plan filed or locating not applicable; no locating record is required."
          : locatingReady
            ? `No FAA flight plan filed; locating status is ${locating.status}.`
            : "No FAA flight plan filed; needs locating status FILED, ACTIVE, or CLOSED.",
      readinessCategory: "locating",
      ready: flightPlanBasisReady && (!locatingApplies || locatingReady),
      ruleKey: !flightPlanBasisReady
        ? "flightPlanReference.status.unknown"
        : "flightLocating.record.missing",
    },
    {
      classification:
        !releaseSetting.dispatcherEnabled ? "READY" : dispatchReady ? "READY" : "WOULD_BLOCK",
      details: {
        dispatcherEnabled: releaseSetting.dispatcherEnabled,
        hasWeather: !!weather,
        hasNotam: !!notam,
        hasFlightPlan: !!flightPlan,
        status: dispatch?.status ?? null,
      },
      evidenceRefType: dispatch ? "DispatchPackage" : undefined,
      href: `/operations-control/${detail.id}/dispatch`,
      label: "Dispatch package",
      message: !releaseSetting.dispatcherEnabled
        ? "Dispatcher is disabled; dispatch package is not required for Ops Release."
        : dispatchReady
          ? "Dispatch package links weather, NOTAM, and flight-plan evidence."
          : dispatch?.status === DispatchPackageStatus.VOIDED
            ? "Dispatch package is voided."
            : "Dispatcher is enabled; needs dispatch package linked to weather, NOTAM, and flight-plan evidence.",
      readinessCategory: "dispatch",
      ready: !releaseSetting.dispatcherEnabled || dispatchReady,
      ruleKey: "dispatchPackage.current.missing",
    },
    {
      classification: weatherReady ? "READY" : "WOULD_BLOCK",
      details: {
        provider: weather?.provider ?? null,
        briefingAt: weather?.briefingAt?.toISOString() ?? null,
      },
      evidenceRefType: weather ? "WeatherBriefingSnapshot" : undefined,
      href: `/operations-control/${detail.id}/dispatch`,
      label: "Weather",
      message: weatherReady ? "Weather route summary is present." : "Needs a weather route summary.",
      readinessCategory: "weather",
      ready: weatherReady,
      ruleKey: "weatherBriefing.current.missing",
    },
    {
      classification: notamReady ? "READY" : "WOULD_BLOCK",
      details: {
        capturedAt: notam?.capturedAt?.toISOString() ?? null,
      },
      evidenceRefType: notam ? "NotamSnapshot" : undefined,
      href: `/operations-control/${detail.id}/dispatch`,
      label: "NOTAM",
      message: notamReady ? "Affected station codes are present." : "Needs affected station codes.",
      readinessCategory: "notam",
      ready: notamReady,
      ruleKey: "notamSnapshot.current.missing",
    },
    {
      classification: flightPlanReady ? "READY" : "WOULD_BLOCK",
      details: {
        provider: flightPlan?.provider ?? null,
        status: flightPlan?.status ?? null,
      },
      evidenceRefType: flightPlan ? "FlightPlanReference" : undefined,
      href: `/operations-control/${detail.id}/dispatch`,
      label: "Flight plan",
      message: flightPlanReady
        ? `${flightPlan.externalReference} has route text.`
        : "Needs an external reference and route text.",
      readinessCategory: "flight-plan",
      ready: flightPlanReady,
      ruleKey: "flightPlanReference.current.missing",
    },
  ];
}
