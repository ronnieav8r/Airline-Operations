import {
  AircraftFuelEventType,
  DispatchPackageStatus,
  FaaFlightPlanStatus,
  FlightLegStatus,
  FlightPhaseStatus,
  FlightStatus,
  FlightLocatingStatus,
  ManifestStatus,
  OperatorManifestMode,
  WeightBalanceStatus,
} from "@prisma/client";

export type OperatorReleaseSettingRead = {
  dispatcherEnabled: boolean;
  manifestMode: OperatorManifestMode;
} | null | undefined;

export type FlightFuelEventRead = {
  eventType: AircraftFuelEventType;
  fueledReady: boolean | null;
  fuelOnboardLbs: unknown | null;
};

export type FlightPreflightRecordRead = {
  status: FlightPhaseStatus;
  manifestVerified: boolean;
} | null | undefined;

export type FlightPostflightRecordRead = {
  status: FlightPhaseStatus;
  outTime: Date | null;
  offTime: Date | null;
  onTime: Date | null;
  inTime: Date | null;
  delayNotes: string | null;
} | null | undefined;

export type FlightWorkflowReleaseSetting = {
  dispatcherEnabled: boolean;
  manifestMode: OperatorManifestMode;
};

export const DEFAULT_OPERATOR_RELEASE_SETTING: FlightWorkflowReleaseSetting = {
  dispatcherEnabled: false,
  manifestMode: OperatorManifestMode.PREFLIGHT_VERIFY,
};

export function resolveOperatorReleaseSetting(
  setting: OperatorReleaseSettingRead,
): FlightWorkflowReleaseSetting {
  return {
    dispatcherEnabled: setting?.dispatcherEnabled ?? DEFAULT_OPERATOR_RELEASE_SETTING.dispatcherEnabled,
    manifestMode: setting?.manifestMode ?? DEFAULT_OPERATOR_RELEASE_SETTING.manifestMode,
  };
}

export function isManifestReady(
  status: ManifestStatus | null | undefined,
  itemCount: number,
): boolean {
  return (
    itemCount > 0 &&
    (status === ManifestStatus.READY || status === ManifestStatus.LOCKED)
  );
}

export function isWeightBalanceReady(status: WeightBalanceStatus | null | undefined): boolean {
  return status === WeightBalanceStatus.CALCULATED || status === WeightBalanceStatus.APPROVED;
}

export function isDispatchReady(
  dispatch:
    | {
        status?: DispatchPackageStatus | null;
        weatherBriefingId?: string | null;
        notamSnapshotId?: string | null;
        flightPlanReferenceId?: string | null;
      }
    | null
    | undefined,
): boolean {
  return Boolean(
    dispatch &&
      dispatch.status !== DispatchPackageStatus.VOIDED &&
      dispatch.weatherBriefingId &&
      dispatch.notamSnapshotId &&
      dispatch.flightPlanReferenceId,
  );
}

export function isLocatingReady(status: FlightLocatingStatus | string | null | undefined): boolean {
  return (
    status === FlightLocatingStatus.FILED ||
    status === FlightLocatingStatus.ACTIVE ||
    status === FlightLocatingStatus.CLOSED
  );
}

export function isLocatingRequired(faaFlightPlanStatus: FaaFlightPlanStatus): boolean {
  return faaFlightPlanStatus === FaaFlightPlanStatus.NOT_FILED;
}

export function isFlightPlanBasisReady(faaFlightPlanStatus: FaaFlightPlanStatus): boolean {
  return faaFlightPlanStatus !== FaaFlightPlanStatus.UNKNOWN;
}

export function releaseFuelEvent(events: FlightFuelEventRead[]): FlightFuelEventRead | null {
  return events.find((event) => event.eventType === AircraftFuelEventType.RELEASE_ONBOARD) ?? null;
}

export function postflightFuelEvent(events: FlightFuelEventRead[]): FlightFuelEventRead | null {
  return events.find((event) => event.eventType === AircraftFuelEventType.POSTFLIGHT_ONBOARD) ?? null;
}

export function isReleaseFuelReady(events: FlightFuelEventRead[]): boolean {
  const fuel = releaseFuelEvent(events);
  return Boolean(fuel?.fuelOnboardLbs && fuel.fueledReady === true);
}

export function isPostflightFuelReady(events: FlightFuelEventRead[]): boolean {
  return Boolean(postflightFuelEvent(events)?.fuelOnboardLbs);
}

export function isPreflightComplete(
  args: {
    fuelEvents: FlightFuelEventRead[];
    manifestMode: OperatorManifestMode;
    preflightRecord: FlightPreflightRecordRead;
    weightBalanceStatus: WeightBalanceStatus | null | undefined;
  },
): boolean {
  const manifestReady =
    args.manifestMode !== OperatorManifestMode.PREFLIGHT_VERIFY ||
    args.preflightRecord?.manifestVerified === true;

  return (
    isReleaseFuelReady(args.fuelEvents) &&
    isWeightBalanceReady(args.weightBalanceStatus) &&
    manifestReady &&
    args.preflightRecord?.status === FlightPhaseStatus.COMPLETE
  );
}

export function isPostflightComplete(
  args: {
    flightStatus: FlightLegStatus | FlightStatus;
    fuelEvents: FlightFuelEventRead[];
    postflightRecord: FlightPostflightRecordRead;
  },
): boolean {
  const record = args.postflightRecord;
  const delayNotesReady =
    String(args.flightStatus) !== "DELAYED" ? true : Boolean(record?.delayNotes?.trim());

  return Boolean(
    record?.status === FlightPhaseStatus.COMPLETE &&
      record.outTime &&
      record.offTime &&
      record.onTime &&
      record.inTime &&
      delayNotesReady &&
      isPostflightFuelReady(args.fuelEvents),
  );
}
