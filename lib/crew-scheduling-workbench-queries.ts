import {
  AircraftType,
  AssignmentStatus,
  CrewLogisticsNeedStatus,
  CrewScheduleEntryStatus,
  CrewScheduleRequestStatus,
  CrewScheduleRequestType,
  DutyStatus,
  EmploymentStatus,
  SeatRole,
  TimeOffRequestStatus,
  TimeOffRequestType,
} from "@prisma/client";

import { getUpcomingCoverageFlightsForAircrafts } from "@/lib/flightleg-upcoming-coverage";
import { prisma } from "@/lib/prisma";

export const CREW_SCHEDULING_WORKBENCH_VIEWS = ["month", "week", "day"] as const;
export const CREW_SCHEDULING_WORKBENCH_TABS = [
  "coverage",
  "planning",
  "assignment",
  "requests",
] as const;
export const CREW_SCHEDULING_WORKBENCH_LAYERS = ["schedule", "assignment"] as const;
export const CREW_SCHEDULING_WORKBENCH_DRAWERS = [
  "coverage",
  "crew",
  "location",
  "assignment",
] as const;

export type CrewSchedulingWorkbenchView = (typeof CREW_SCHEDULING_WORKBENCH_VIEWS)[number];
export type CrewSchedulingWorkbenchTab = (typeof CREW_SCHEDULING_WORKBENCH_TABS)[number];
export type CrewSchedulingWorkbenchLayer = (typeof CREW_SCHEDULING_WORKBENCH_LAYERS)[number];
export type CrewSchedulingWorkbenchDrawer = (typeof CREW_SCHEDULING_WORKBENCH_DRAWERS)[number];
export type CrewSchedulingRoleFilter = SeatRole | "all";
export type CrewSchedulingAircraftTypeFilter = AircraftType | "all";

export type CrewSchedulingWorkbenchFilters = {
  aircraftType: CrewSchedulingAircraftTypeFilter;
  base: string;
  role: CrewSchedulingRoleFilter;
};

export type CrewSchedulingWorkbenchOptions = {
  date: Date;
  filters: CrewSchedulingWorkbenchFilters;
  view: CrewSchedulingWorkbenchView;
};

export type CrewCoverageCrewDetail = {
  aircraftId: string | null;
  aircraftType: AircraftType;
  assignmentHref: string | null;
  baseStationCode: string;
  crewMemberId: string;
  dutyStatus: DutyStatus;
  employeeNumber: string;
  employmentStatus: EmploymentStatus;
  locationLabel: string;
  name: string;
  notes: string[];
  seatRole: SeatRole;
};

export type CrewCoverageFlightGap = {
  aircraftId: string;
  aircraftType: AircraftType;
  flightLegId: string | null;
  flightNumber: string;
  missingRoles: SeatRole[];
  route: string;
  scheduledDeparture: Date;
  tailNumber: string;
};

export type CrewCoverageRoleBucket = {
  aircraftType: AircraftType;
  counts: {
    approvedOff: number;
    assigned: number;
    occupied: number;
    pendingOff: number;
    reserve: number;
    scheduled: number;
    unavailable: number;
    off: number;
  };
  crew: {
    approvedOff: CrewCoverageCrewDetail[];
    assigned: CrewCoverageCrewDetail[];
    occupied: CrewCoverageCrewDetail[];
    pendingOff: CrewCoverageCrewDetail[];
    reserve: CrewCoverageCrewDetail[];
    scheduled: CrewCoverageCrewDetail[];
    unavailable: CrewCoverageCrewDetail[];
    off: CrewCoverageCrewDetail[];
  };
  flightGaps: CrewCoverageFlightGap[];
  seatRole: SeatRole;
};

export type CrewCoverageCalendarDay = {
  buckets: CrewCoverageRoleBucket[];
  date: Date;
  dayKey: string;
  label: string;
  totals: {
    approvedOff: number;
    assigned: number;
    flightGaps: number;
    occupied: number;
    pendingOff: number;
    reserve: number;
    scheduled: number;
    unavailable: number;
    off: number;
  };
};

export type CrewAssignmentOverlaySummary = {
  aircraftId: string;
  aircraftType: AircraftType;
  assignedCrew: CrewCoverageCrewDetail[];
  dayKey: string;
  flightGaps: CrewCoverageFlightGap[];
  flightLegs: Array<{
    flightLegId: string | null;
    flightNumber: string;
    missingRoles: SeatRole[];
    route: string;
    scheduledDeparture: Date;
  }>;
  tailNumber: string;
};

