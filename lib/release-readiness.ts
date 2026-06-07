import {
  AirworthinessReleaseStatus,
  FlightLocatingStatus,
  ManifestStatus,
  Prisma,
  WeightBalanceStatus,
} from "@prisma/client";

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
  const locating = detail.flightLocatingRecord;
  const dispatch = detail.dispatchPackage;
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
  const locatingReady =
    !!locating &&
    (locating.status === FlightLocatingStatus.FILED ||
      locating.status === FlightLocatingStatus.ACTIVE ||
      locating.status === FlightLocatingStatus.CLOSED);
  const dispatchReady = !!dispatch && !!weather && !!notam && !!flightPlan;
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
      classification: manifestReady ? "READY" : "WOULD_BLOCK",
      details: {
        itemCount: manifest?.items.length ?? 0,
        status: manifest?.status ?? null,
      },
      evidenceRefType: manifest ? "Manifest" : undefined,
      href: `/operations-control/${detail.id}/manifest`,
      label: "Manifest",
      message: manifestReady
        ? `${manifest.items.length} item(s), status ${manifest.status}.`
        : "Needs a READY or LOCKED manifest with at least one item.",
      readinessCategory: "manifest",
      ready: manifestReady,
      ruleKey: !manifest ? "manifest.current.missing" : "manifest.current.empty",
    },
    {
      classification: weightBalanceReady ? "READY" : "WOULD_BLOCK",
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
        : "Needs a latest non-voided W&B run marked CALCULATED or APPROVED.",
      readinessCategory: "weight-balance",
      ready: weightBalanceReady,
      ruleKey: !latestUsableWeightBalanceRun
        ? "weightBalance.current.missing"
        : "weightBalance.current.notCalculated",
    },
    {
      classification: locatingReady ? "READY" : "WOULD_BLOCK",
      details: {
        status: locating?.status ?? null,
      },
      evidenceRefType: locating ? "FlightLocatingRecord" : undefined,
      href: `/operations-control/${detail.id}/locating`,
      label: "Flight locating",
      message: locatingReady
        ? `Locating status is ${locating.status}.`
        : "Needs locating status FILED, ACTIVE, or CLOSED.",
      readinessCategory: "locating",
      ready: locatingReady,
      ruleKey: "flightLocating.record.missing",
    },
    {
      classification: dispatchReady ? "READY" : "WOULD_BLOCK",
      details: {
        hasWeather: !!weather,
        hasNotam: !!notam,
        hasFlightPlan: !!flightPlan,
      },
      evidenceRefType: dispatch ? "DispatchPackage" : undefined,
      href: `/operations-control/${detail.id}/dispatch`,
      label: "Dispatch package",
      message: dispatchReady
        ? "Dispatch package links weather, NOTAM, and flight-plan evidence."
        : "Needs a dispatch package linked to weather, NOTAM, and flight-plan evidence.",
      readinessCategory: "dispatch",
      ready: dispatchReady,
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
