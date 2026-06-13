import {
  AircraftFuelEventType,
  DispatchPackageStatus,
  FaaFlightPlanStatus,
  FlightLegStatus,
  FlightLocatingStatus,
  FlightPhaseStatus,
  OperatorManifestMode,
  WeightBalanceStatus,
} from "@prisma/client";

import {
  isDispatchReady,
  isFlightPlanBasisReady,
  isLocatingReady,
  isLocatingRequired,
  isPostflightComplete,
  isPreflightComplete,
  isReleaseFuelReady,
  resolveOperatorReleaseSetting,
} from "@/lib/flight-workflow";

function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const releaseFuel = {
  eventType: AircraftFuelEventType.RELEASE_ONBOARD,
  fueledReady: true,
  fuelOnboardLbs: 1200,
};
const postflightFuel = {
  eventType: AircraftFuelEventType.POSTFLIGHT_ONBOARD,
  fueledReady: null,
  fuelOnboardLbs: 700,
};

const defaultSetting = resolveOperatorReleaseSetting(null);
assertCondition(defaultSetting.dispatcherEnabled === false, "Dispatcher should default off.");
assertCondition(
  defaultSetting.manifestMode === OperatorManifestMode.PREFLIGHT_VERIFY,
  "Manifest should default to Preflight verification.",
);

assertCondition(
  isDispatchReady({
    flightPlanReferenceId: "flight-plan",
    notamSnapshotId: "notam",
    status: DispatchPackageStatus.READY,
    weatherBriefingId: "weather",
  }),
  "Complete dispatch package should be ready.",
);
assertCondition(
  !isDispatchReady({
    flightPlanReferenceId: null,
    notamSnapshotId: "notam",
    status: DispatchPackageStatus.READY,
    weatherBriefingId: "weather",
  }),
  "Incomplete dispatch package should not be ready.",
);

assertCondition(
  !isFlightPlanBasisReady(FaaFlightPlanStatus.UNKNOWN),
  "Unknown FAA flight-plan status should not be release-ready.",
);
assertCondition(
  isLocatingRequired(FaaFlightPlanStatus.NOT_FILED),
  "No FAA flight plan should require locating.",
);
assertCondition(
  !isLocatingRequired(FaaFlightPlanStatus.FILED),
  "Filed FAA flight plan should not require separate locating.",
);
assertCondition(
  isLocatingReady(FlightLocatingStatus.ACTIVE),
  "Active locating record should count as ready.",
);

assertCondition(isReleaseFuelReady([releaseFuel]), "Ready release fuel should satisfy Preflight fuel.");
assertCondition(
  isPreflightComplete({
    fuelEvents: [releaseFuel],
    manifestMode: OperatorManifestMode.NOT_REQUIRED,
    preflightRecord: {
      manifestVerified: false,
      status: FlightPhaseStatus.COMPLETE,
    },
    weightBalanceStatus: WeightBalanceStatus.CALCULATED,
  }),
  "Preflight should complete without manifest verification when manifest is not required.",
);
assertCondition(
  !isPreflightComplete({
    fuelEvents: [releaseFuel],
    manifestMode: OperatorManifestMode.PREFLIGHT_VERIFY,
    preflightRecord: {
      manifestVerified: false,
      status: FlightPhaseStatus.COMPLETE,
    },
    weightBalanceStatus: WeightBalanceStatus.CALCULATED,
  }),
  "Preflight should require manifest verification in Preflight manifest mode.",
);
assertCondition(
  !isPreflightComplete({
    fuelEvents: [],
    manifestMode: OperatorManifestMode.PREFLIGHT_VERIFY,
    preflightRecord: {
      manifestVerified: true,
      status: FlightPhaseStatus.COMPLETE,
    },
    weightBalanceStatus: WeightBalanceStatus.CALCULATED,
  }),
  "Preflight should require release fuel.",
);

assertCondition(
  isPostflightComplete({
    flightStatus: FlightLegStatus.COMPLETE,
    fuelEvents: [postflightFuel],
    postflightRecord: {
      delayNotes: null,
      inTime: new Date("2030-06-15T16:20:00.000Z"),
      offTime: new Date("2030-06-15T14:10:00.000Z"),
      onTime: new Date("2030-06-15T16:05:00.000Z"),
      outTime: new Date("2030-06-15T14:00:00.000Z"),
      status: FlightPhaseStatus.COMPLETE,
    },
  }),
  "Postflight should complete with times and postflight fuel.",
);
assertCondition(
  !isPostflightComplete({
    flightStatus: FlightLegStatus.DELAYED,
    fuelEvents: [postflightFuel],
    postflightRecord: {
      delayNotes: null,
      inTime: new Date("2030-06-15T16:20:00.000Z"),
      offTime: new Date("2030-06-15T14:10:00.000Z"),
      onTime: new Date("2030-06-15T16:05:00.000Z"),
      outTime: new Date("2030-06-15T14:00:00.000Z"),
      status: FlightPhaseStatus.COMPLETE,
    },
  }),
  "Delayed Postflight should require delay notes.",
);

console.log("Release workflow phase smoke passed.");