export type CrewSchedulingWorkbenchData = {
  activePeriods: Array<{
    endsAt: Date;
    id: string;
    name: string;
    periodKey: string;
    startsAt: Date;
    status: string;
  }>;
  aircraftTypeOptions: AircraftType[];
  assignmentOverlay: CrewAssignmentOverlaySummary[];
  calendarDays: CrewCoverageCalendarDay[];
  crewMembers: CrewCoverageCrewDetail[];
  pendingRequests: Array<{
    crewMemberId: string;
    crewMemberName: string;
    id: string;
    periodName: string;
    requestType: CrewScheduleRequestType;
    startDate: Date | null;
    endDate: Date | null;
    status: CrewScheduleRequestStatus;
  }>;
  pendingTimeOff: Array<{
    crewMemberId: string;
    crewMemberName: string;
    id: string;
    requestType: TimeOffRequestType;
    startDate: Date;
    endDate: Date;
    status: TimeOffRequestStatus;
  }>;
  roleOptions: SeatRole[];
  stationOptions: Array<{
    code: string;
    id: string;
  }>;
  summary: {
    activeCrew: number;
    aircraftAssignedCrew: number;
    flightGaps: number;
    openLogistics: number;
    pendingRequests: number;
    pendingTimeOff: number;
    publishedOrDraftEntries: number;
    reserveCrew: number;
    scheduledCrew: number;
  };
  viewEnd: Date;
  viewStart: Date;
};

type CrewPayload = Awaited<ReturnType<typeof loadCrewRows>>[number];
type BucketKey = `${AircraftType}:${SeatRole}`;
type BucketCrewKey = keyof CrewCoverageRoleBucket["crew"];

const ROLE_OPTIONS: SeatRole[] = [SeatRole.CPT, SeatRole.FO, SeatRole.FA, SeatRole.CA];
const AIRCRAFT_TYPE_OPTIONS: AircraftType[] = [AircraftType.CL_65, AircraftType.EMB_135_145];

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(value: Date): Date {
  const next = startOfDay(value);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function startOfNextMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth() + 1, 1);
}

function dayKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate(),
  ).padStart(2, "0")}`;
}

function formatDayLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function rangesOverlap(
  firstStart: Date,
  firstEnd: Date | null,
  secondStart: Date,
  secondEnd: Date,
): boolean {
  return firstStart < secondEnd && (!firstEnd || firstEnd > secondStart);
}

function viewRange(view: CrewSchedulingWorkbenchView, date: Date) {
  if (view === "month") {
    const viewStart = startOfMonth(date);
    return {
      viewEnd: startOfNextMonth(viewStart),
      viewStart,
    };
  }

  if (view === "week") {
    const viewStart = startOfWeek(date);
    return {
      viewEnd: addDays(viewStart, 7),
      viewStart,
    };
  }

  const viewStart = startOfDay(date);
  return {
    viewEnd: addDays(viewStart, 1),
    viewStart,
  };
}

function allDayStarts(viewStart: Date, viewEnd: Date): Date[] {
  const dates: Date[] = [];

  for (let date = new Date(viewStart); date < viewEnd; date = addDays(date, 1)) {
    dates.push(new Date(date));
  }

  return dates;
}

function bucketKey(aircraftType: AircraftType, seatRole: SeatRole): BucketKey {
  return `${aircraftType}:${seatRole}`;
}

function makeEmptyBucket(aircraftType: AircraftType, seatRole: SeatRole): CrewCoverageRoleBucket {
  return {
    aircraftType,
    counts: {
      approvedOff: 0,
      assigned: 0,
      occupied: 0,
      pendingOff: 0,
      reserve: 0,
      scheduled: 0,
      unavailable: 0,
      off: 0,
    },
    crew: {
      approvedOff: [],
      assigned: [],
      occupied: [],
      pendingOff: [],
      reserve: [],
      scheduled: [],
      unavailable: [],
      off: [],
    },
    flightGaps: [],
    seatRole,
  };
}

function addCrewToBucket(
  bucket: CrewCoverageRoleBucket,
  bucketName: BucketCrewKey,
  detail: CrewCoverageCrewDetail,
) {
  if (bucket.crew[bucketName].some((crewMember) => crewMember.crewMemberId === detail.crewMemberId)) {
    return;
  }

  bucket.crew[bucketName].push(detail);
  bucket.counts[bucketName] += 1;
}

function crewName(crewMember: { firstName: string; lastName: string }): string {
  return `${crewMember.firstName} ${crewMember.lastName}`;
}

function locationLabel(crewMember: CrewPayload): string {
  const latest = crewMember.locationRecords[0];

  if (!latest) {
    return `Base ${crewMember.baseStation.code}`;
  }

  if (latest.station) {
    return `${latest.station.code} - ${latest.station.city}`;
  }

  return latest.locationText ?? `Base ${crewMember.baseStation.code}`;
}

function scheduleTimeNotes(
  rows: Array<{ dutyStatus: DutyStatus; startsAt: Date | null; endsAt: Date | null; date: Date }>,
): string[] {
  return rows.slice(0, 3).map((row) => {
    const start = row.startsAt ? formatDateTime(row.startsAt) : formatDayLabel(row.date);
    const end = row.endsAt ? formatDateTime(row.endsAt) : "open";

    return `${row.dutyStatus} ${start}-${end}`;
  });
}

function overlappingRows<T extends { startsAt: Date | null; endsAt: Date | null; date: Date }>(
  rows: T[],
  dayStart: Date,
  dayEnd: Date,
): T[] {
  return rows.filter((row) => {
    const rowStart = row.startsAt ?? row.date;
    const rowEnd = row.endsAt ?? addDays(row.date, 1);

    return rangesOverlap(rowStart, rowEnd, dayStart, dayEnd);
  });
}

function overlappingTimeOff(
  crewMember: CrewPayload,
  dayStart: Date,
  dayEnd: Date,
  status: TimeOffRequestStatus,
) {
  return crewMember.timeOffRequests.filter(
    (request) =>
      request.status === status &&
      rangesOverlap(request.startDate, request.endDate, dayStart, dayEnd),
  );
}

function validPositionsForDay(crewMember: CrewPayload, dayEnd: Date): Array<{
  aircraftType: AircraftType;
  seatRole: SeatRole;
}> {
  const seen = new Set<BucketKey>();
  const positions: Array<{ aircraftType: AircraftType; seatRole: SeatRole }> = [];

  for (const qualification of crewMember.qualifications) {
    if (qualification.expiresAt && qualification.expiresAt < dayEnd) {
      continue;
    }

    const key = bucketKey(qualification.aircraftType, qualification.seatRole);

    if (!seen.has(key)) {
      seen.add(key);
      positions.push({
        aircraftType: qualification.aircraftType,
        seatRole: qualification.seatRole,
      });
    }
  }

  return positions;
}

function matchingAssignmentsForPosition(
  crewMember: CrewPayload,
  aircraftType: AircraftType,
  seatRole: SeatRole,
  dayStart: Date,
  dayEnd: Date,
) {
  return crewMember.assignments.filter(
    (assignment) =>
      assignment.aircraft.type === aircraftType &&
      assignment.seatRole === seatRole &&
      rangesOverlap(assignment.startsAt, assignment.endsAt, dayStart, dayEnd),
  );
}

function occupiedAssignmentsForOtherPosition(
  crewMember: CrewPayload,
  aircraftType: AircraftType,
  seatRole: SeatRole,
  dayStart: Date,
  dayEnd: Date,
) {
  return crewMember.assignments.filter(
    (assignment) =>
      (assignment.aircraft.type !== aircraftType || assignment.seatRole !== seatRole) &&
      rangesOverlap(assignment.startsAt, assignment.endsAt, dayStart, dayEnd),
  );
}

function matchingLegAssignmentsForPosition(
  crewMember: CrewPayload,
  aircraftType: AircraftType,
  seatRole: SeatRole,
  dayStart: Date,
  dayEnd: Date,
) {
  return crewMember.legAssignments.filter((assignment) => {
    const aircraft = assignment.flightLeg.aircraftAssignments[0]?.aircraft;

    return (
      aircraft?.type === aircraftType &&
      assignment.seatRole === seatRole &&
      rangesOverlap(
        assignment.flightLeg.scheduledDeparture,
        assignment.flightLeg.scheduledArrival,
        dayStart,
        dayEnd,
      )
    );
  });
}

function occupiedLegAssignmentsForOtherPosition(
  crewMember: CrewPayload,
  aircraftType: AircraftType,
  seatRole: SeatRole,
  dayStart: Date,
  dayEnd: Date,
) {
  return crewMember.legAssignments.filter((assignment) => {
    const aircraft = assignment.flightLeg.aircraftAssignments[0]?.aircraft;

    return (
      Boolean(aircraft) &&
      (aircraft?.type !== aircraftType || assignment.seatRole !== seatRole) &&
      rangesOverlap(
        assignment.flightLeg.scheduledDeparture,
        assignment.flightLeg.scheduledArrival,
        dayStart,
        dayEnd,
      )
    );
  });
}

function detailForPosition({
  aircraftId,
  aircraftType,
  crewMember,
  notes,
  seatRole,
}: {
  aircraftId: string | null;
  aircraftType: AircraftType;
  crewMember: CrewPayload;
  notes: string[];
  seatRole: SeatRole;
}): CrewCoverageCrewDetail {
  return {
    aircraftId,
    aircraftType,
    assignmentHref: aircraftId
      ? `/aircraft/${aircraftId}/crew?crewMemberId=${crewMember.id}&seatRole=${seatRole}`
      : null,
    baseStationCode: crewMember.baseStation.code,
    crewMemberId: crewMember.id,
    dutyStatus: crewMember.dutyStatus,
    employeeNumber: crewMember.employeeNumber,
    employmentStatus: crewMember.employmentStatus,
    locationLabel: locationLabel(crewMember),
    name: crewName(crewMember),
    notes,
    seatRole,
  };
}

function matchesFilters(
  detail: CrewCoverageCrewDetail,
  filters: CrewSchedulingWorkbenchFilters,
): boolean {
  return (
    (filters.aircraftType === "all" || detail.aircraftType === filters.aircraftType) &&
    (filters.base === "all" || detail.baseStationCode === filters.base) &&
    (filters.role === "all" || detail.seatRole === filters.role)
  );
}

function bucketHasContent(bucket: CrewCoverageRoleBucket): boolean {
  return (
    Object.values(bucket.counts).some((count) => count > 0) ||
    bucket.flightGaps.length > 0
  );
}

async function loadCrewRows(viewStart: Date, viewEnd: Date) {
  return prisma.crewMember.findMany({
    orderBy: [{ employmentStatus: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      dutyStatus: true,
      employmentStatus: true,
      baseStation: {
        select: {
          code: true,
          city: true,
        },
      },
      qualifications: {
        select: {
          aircraftType: true,
          expiresAt: true,
          seatRole: true,
        },
      },
      schedules: {
        where: {
          date: {
            gte: viewStart,
            lt: viewEnd,
          },
        },
        select: {
          date: true,
          dutyStatus: true,
          endsAt: true,
          id: true,
          startsAt: true,
          station: {
            select: {
              code: true,
            },
          },
        },
      },
      scheduleEntries: {
        where: {
          status: {
            in: [CrewScheduleEntryStatus.DRAFT, CrewScheduleEntryStatus.PUBLISHED],
          },
          date: {
            gte: viewStart,
            lt: viewEnd,
          },
        },
        select: {
          date: true,
          dutyStatus: true,
          endsAt: true,
          id: true,
          startsAt: true,
          status: true,
          station: {
            select: {
              code: true,
            },
          },
        },
      },
      timeOffRequests: {
        where: {
          status: { in: [TimeOffRequestStatus.PENDING, TimeOffRequestStatus.APPROVED] },
          startDate: { lt: viewEnd },
          endDate: { gt: viewStart },
        },
        select: {
          endDate: true,
          id: true,
          requestType: true,
          startDate: true,
          status: true,
        },
      },
      assignments: {
        where: {
          isActive: true,
          startsAt: { lt: viewEnd },
          OR: [{ endsAt: null }, { endsAt: { gt: viewStart } }],
        },
        select: {
          aircraft: {
            select: {
              id: true,
              tailNumber: true,
              type: true,
            },
          },
          endsAt: true,
          id: true,
          seatRole: true,
          startsAt: true,
        },
      },
      legAssignments: {
        where: {
          status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
          flightLeg: {
            scheduledDeparture: { lt: viewEnd },
            scheduledArrival: { gt: viewStart },
          },
        },
        select: {
          flightLeg: {
            select: {
              aircraftAssignments: {
                where: {
                  status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
                },
                orderBy: { assignedAt: "desc" },
                take: 1,
                select: {
                  aircraft: {
                    select: {
                      id: true,
                      tailNumber: true,
                      type: true,
                    },
                  },
                },
              },
              flightNumber: true,
              id: true,
              scheduledArrival: true,
              scheduledDeparture: true,
            },
          },
          id: true,
          seatRole: true,
        },
      },
      locationRecords: {
        orderBy: [{ effectiveAt: "desc" }],
        take: 1,
        select: {
          effectiveAt: true,
          locationText: true,
          source: true,
          station: {
            select: {
              city: true,
              code: true,
            },
          },
        },
      },
      logisticsNeeds: {
        where: {
          status: {
            in: [
              CrewLogisticsNeedStatus.PLANNED,
              CrewLogisticsNeedStatus.REQUESTED,
              CrewLogisticsNeedStatus.BOOKED,
            ],
          },
        },
        orderBy: [{ neededBy: "asc" }, { createdAt: "desc" }],
        take: 3,
        select: {
          id: true,
          needType: true,
          neededBy: true,
          status: true,
          fromStation: {
            select: {
              code: true,
            },
          },
          toStation: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  });
}

function buildCalendarDays({
  crewRows,
  filters,
  flightGaps,
  viewEnd,
  viewStart,
}: {
  crewRows: CrewPayload[];
  filters: CrewSchedulingWorkbenchFilters;
  flightGaps: CrewCoverageFlightGap[];
  viewEnd: Date;
  viewStart: Date;
}): CrewCoverageCalendarDay[] {
  return allDayStarts(viewStart, viewEnd).map((date) => {
    const dayStart = startOfDay(date);
    const dayEnd = addDays(dayStart, 1);
    const bucketMap = new Map<BucketKey, CrewCoverageRoleBucket>();

    for (const crewMember of crewRows) {
      for (const position of validPositionsForDay(crewMember, dayEnd)) {
        const baseDetail = detailForPosition({
          aircraftId: null,
          aircraftType: position.aircraftType,
          crewMember,
          notes: [],
          seatRole: position.seatRole,
        });

        if (!matchesFilters(baseDetail, filters)) {
          continue;
        }

        const key = bucketKey(position.aircraftType, position.seatRole);
        const bucket = bucketMap.get(key) ?? makeEmptyBucket(position.aircraftType, position.seatRole);
        const scheduleRows = overlappingRows(
          [...crewMember.schedules, ...crewMember.scheduleEntries],
          dayStart,
          dayEnd,
        );
        const approvedOff = overlappingTimeOff(
          crewMember,
          dayStart,
          dayEnd,
          TimeOffRequestStatus.APPROVED,
        );
        const pendingOff = overlappingTimeOff(
          crewMember,
          dayStart,
          dayEnd,
          TimeOffRequestStatus.PENDING,
        );
        const sameAssignments = matchingAssignmentsForPosition(
          crewMember,
          position.aircraftType,
          position.seatRole,
          dayStart,
          dayEnd,
        );
        const sameLegAssignments = matchingLegAssignmentsForPosition(
          crewMember,
          position.aircraftType,
          position.seatRole,
          dayStart,
          dayEnd,
        );
        const otherAssignments = occupiedAssignmentsForOtherPosition(
          crewMember,
          position.aircraftType,
          position.seatRole,
          dayStart,
          dayEnd,
        );
        const otherLegAssignments = occupiedLegAssignmentsForOtherPosition(
          crewMember,
          position.aircraftType,
          position.seatRole,
          dayStart,
          dayEnd,
        );
        const assignedAircraftId =
          sameAssignments[0]?.aircraft.id ??
          sameLegAssignments[0]?.flightLeg.aircraftAssignments[0]?.aircraft.id ??
          null;

        if (sameAssignments.length > 0 || sameLegAssignments.length > 0) {
          addCrewToBucket(
            bucket,
            "assigned",
            detailForPosition({
              aircraftId: assignedAircraftId,
              aircraftType: position.aircraftType,
              crewMember,
              notes: [
                ...sameAssignments.map(
                  (assignment) => `${assignment.aircraft.tailNumber} block ${formatDateTime(assignment.startsAt)}`,
                ),
                ...sameLegAssignments.map(
                  (assignment) =>
                    `${assignment.flightLeg.flightNumber ?? "FlightLeg"} leg ${formatDateTime(
                      assignment.flightLeg.scheduledDeparture,
                    )}`,
                ),
              ],
              seatRole: position.seatRole,
            }),
          );
        }

        if (otherAssignments.length > 0 || otherLegAssignments.length > 0) {
          addCrewToBucket(
            bucket,
            "occupied",
            detailForPosition({
              aircraftId:
                otherAssignments[0]?.aircraft.id ??
                otherLegAssignments[0]?.flightLeg.aircraftAssignments[0]?.aircraft.id ??
                null,
              aircraftType: position.aircraftType,
              crewMember,
              notes: [
                ...otherAssignments.map(
                  (assignment) =>
                    `${assignment.aircraft.tailNumber} ${assignment.seatRole} block`,
                ),
                ...otherLegAssignments.map(
                  (assignment) =>
                    `${assignment.flightLeg.flightNumber ?? "FlightLeg"} ${assignment.seatRole} leg`,
                ),
              ],
              seatRole: position.seatRole,
            }),
          );
        }

        if (approvedOff.length > 0) {
          addCrewToBucket(
            bucket,
            "approvedOff",
            detailForPosition({
              aircraftId: assignedAircraftId,
              aircraftType: position.aircraftType,
              crewMember,
              notes: approvedOff.map((request) => `${request.requestType} approved`),
              seatRole: position.seatRole,
            }),
          );
        }

        if (pendingOff.length > 0) {
          addCrewToBucket(
            bucket,
            "pendingOff",
            detailForPosition({
              aircraftId: assignedAircraftId,
              aircraftType: position.aircraftType,
              crewMember,
              notes: pendingOff.map((request) => `${request.requestType} pending`),
              seatRole: position.seatRole,
            }),
          );
        }

        if (crewMember.employmentStatus !== EmploymentStatus.ACTIVE) {
          addCrewToBucket(
            bucket,
            "unavailable",
            detailForPosition({
              aircraftId: assignedAircraftId,
              aircraftType: position.aircraftType,
              crewMember,
              notes: [`Employment ${crewMember.employmentStatus}`],
              seatRole: position.seatRole,
            }),
          );
        }

        if (scheduleRows.some((row) => row.dutyStatus === DutyStatus.RESERVE)) {
          addCrewToBucket(
            bucket,
            "reserve",
            detailForPosition({
              aircraftId: assignedAircraftId,
              aircraftType: position.aircraftType,
              crewMember,
              notes: scheduleTimeNotes(scheduleRows.filter((row) => row.dutyStatus === DutyStatus.RESERVE)),
              seatRole: position.seatRole,
            }),
          );
        }

        if (
          scheduleRows.some(
            (row) =>
              row.dutyStatus === DutyStatus.ON_DUTY ||
              row.dutyStatus === DutyStatus.DEADHEADING,
          )
        ) {
          addCrewToBucket(
            bucket,
            "scheduled",
            detailForPosition({
              aircraftId: assignedAircraftId,
              aircraftType: position.aircraftType,
              crewMember,
              notes: scheduleTimeNotes(
                scheduleRows.filter(
                  (row) =>
                    row.dutyStatus === DutyStatus.ON_DUTY ||
                    row.dutyStatus === DutyStatus.DEADHEADING,
                ),
              ),
              seatRole: position.seatRole,
            }),
          );
        }

        if (scheduleRows.some((row) => row.dutyStatus === DutyStatus.OFF_DUTY)) {
          addCrewToBucket(
            bucket,
            "off",
            detailForPosition({
              aircraftId: assignedAircraftId,
              aircraftType: position.aircraftType,
              crewMember,
              notes: scheduleTimeNotes(scheduleRows.filter((row) => row.dutyStatus === DutyStatus.OFF_DUTY)),
              seatRole: position.seatRole,
            }),
          );
        }

        if (
          scheduleRows.some(
            (row) =>
              row.dutyStatus === DutyStatus.SICK ||
              row.dutyStatus === DutyStatus.TRAINING ||
              row.dutyStatus === DutyStatus.VACATION,
          )
        ) {
          addCrewToBucket(
            bucket,
            "unavailable",
            detailForPosition({
              aircraftId: assignedAircraftId,
              aircraftType: position.aircraftType,
              crewMember,
              notes: scheduleTimeNotes(
                scheduleRows.filter(
                  (row) =>
                    row.dutyStatus === DutyStatus.SICK ||
                    row.dutyStatus === DutyStatus.TRAINING ||
                    row.dutyStatus === DutyStatus.VACATION,
                ),
              ),
              seatRole: position.seatRole,
            }),
          );
        }

        bucketMap.set(key, bucket);
      }
    }

    for (const gap of flightGaps.filter((gap) => dayKey(gap.scheduledDeparture) === dayKey(dayStart))) {
      for (const missingRole of gap.missingRoles) {
        if (
          (filters.aircraftType !== "all" && gap.aircraftType !== filters.aircraftType) ||
          (filters.role !== "all" && missingRole !== filters.role)
        ) {
          continue;
        }

        const key = bucketKey(gap.aircraftType, missingRole);
        const bucket = bucketMap.get(key) ?? makeEmptyBucket(gap.aircraftType, missingRole);
        bucket.flightGaps.push(gap);
        bucketMap.set(key, bucket);
      }
    }

    const buckets = Array.from(bucketMap.values())
      .filter(bucketHasContent)
      .sort((first, second) => {
        const aircraftOrder = first.aircraftType.localeCompare(second.aircraftType);
        return aircraftOrder === 0 ? first.seatRole.localeCompare(second.seatRole) : aircraftOrder;
      });

    return {
      buckets,
      date: dayStart,
      dayKey: dayKey(dayStart),
      label: formatDayLabel(dayStart),
      totals: {
        approvedOff: buckets.reduce((total, bucket) => total + bucket.counts.approvedOff, 0),
        assigned: buckets.reduce((total, bucket) => total + bucket.counts.assigned, 0),
        flightGaps: buckets.reduce((total, bucket) => total + bucket.flightGaps.length, 0),
        occupied: buckets.reduce((total, bucket) => total + bucket.counts.occupied, 0),
        pendingOff: buckets.reduce((total, bucket) => total + bucket.counts.pendingOff, 0),
        reserve: buckets.reduce((total, bucket) => total + bucket.counts.reserve, 0),
        scheduled: buckets.reduce((total, bucket) => total + bucket.counts.scheduled, 0),
        unavailable: buckets.reduce((total, bucket) => total + bucket.counts.unavailable, 0),
        off: buckets.reduce((total, bucket) => total + bucket.counts.off, 0),
      },
    };
  });
}

function buildFlightGaps(
  flights: Awaited<ReturnType<typeof getUpcomingCoverageFlightsForAircrafts>>,
  aircraftTypesById: Map<string, AircraftType>,
): CrewCoverageFlightGap[] {
  return flights.flatMap((flight) => {
    if (!flight.coverage || flight.coverage.missingRoles.length === 0) {
      return [];
    }

    const aircraftType = aircraftTypesById.get(flight.aircraftId);

    if (!aircraftType) {
      return [];
    }

    return [
      {
        aircraftId: flight.aircraftId,
        aircraftType,
        flightLegId: flight.flightLegId,
        flightNumber: flight.flightNumber,
        missingRoles: flight.coverage.missingRoles,
        route: flight.route,
        scheduledDeparture: flight.scheduledDeparture,
        tailNumber: flight.tailNumber,
      },
    ];
  });
}

function buildAssignmentOverlay(
  calendarDays: CrewCoverageCalendarDay[],
): CrewAssignmentOverlaySummary[] {
  const overlay = new Map<string, CrewAssignmentOverlaySummary>();

  for (const day of calendarDays) {
    for (const bucket of day.buckets) {
      for (const crewMember of bucket.crew.assigned) {
        if (!crewMember.aircraftId) {
          continue;
        }

        const key = `${day.dayKey}:${crewMember.aircraftId}`;
        const current = overlay.get(key) ?? {
          aircraftId: crewMember.aircraftId,
          aircraftType: crewMember.aircraftType,
          assignedCrew: [],
          dayKey: day.dayKey,
          flightGaps: [],
          flightLegs: [],
          tailNumber: crewMember.notes[0]?.split(" ")[0] ?? "Aircraft",
        };

        if (!current.assignedCrew.some((item) => item.crewMemberId === crewMember.crewMemberId)) {
          current.assignedCrew.push(crewMember);
        }

        overlay.set(key, current);
      }

      for (const gap of bucket.flightGaps) {
        const key = `${day.dayKey}:${gap.aircraftId}`;
        const current = overlay.get(key) ?? {
          aircraftId: gap.aircraftId,
          aircraftType: gap.aircraftType,
          assignedCrew: [],
          dayKey: day.dayKey,
          flightGaps: [],
          flightLegs: [],
          tailNumber: gap.tailNumber,
        };

        current.flightGaps.push(gap);
        if (!current.flightLegs.some((flightLeg) => flightLeg.flightNumber === gap.flightNumber)) {
          current.flightLegs.push({
            flightLegId: gap.flightLegId,
            flightNumber: gap.flightNumber,
            missingRoles: gap.missingRoles,
            route: gap.route,
            scheduledDeparture: gap.scheduledDeparture,
          });
        }
        overlay.set(key, current);
      }
    }
  }

  return Array.from(overlay.values()).sort((first, second) => {
    const dayOrder = first.dayKey.localeCompare(second.dayKey);
    return dayOrder === 0 ? first.tailNumber.localeCompare(second.tailNumber) : dayOrder;
  });
}

export async function getCrewSchedulingWorkbenchData(
  options: CrewSchedulingWorkbenchOptions,
): Promise<CrewSchedulingWorkbenchData> {
  const { viewEnd, viewStart } = viewRange(options.view, options.date);
  const [crewRows, aircraft, periods, pendingTimeOff, pendingRequests] = await Promise.all([
    loadCrewRows(viewStart, viewEnd),
    prisma.aircraft.findMany({
      orderBy: [{ tailNumber: "asc" }],
      select: {
        id: true,
        tailNumber: true,
        type: true,
      },
    }),
    prisma.crewSchedulePeriod.findMany({
      where: {
        startsAt: { lt: viewEnd },
        endsAt: { gt: viewStart },
      },
      orderBy: [{ startsAt: "asc" }],
      select: {
        endsAt: true,
        id: true,
        name: true,
        periodKey: true,
        startsAt: true,
        status: true,
      },
    }),
    prisma.timeOffRequest.findMany({
      where: {
        status: { in: [TimeOffRequestStatus.PENDING, TimeOffRequestStatus.APPROVED] },
        startDate: { lt: viewEnd },
        endDate: { gt: viewStart },
      },
      orderBy: [{ startDate: "asc" }],
      select: {
        crewMember: {
          select: {
            firstName: true,
            id: true,
            lastName: true,
          },
        },
        endDate: true,
        id: true,
        requestType: true,
        startDate: true,
        status: true,
      },
    }),
    prisma.crewScheduleRequest.findMany({
      where: {
        status: { in: [CrewScheduleRequestStatus.SUBMITTED, CrewScheduleRequestStatus.APPROVED] },
        period: {
          startsAt: { lt: viewEnd },
          endsAt: { gt: viewStart },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        crewMember: {
          select: {
            firstName: true,
            id: true,
            lastName: true,
          },
        },
        endDate: true,
        id: true,
        period: {
          select: {
            name: true,
          },
        },
        requestType: true,
        startDate: true,
        status: true,
      },
    }),
  ]);
  const aircraftTypesById = new Map(aircraft.map((item) => [item.id, item.type]));
  const flightsWithCoverage = await getUpcomingCoverageFlightsForAircrafts(
    aircraft.map((item) => item.id),
    viewStart,
    viewEnd,
  );
  const flightGaps = buildFlightGaps(flightsWithCoverage, aircraftTypesById);
  const calendarDays = buildCalendarDays({
    crewRows,
    filters: options.filters,
    flightGaps,
    viewEnd,
    viewStart,
  });
  const allCrewDetails = new Map<string, CrewCoverageCrewDetail>();

  for (const day of calendarDays) {
    for (const bucket of day.buckets) {
      for (const group of Object.values(bucket.crew)) {
        for (const crewMember of group) {
          allCrewDetails.set(crewMember.crewMemberId, crewMember);
        }
      }
    }
  }

  const summary = {
    activeCrew: crewRows.filter((crewMember) => crewMember.employmentStatus === EmploymentStatus.ACTIVE).length,
    aircraftAssignedCrew: calendarDays.reduce((total, day) => total + day.totals.assigned, 0),
    flightGaps: calendarDays.reduce((total, day) => total + day.totals.flightGaps, 0),
    openLogistics: crewRows.filter((crewMember) => crewMember.logisticsNeeds.length > 0).length,
    pendingRequests: pendingRequests.length,
    pendingTimeOff: pendingTimeOff.length,
    publishedOrDraftEntries: crewRows.reduce(
      (total, crewMember) => total + crewMember.scheduleEntries.length,
      0,
    ),
    reserveCrew: calendarDays.reduce((total, day) => total + day.totals.reserve, 0),
    scheduledCrew: calendarDays.reduce((total, day) => total + day.totals.scheduled, 0),
  };

  return {
    activePeriods: periods,
    aircraftTypeOptions: AIRCRAFT_TYPE_OPTIONS,
    assignmentOverlay: buildAssignmentOverlay(calendarDays),
    calendarDays,
    crewMembers: Array.from(allCrewDetails.values()).sort((first, second) =>
      first.name.localeCompare(second.name),
    ),
    pendingRequests: pendingRequests.map((request) => ({
      crewMemberId: request.crewMember.id,
      crewMemberName: crewName(request.crewMember),
      endDate: request.endDate,
      id: request.id,
      periodName: request.period.name,
      requestType: request.requestType,
      startDate: request.startDate,
      status: request.status,
    })),
    pendingTimeOff: pendingTimeOff.map((request) => ({
      crewMemberId: request.crewMember.id,
      crewMemberName: crewName(request.crewMember),
      endDate: request.endDate,
      id: request.id,
      requestType: request.requestType,
      startDate: request.startDate,
      status: request.status,
    })),
    roleOptions: ROLE_OPTIONS,
    stationOptions: Array.from(
      new Map(crewRows.map((crewMember) => [crewMember.baseStation.code, crewMember.baseStation])).values(),
    )
      .sort((first, second) => first.code.localeCompare(second.code))
      .map((station) => ({
        code: station.code,
        id: station.code,
      })),
    summary,
    viewEnd,
    viewStart,
  };
}
