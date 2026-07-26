import {
  AircraftStatus,
  AircraftType,
  AlertSeverity,
  AlertType,
  DiscrepancyStatus,
  DutyStatus,
  FlightLegStatus,
  FlightStatus,
  MaintenanceEventStatus,
  SeatRole,
} from "@prisma/client";
import Link from "next/link";

import { createAircraftAction } from "@/app/aircraft/actions";
import {
  createAircraftCrewAssignmentAction,
  saveAircraftCoveragePublishedAssignmentAction,
} from "@/app/aircraft/[aircraftId]/crew/actions";
import { AircraftCoverageStagingClient } from "@/app/aircraft/aircraft-coverage-staging-client";
import { AircraftScheduleDropdown } from "@/app/aircraft/aircraft-schedule-dropdown";
import { ContextDrawer } from "@/components/context-drawer";
import { evaluateAircraftServiceability, type AircraftServiceabilityTone } from "@/lib/aircraft-serviceability";
import {
  AircraftCrewMemberOption,
  getAircraftCrewWorkflowData,
} from "@/lib/aircraft-crew-workflow-queries";
import { getAircraftBoard, getAircraftCreateOptions } from "@/lib/aircraft-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
    success?: string | string[];
    date?: string | string[];
    filter?: string | string[];
    focus?: string | string[];
    aircraftType?: string | string[];
    panel?: string | string[];
    range?: string | string[];
    role?: string | string[];
    selected?: string | string[];
    selectedCrew?: string | string[];
    startsAt?: string | string[];
    endsAt?: string | string[];
    view?: string | string[];
  }>;
};

type AircraftBoardRow = Awaited<ReturnType<typeof getAircraftBoard>>["aircraft"][number];
type AircraftFilter = "all" | "aog" | "available" | "in-flight" | "open-mels" | "open-writeups";
type AircraftPanel = "aircraft" | "assign" | "create" | null;
type AircraftView = "crew-coverage" | "fleet";
type CoverageFocus = "all" | "covered" | "flights" | "gap" | "review";
type CoverageRange = "1" | "7" | "28" | "56";
type AircraftCreateOptions = Awaited<ReturnType<typeof getAircraftCreateOptions>>;
type AircraftCrewWorkflowDrawerData = NonNullable<Awaited<ReturnType<typeof getAircraftCrewWorkflowData>>>;
type AircraftWorkflowAssignment = AircraftCrewWorkflowDrawerData["assignments"][number];
type AircraftWorkflowAssignmentSegment = {
  assignment?: AircraftWorkflowAssignment;
  endsAt: Date;
  startsAt: Date;
  type: "assignment" | "gap";
};
type TimelineHeaderSegment = {
  label: string;
  length: number;
  startIndex: number;
};
type CoveragePlannerFilters = {
  aircraftType: AircraftType | "all";
  date: Date;
  dateInput: string;
  focus: CoverageFocus;
  range: CoverageRange;
  role: SeatRole;
  view: AircraftView;
};

const aircraftCoverageDrawerTimelineDays = 42;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parseAircraftFilter(value: string | string[] | undefined): AircraftFilter {
  const firstValue = firstParam(value);

  if (
    firstValue === "aog" ||
    firstValue === "available" ||
    firstValue === "in-flight" ||
    firstValue === "open-mels" ||
    firstValue === "open-writeups"
  ) {
    return firstValue;
  }

  return "all";
}

function parseAircraftView(value: string | string[] | undefined): AircraftView {
  return firstParam(value) === "crew-coverage" ? "crew-coverage" : "fleet";
}

function parseCoverageRange(value: string | string[] | undefined): CoverageRange {
  const firstValue = firstParam(value);

  if (
    firstValue === "1" ||
    firstValue === "7" ||
    firstValue === "28" ||
    firstValue === "56"
  ) {
    return firstValue;
  }

  if (firstValue && Number(firstValue) > 56) {
    return "56";
  }

  return "28";
}

function parseCoverageAircraftType(value: string | string[] | undefined): AircraftType | "all" {
  const firstValue = firstParam(value);

  if (firstValue === AircraftType.CL_65 || firstValue === AircraftType.EMB_135_145) {
    return firstValue;
  }

  return "all";
}

function parseCoverageFocus(value: string | string[] | undefined): CoverageFocus {
  const firstValue = firstParam(value);

  if (
    firstValue === "covered" ||
    firstValue === "flights" ||
    firstValue === "gap" ||
    firstValue === "review"
  ) {
    return firstValue;
  }

  return "all";
}

function parseCoverageRole(value: string | string[] | undefined): SeatRole {
  const firstValue = firstParam(value);

  if (firstValue === SeatRole.CPT || firstValue === SeatRole.FO || firstValue === SeatRole.FA) {
    return firstValue;
  }

  return SeatRole.CPT;
}

function parseAircraftPanel(value: string | string[] | undefined): AircraftPanel {
  const firstValue = firstParam(value);

  if (firstValue === "aircraft" || firstValue === "assign" || firstValue === "create") {
    return firstValue;
  }

  return null;
}

function aircraftHref(
  options: {
    aircraftType?: AircraftType | "all" | null;
    date?: string | null;
    endsAt?: string | null;
    filter?: AircraftFilter | null;
    focus?: CoverageFocus | null;
    panel?: AircraftPanel;
    range?: CoverageRange | null;
    role?: SeatRole | null;
    selected?: string | null;
    selectedCrew?: string | null;
    startsAt?: string | null;
    view?: AircraftView | null;
  } = {},
) {
  const params = new URLSearchParams();

  if (options.view && options.view !== "fleet") {
    params.set("view", options.view);
  }

  if (options.filter && options.filter !== "all") {
    params.set("filter", options.filter);
  }

  if (options.aircraftType && options.aircraftType !== "all") {
    params.set("aircraftType", options.aircraftType);
  }

  if (options.date) {
    params.set("date", options.date);
  }

  if (options.range && options.range !== "28") {
    params.set("range", options.range);
  }

  if (options.focus && options.focus !== "all") {
    params.set("focus", options.focus);
  }

  if (options.panel) {
    params.set("panel", options.panel);
  }

  if (options.selected) {
    params.set("selected", options.selected);
  }

  if (options.selectedCrew) {
    params.set("selectedCrew", options.selectedCrew);
  }

  if (options.role) {
    params.set("role", options.role);
  }

  if (options.startsAt) {
    params.set("startsAt", options.startsAt);
  }

  if (options.endsAt) {
    params.set("endsAt", options.endsAt);
  }

  const query = params.toString();
  return query ? `/aircraft?${query}` : "/aircraft";
}

function toDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function toCompactDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
}

function toCompactTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function toCompactFlightWindow(departure: Date, arrival: Date): string {
  if (isSameCalendarDate(departure, arrival)) {
    return `${toCompactDate(departure)} ${toCompactTime(departure)}-${toCompactTime(arrival)}`;
  }

  return `${toCompactDate(departure)} ${toCompactTime(departure)} - ${toCompactDate(arrival)} ${toCompactTime(arrival)}`;
}

function toDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toOptionalDateTime(value: Date | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return toDateTime(value);
}

function toInputDateTime(value: Date | null | undefined): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 16);
}

function startOfDay(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function addHours(value: Date, hours: number): Date {
  const next = new Date(value);
  next.setHours(next.getHours() + hours);
  return next;
}

function parseCoverageDate(value: string | string[] | undefined, fallback: Date): Date {
  const firstValue = firstParam(value);
  const match = firstValue?.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return startOfDay(fallback);
  }

  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? startOfDay(fallback) : startOfDay(parsed);
}

function parseQueryDateTime(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatFullDateLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatHourLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
  }).format(value);
}

function isSameCalendarDate(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

const timelineLaneLabelWidth = 44;
const timelineDayColumnWidth = 56;
const timelineHourColumnWidth = 54;

function timelineMinWidth(range: CoverageRange, days: number): number {
  if (range === "1") {
    return Math.max(timelineLaneLabelWidth + 24 * timelineHourColumnWidth, 960);
  }

  return Math.max(timelineLaneLabelWidth + days * timelineDayColumnWidth, 720);
}

function timelineHeaderGridTemplate(range: CoverageRange, days: number): string {
  if (range === "1") {
    return `${timelineLaneLabelWidth}px repeat(24, ${timelineHourColumnWidth}px)`;
  }

  return `${timelineLaneLabelWidth}px repeat(${days}, ${timelineDayColumnWidth}px)`;
}

function monthLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function monthHeaderSegments(days: Date[]): TimelineHeaderSegment[] {
  const segments: TimelineHeaderSegment[] = [];

  for (const [index, day] of days.entries()) {
    const label = monthLabel(day);
    const active = segments.at(-1);

    if (active && active.label === label) {
      active.length += 1;
    } else {
      segments.push({ label, length: 1, startIndex: index });
    }
  }

  return segments;
}

function formatAircraftType(value: string): string {
  return value.replaceAll("_", "-");
}

function formatRoleLabel(role: SeatRole): string {
  return role === SeatRole.CPT ? "CPT" : role;
}

function formatValueLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function aircraftStatusBadgeClasses(status: AircraftStatus): string {
  if (status === AircraftStatus.IN_FLIGHT) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === AircraftStatus.IN_MAINTENANCE || status === AircraftStatus.OUT_OF_SERVICE) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === AircraftStatus.RESERVED) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function aircraftStatusLabel(status: AircraftStatus): string {
  if (status === AircraftStatus.OUT_OF_SERVICE) {
    return "AOG";
  }

  return status.replaceAll("_", " ");
}

function serviceabilityBadgeClasses(tone: AircraftServiceabilityTone): string {
  if (tone === "green") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "rose") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function flightStatusBadgeClasses(status: FlightStatus | FlightLegStatus): string {
  if (status === FlightStatus.ENROUTE) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === FlightStatus.DELAYED) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === FlightStatus.CANCELLED) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }
  if (status === FlightStatus.COMPLETE) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function sourceBadgeClasses(readSource: "FLIGHT_LEG" | "LEG_MISSING_FALLBACK_FLIGHT"): string {
  if (readSource === "FLIGHT_LEG") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function sourceLabel(readSource: "FLIGHT_LEG" | "LEG_MISSING_FALLBACK_FLIGHT"): string {
  if (readSource === "FLIGHT_LEG") {
    return "FlightLeg read";
  }

  return "Fallback Flight read";
}

function severityBadgeClasses(severity: AlertSeverity): string {
  if (severity === AlertSeverity.CRITICAL) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (severity === AlertSeverity.HIGH) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }
  if (severity === AlertSeverity.MEDIUM) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function missingCockpitRoles(assignments: Array<{ seatRole: SeatRole }>): SeatRole[] {
  const assignedRoles = new Set(assignments.map((assignment) => assignment.seatRole));

  return [SeatRole.CPT, SeatRole.FO].filter((role) => !assignedRoles.has(role));
}

function requiresFlightAttendant(item: Pick<AircraftBoardRow, "seats">): boolean {
  return typeof item.seats === "number" && item.seats > 19;
}

function requiredCoverageRoles(item: Pick<AircraftBoardRow, "seats">): SeatRole[] {
  return requiresFlightAttendant(item)
    ? [SeatRole.CPT, SeatRole.FO, SeatRole.FA]
    : [SeatRole.CPT, SeatRole.FO];
}

function flightCoverageBadgeClasses(flight: AircraftBoardRow["flights"][number]): string {
  const coverage = flight.coverage;

  if (!coverage) {
    return "border-zinc-300 bg-white text-zinc-600";
  }
  if (!coverage.isCovered) {
    return "status-badge-stop";
  }
  if (coverage.warnings.length > 0 || coverage.pendingAssignments.length > 0) {
    return "status-badge-caution";
  }

  return "status-badge-success";
}

function flightCoverageLabel(flight: AircraftBoardRow["flights"][number]): string {
  const coverage = flight.coverage;

  if (!coverage) {
    return "Coverage not resolved";
  }
  if (!coverage.isCovered) {
    return `Missing ${coverage.missingRoles.map(formatRoleLabel).join(", ")}`;
  }
  if (coverage.warnings.length > 0) {
    return `${coverage.warnings.length} crew warning${coverage.warnings.length === 1 ? "" : "s"}`;
  }
  if (coverage.pendingAssignments.length > 0) {
    return `${coverage.pendingAssignments.length} pending crew`;
  }

  return "Crew covered";
}

function flightCoverageCrewLine(flight: AircraftBoardRow["flights"][number]): string {
  const assignedCrew = flight.coverage?.assignedCrew.filter((assignment) => assignment.coverageEligible) ?? [];

  if (assignedCrew.length === 0) {
    return "No eligible cockpit crew resolved from aircraft-block assignments.";
  }

  return assignedCrew
    .map(
      (assignment) =>
        `${formatRoleLabel(assignment.seatRole)} ${assignment.crewMemberName}`,
    )
    .join(" | ");
}

function aircraftCoverageSummary(item: AircraftBoardRow): {
  label: string;
  tone: "missing" | "review" | "covered" | "empty";
} {
  if (item.flights.length === 0) {
    return { label: "No upcoming legs", tone: "empty" };
  }

  const missing = item.flights.filter((flight) => flight.coverage && !flight.coverage.isCovered).length;
  const review = item.flights.filter(
    (flight) =>
      flight.coverage &&
      flight.coverage.isCovered &&
      (flight.coverage.warnings.length > 0 || flight.coverage.pendingAssignments.length > 0),
  ).length;

  if (missing > 0) {
    return {
      label: `${missing} leg${missing === 1 ? "" : "s"} missing crew`,
      tone: "missing",
    };
  }
  if (review > 0) {
    return {
      label: `${review} leg${review === 1 ? "" : "s"} need review`,
      tone: "review",
    };
  }

  return {
    label: `${item.flights.length} leg${item.flights.length === 1 ? "" : "s"} covered`,
    tone: "covered",
  };
}

function aircraftCoverageSummaryBadgeClasses(summary: ReturnType<typeof aircraftCoverageSummary>): string {
  if (summary.tone === "missing") {
    return "status-badge-stop";
  }
  if (summary.tone === "review") {
    return "status-badge-caution";
  }
  if (summary.tone === "covered") {
    return "status-badge-success";
  }

  return "border-zinc-300 bg-white text-zinc-600";
}

function aircraftTimelineCoverageSummary(
  item: AircraftBoardRow,
  windowStart: Date,
  windowEnd: Date,
  now: Date,
): {
  label: string;
  tone: "missing" | "review" | "covered" | "empty";
} {
  if (hasCoverageGap(item, windowStart, windowEnd)) {
    return {
      label: "Coverage gap",
      tone: "missing",
    };
  }
  if (hasCoverageReview(item, now)) {
    return {
      label: "Needs review",
      tone: "review",
    };
  }

  return {
    label: "Covered",
    tone: "covered",
  };
}

function clampToWindow(value: Date, windowStart: Date, windowEnd: Date): Date {
  if (value < windowStart) {
    return windowStart;
  }
  if (value > windowEnd) {
    return windowEnd;
  }

  return value;
}

function percentageWithinWindow(value: Date, windowStart: Date, windowEnd: Date): number {
  const total = windowEnd.getTime() - windowStart.getTime();

  if (total <= 0) {
    return 0;
  }

  return ((value.getTime() - windowStart.getTime()) / total) * 100;
}

function timelinePosition(
  startsAt: Date,
  endsAt: Date | null,
  windowStart: Date,
  windowEnd: Date,
): { left: number; width: number } {
  const start = clampToWindow(startsAt, windowStart, windowEnd);
  const end = clampToWindow(endsAt ?? windowEnd, windowStart, windowEnd);
  const left = percentageWithinWindow(start, windowStart, windowEnd);
  const width = Math.max(0.8, percentageWithinWindow(end, windowStart, windowEnd) - left);

  return { left, width };
}

function overlapsTimelineWindow(
  startsAt: Date,
  endsAt: Date | null,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  return startsAt < windowEnd && (!endsAt || endsAt > windowStart);
}

function assignmentWarnings(
  assignment: AircraftBoardRow["coverageAssignments"][number],
  aircraftType: AircraftType,
  now: Date,
): string[] {
  const warnings: string[] = [];

  if (assignment.crewMember.employmentStatus !== "ACTIVE") {
    warnings.push(`Employment ${assignment.crewMember.employmentStatus}`);
  }

  const matchingQualification = assignment.crewMember.qualifications.find(
    (qualification) =>
      qualification.aircraftType === aircraftType && qualification.seatRole === assignment.seatRole,
  );

  if (!matchingQualification) {
    warnings.push("No matching qualification");
  } else if (matchingQualification.expiresAt && matchingQualification.expiresAt < now) {
    warnings.push("Qualification expired");
  }

  return warnings;
}

function laneSegments(
  assignments: AircraftBoardRow["coverageAssignments"],
  seatRole: SeatRole,
  windowStart: Date,
  windowEnd: Date,
): Array<{ endsAt: Date; startsAt: Date; type: "assignment" | "gap"; assignment?: AircraftBoardRow["coverageAssignments"][number] }> {
  const roleAssignments = assignments
    .filter((assignment) => assignment.seatRole === seatRole)
    .filter((assignment) =>
      overlapsTimelineWindow(assignment.startsAt, assignment.endsAt, windowStart, windowEnd),
    )
    .sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime());
  const segments: Array<{
    endsAt: Date;
    startsAt: Date;
    type: "assignment" | "gap";
    assignment?: AircraftBoardRow["coverageAssignments"][number];
  }> = [];
  let cursor = windowStart;

  for (const assignment of roleAssignments) {
    const start = clampToWindow(assignment.startsAt, windowStart, windowEnd);
    const end = clampToWindow(assignment.endsAt ?? windowEnd, windowStart, windowEnd);

    if (start > cursor) {
      segments.push({ endsAt: start, startsAt: cursor, type: "gap" });
    }

    segments.push({ assignment, endsAt: end, startsAt: start, type: "assignment" });

    if (end > cursor) {
      cursor = end;
    }
  }

  if (cursor < windowEnd) {
    segments.push({ endsAt: windowEnd, startsAt: cursor, type: "gap" });
  }

  return segments;
}

function hasLaneGap(
  item: AircraftBoardRow,
  seatRole: SeatRole,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  return laneSegments(item.coverageAssignments, seatRole, windowStart, windowEnd).some(
    (segment) => segment.type === "gap",
  );
}

function hasCoverageGap(item: AircraftBoardRow, windowStart: Date, windowEnd: Date): boolean {
  return requiredCoverageRoles(item).some((seatRole) =>
    hasLaneGap(item, seatRole, windowStart, windowEnd),
  );
}

function hasCoverageReview(item: AircraftBoardRow, now: Date): boolean {
  return item.coverageAssignments.some(
    (assignment) => assignmentWarnings(assignment, item.type, now).length > 0,
  );
}

function hasFlightsInWindow(item: AircraftBoardRow, windowStart: Date, windowEnd: Date): boolean {
  return item.flights.some((flight) =>
    overlapsTimelineWindow(flight.scheduledDeparture, flight.scheduledArrival, windowStart, windowEnd),
  );
}

function isFullyCovered(item: AircraftBoardRow, windowStart: Date, windowEnd: Date, now: Date): boolean {
  return (
    !hasCoverageGap(item, windowStart, windowEnd) &&
    !hasCoverageReview(item, now)
  );
}

function coveragePlannerAircraft(
  aircraft: AircraftBoardRow[],
  filters: CoveragePlannerFilters,
  windowStart: Date,
  windowEnd: Date,
  now: Date,
): AircraftBoardRow[] {
  return aircraft
    .filter((item) => {
      if (filters.aircraftType !== "all" && item.type !== filters.aircraftType) {
        return false;
      }

      return true;
    })
    .sort((first, second) => {
      const rank = (item: AircraftBoardRow) => {
        if (filters.focus === "gap") {
          return hasCoverageGap(item, windowStart, windowEnd) ? 0 : 1;
        }
        if (filters.focus === "review") {
          return hasCoverageReview(item, now) ? 0 : 1;
        }
        if (filters.focus === "covered") {
          return isFullyCovered(item, windowStart, windowEnd, now) ? 0 : 1;
        }
        if (filters.focus === "flights") {
          return hasFlightsInWindow(item, windowStart, windowEnd) ? 0 : 1;
        }

        return 0;
      };
      const rankDelta = rank(first) - rank(second);

      if (rankDelta !== 0) {
        return rankDelta;
      }

      return first.tailNumber.localeCompare(second.tailNumber);
    });
}

function coverageReturnHref(filters: CoveragePlannerFilters): string {
  return aircraftHref({
    aircraftType: filters.aircraftType,
    date: filters.dateInput,
    focus: filters.focus,
    range: filters.range,
    view: "crew-coverage",
  });
}

function coverageFocusHref(filters: CoveragePlannerFilters, focus: CoverageFocus): string {
  return aircraftHref({
    aircraftType: filters.aircraftType,
    date: filters.dateInput,
    focus,
    range: filters.range,
    view: "crew-coverage",
  });
}

function coverageRangeDays(range: CoverageRange): number {
  return Number(range);
}

function coverageShiftDays(range: CoverageRange): number {
  return Number(range);
}

function coverageWindowHref(filters: CoveragePlannerFilters, date: Date, range = filters.range): string {
  return aircraftHref({
    aircraftType: filters.aircraftType,
    date: toDateInput(date),
    focus: filters.focus,
    range,
    view: "crew-coverage",
  });
}

function candidateBadgeClasses(status: AircraftCrewMemberOption["availabilityStatus"]): string {
  if (status === "CLEAR") {
    return "status-badge-success";
  }
  if (status === "UNAVAILABLE") {
    return "status-badge-stop";
  }

  return "status-badge-caution";
}

type CandidateScheduleTone = "assigned" | "assignedElsewhere" | "reserve" | "off" | "unavailable" | "unscheduled";

type CandidateScheduleDay = {
  date: Date;
  dayKey: string;
  label: string;
};

type CandidateScheduleRun = {
  label: string;
  length: number;
  startIndex: number;
  tone: CandidateScheduleTone;
};

type CandidateScheduleDayStatus = {
  label: string;
  tone: CandidateScheduleTone;
};

function compactTailNumber(tailNumber: string): string {
  return tailNumber.replace(/^N/i, "");
}

function crewDisplayName(crewMember: { firstName: string; lastName: string }): string {
  const rawName = `${crewMember.firstName} ${crewMember.lastName}`.trim();
  const cleaned = rawName
    .replace(/\s+\d{3,4}[A-Z]{2}(Captain|Firstofficer|FirstOfficer|Flightattendant|FlightAttendant)$/i, "")
    .replace(/\s+\d{3,4}\s+[A-Za-z]+(?:\s+[A-Za-z]+)*\s+(Captain|First\s*Officer|Flight\s*Attendant)$/i, "")
    .trim();

  return cleaned || rawName;
}

function candidateScheduleToneLabel(tone: CandidateScheduleTone): string {
  const labels: Record<CandidateScheduleTone, string> = {
    assigned: "Assigned",
    assignedElsewhere: "Assigned to tail",
    reserve: "Reserve",
    off: "Off",
    unavailable: "Unavailable",
    unscheduled: "No schedule",
  };

  return labels[tone];
}

function candidateScheduleDays(startsAt: Date | null): CandidateScheduleDay[] {
  const start = startOfDay(startsAt ?? new Date());
  const days: CandidateScheduleDay[] = [];

  for (let cursor = new Date(start); days.length < aircraftCoverageDrawerTimelineDays; cursor = addDays(cursor, 1)) {
    days.push({
      date: new Date(cursor),
      dayKey: toDateInput(cursor),
      label: String(cursor.getDate()),
    });
  }

  return days.length > 0 ? days : [{ date: start, dayKey: toDateInput(start), label: String(start.getDate()) }];
}

function overlapsDateWindow(startsAt: Date, endsAt: Date | null, windowStart: Date, windowEnd: Date): boolean {
  return startsAt < windowEnd && (!endsAt || endsAt > windowStart);
}

function scheduleRowWindow(row: { date: Date; startsAt: Date | null; endsAt: Date | null }) {
  return {
    endsAt: row.endsAt ?? addDays(row.date, 1),
    startsAt: row.startsAt ?? row.date,
  };
}

function scheduleToneForDutyStatus(dutyStatus: DutyStatus): CandidateScheduleTone {
  if (dutyStatus === DutyStatus.ON_DUTY || dutyStatus === DutyStatus.RESERVE || dutyStatus === DutyStatus.DEADHEADING) {
    return "reserve";
  }

  if (dutyStatus === DutyStatus.OFF_DUTY) {
    return "off";
  }

  return "unavailable";
}

function candidateDayStatus(
  crewMember: AircraftCrewMemberOption,
  aircraftId: string,
  dayStart: Date,
): CandidateScheduleDayStatus {
  const dayEnd = addDays(dayStart, 1);
  const overlappingAssignments = crewMember.assignments.filter((assignment) =>
    overlapsDateWindow(assignment.startsAt, assignment.endsAt, dayStart, dayEnd),
  );

  if (overlappingAssignments.some((assignment) => assignment.aircraftId === aircraftId)) {
    return { label: candidateScheduleToneLabel("assigned"), tone: "assigned" };
  }

  if (overlappingAssignments.length > 0) {
    const tailNumbers = Array.from(
      new Set(
        overlappingAssignments.map((assignment) => compactTailNumber(assignment.aircraft.tailNumber)),
      ),
    );

    return {
      label: `Assigned to ${tailNumbers.join(", ")}`,
      tone: "assignedElsewhere",
    };
  }

  if (
    crewMember.timeOffRequests.some((request) =>
      overlapsDateWindow(request.startDate, request.endDate, dayStart, dayEnd),
    )
  ) {
    return { label: candidateScheduleToneLabel("unavailable"), tone: "unavailable" };
  }

  const scheduleRows = [...crewMember.schedules, ...crewMember.scheduleEntries].filter((row) => {
    const rowWindow = scheduleRowWindow(row);
    return overlapsDateWindow(rowWindow.startsAt, rowWindow.endsAt, dayStart, dayEnd);
  });

  if (scheduleRows.length === 0) {
    return { label: candidateScheduleToneLabel("unscheduled"), tone: "unscheduled" };
  }

  if (scheduleRows.some((row) => scheduleToneForDutyStatus(row.dutyStatus) === "unavailable")) {
    return { label: candidateScheduleToneLabel("unavailable"), tone: "unavailable" };
  }

  if (scheduleRows.some((row) => scheduleToneForDutyStatus(row.dutyStatus) === "off")) {
    return { label: candidateScheduleToneLabel("off"), tone: "off" };
  }

  return { label: candidateScheduleToneLabel("reserve"), tone: "reserve" };
}

function candidateScheduleRuns(
  crewMember: AircraftCrewMemberOption,
  aircraftId: string,
  days: CandidateScheduleDay[],
): CandidateScheduleRun[] {
  const runs: CandidateScheduleRun[] = [];

  for (const [index, day] of days.entries()) {
    const status = candidateDayStatus(crewMember, aircraftId, day.date);
    const current = runs[runs.length - 1];

    if (current?.tone === status.tone && current.label === status.label) {
      current.length += 1;
      continue;
    }

    runs.push({
      label: status.label,
      length: 1,
      startIndex: index,
      tone: status.tone,
    });
  }

  return runs;
}

function aircraftDrawerCoverageRoles(
  data: AircraftCrewWorkflowDrawerData,
  selectedRole: SeatRole,
): SeatRole[] {
  const roles: SeatRole[] = [SeatRole.CPT, SeatRole.FO];

  if (
    selectedRole === SeatRole.FA ||
    (typeof data.seats === "number" && data.seats > 19) ||
    data.assignments.some((assignment) => assignment.seatRole === SeatRole.FA)
  ) {
    roles.push(SeatRole.FA);
  }

  if (!roles.includes(selectedRole)) {
    roles.push(selectedRole);
  }

  return roles;
}

function aircraftWorkflowAssignmentSegments(
  assignments: AircraftWorkflowAssignment[],
  seatRole: SeatRole,
  windowStart: Date,
  windowEnd: Date,
): AircraftWorkflowAssignmentSegment[] {
  const roleAssignments = assignments
    .filter((assignment) => assignment.seatRole === seatRole)
    .filter((assignment) =>
      overlapsDateWindow(assignment.startsAt, assignment.endsAt, windowStart, windowEnd),
    )
    .sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime());
  const segments: AircraftWorkflowAssignmentSegment[] = [];
  let cursor = windowStart;

  for (const assignment of roleAssignments) {
    const startsAt = assignment.startsAt < windowStart ? windowStart : assignment.startsAt;
    const assignmentEnd = assignment.endsAt ?? windowEnd;
    const endsAt = assignmentEnd > windowEnd ? windowEnd : assignmentEnd;

    if (startsAt > cursor) {
      segments.push({ endsAt: startsAt, startsAt: cursor, type: "gap" });
    }

    segments.push({ assignment, endsAt, startsAt, type: "assignment" });

    if (endsAt > cursor) {
      cursor = endsAt;
    }
  }

  if (cursor < windowEnd) {
    segments.push({ endsAt: windowEnd, startsAt: cursor, type: "gap" });
  }

  return segments;
}

function candidateHasSeatRole(
  crewMember: AircraftCrewMemberOption,
  aircraftType: AircraftType,
  seatRole: SeatRole,
): boolean {
  return crewMember.qualifications.some(
    (qualification) =>
      qualification.aircraftType === aircraftType && qualification.seatRole === seatRole,
  );
}

function focusChipClasses(
  filters: CoveragePlannerFilters,
  focus: CoverageFocus,
  toneClass: string,
): string {
  const active = filters.focus === focus;

  return `rounded-full border px-2.5 py-1 font-semibold transition ${
    active ? `${toneClass} ring-2 ring-zinc-950/20` : `${toneClass} opacity-80 hover:opacity-100`
  }`;
}

function hasOpenMel(item: AircraftBoardRow): boolean {
  return item.deferrals.length > 0;
}

function openWriteUps(item: AircraftBoardRow) {
  return item.discrepancies.filter((discrepancy) => discrepancy.status === DiscrepancyStatus.OPEN);
}

function hasOpenWriteUp(item: AircraftBoardRow): boolean {
  return openWriteUps(item).length > 0;
}

function aircraftMatchesFilter(item: AircraftBoardRow, filter: AircraftFilter): boolean {
  if (filter === "available") {
    return item.status === AircraftStatus.AVAILABLE;
  }
  if (filter === "in-flight") {
    return item.status === AircraftStatus.IN_FLIGHT;
  }
  if (filter === "aog") {
    return item.status === AircraftStatus.OUT_OF_SERVICE;
  }
  if (filter === "open-mels") {
    return hasOpenMel(item);
  }
  if (filter === "open-writeups") {
    return hasOpenWriteUp(item);
  }

  return true;
}

function SummaryTile({
  active,
  href,
  label,
  tone,
  value,
}: {
  active: boolean;
  href: string;
  label: string;
  tone: "amber" | "blue" | "emerald" | "rose" | "zinc";
  value: number;
}) {
  const toneClasses = {
    amber: "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-300",
    blue: "border-blue-200 bg-blue-50 text-blue-950 hover:border-blue-300",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300",
    rose: "border-rose-200 bg-rose-50 text-rose-950 hover:border-rose-300",
    zinc: "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300",
  }[tone];

  return (
    <Link
      className={`min-w-0 rounded-md border px-2.5 py-2 transition ${toneClasses} ${
        active ? "ring-2 ring-zinc-950/15" : ""
      }`}
      href={href}
    >
      <p className="truncate text-[0.62rem] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-base font-semibold leading-none tabular-nums">{value}</p>
    </Link>
  );
}

function MetricPill({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "amber" | "blue" | "emerald" | "rose" | "zinc";
  value: number;
}) {
  const toneClasses = {
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    rose: "border-rose-200 bg-rose-50 text-rose-950",
    zinc: "border-zinc-200 bg-white text-zinc-950",
  }[tone];

  return (
    <div className={`min-w-0 rounded-md border px-2.5 py-2 ${toneClasses}`}>
      <p className="truncate text-[0.62rem] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-base font-semibold leading-none tabular-nums">{value}</p>
    </div>
  );
}

function CoveragePlannerToolbar({ filters, visibleCount }: {
  filters: CoveragePlannerFilters;
  visibleCount: number;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <form className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,0.8fr)_minmax(9rem,0.7fr)_minmax(10rem,0.8fr)_auto]" method="get">
          <input name="view" type="hidden" value="crew-coverage" />
          <label className="block min-w-0">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              Aircraft type
            </span>
            <select
              className="mt-1 h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm font-medium text-zinc-900"
              defaultValue={filters.aircraftType}
              name="aircraftType"
            >
              <option value="all">All types</option>
              {Object.values(AircraftType).map((type) => (
                <option key={type} value={type}>
                  {formatAircraftType(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              Start date
            </span>
            <input
              className="mt-1 h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm font-medium text-zinc-900"
              defaultValue={filters.dateInput}
              name="date"
              type="date"
            />
          </label>
          <label className="block min-w-0">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              Window
            </span>
            <select
              className="mt-1 h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm font-medium text-zinc-900"
              defaultValue={filters.range}
              name="range"
            >
              <option value="1">Day</option>
              <option value="7">7 days</option>
              <option value="28">4 weeks</option>
              <option value="56">8 weeks</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              type="submit"
            >
              Apply
            </button>
            <Link
              className="inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              href="/aircraft?view=crew-coverage"
            >
              Reset
            </Link>
          </div>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            href="/aircraft"
          >
            Fleet
          </Link>
          <Link
            className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            href={aircraftHref({
              aircraftType: filters.aircraftType,
              date: filters.dateInput,
              focus: filters.focus,
              range: filters.range,
              view: "crew-coverage",
            })}
          >
            Crew coverage
          </Link>
          <Link
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            href={aircraftHref({
              aircraftType: filters.aircraftType,
              date: filters.dateInput,
              focus: filters.focus,
              panel: "create",
              range: filters.range,
              view: "crew-coverage",
            })}
          >
            Add aircraft
          </Link>
          <Link
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            href="/crew/scheduling"
          >
            Crew planner
          </Link>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
            {visibleCount} aircraft
          </span>
        </div>
      </div>
    </section>
  );
}

function AircraftFleetToolbar({
  now,
  selectedFilter,
}: {
  now: Date;
  selectedFilter: AircraftFilter;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            href={aircraftHref({ filter: selectedFilter, view: "fleet" })}
          >
            Fleet
          </Link>
          <Link
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            href="/aircraft?view=crew-coverage"
          >
            Crew coverage
          </Link>
          <Link
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            href={aircraftHref({ filter: selectedFilter, panel: "create" })}
          >
            Add aircraft
          </Link>
        </div>
        <span className="text-sm text-zinc-500">Live Prisma read at {toDateTime(now)}</span>
      </div>
    </section>
  );
}

function currentOrNextFlight(item: AircraftBoardRow, now: Date) {
  const currentFlight =
    item.flights.find(
      (flight) =>
        flight.status === FlightStatus.ENROUTE ||
        (flight.scheduledDeparture <= now && flight.scheduledArrival >= now),
    ) ?? null;
  const nextFlight = item.flights.find((flight) => flight.scheduledDeparture > now) ?? null;

  return currentFlight ?? nextFlight;
}

function scheduleFlightsInWindow(item: AircraftBoardRow, now: Date, days: number) {
  const windowEnd = addDays(now, days);

  return item.flights.filter(
    (flight) => flight.scheduledArrival >= now && flight.scheduledDeparture < windowEnd,
  );
}

function latestCompletedMaintenanceEvent(item: AircraftBoardRow) {
  return (
    item.maintenanceEvents
      .filter((event) => event.status === MaintenanceEventStatus.COMPLETED)
      .sort(
        (first, second) =>
          (second.completedAt?.getTime() ?? 0) - (first.completedAt?.getTime() ?? 0),
      )[0] ?? null
  );
}

function AircraftFleetList({
  aircraft,
  now,
  selectedFilter,
}: {
  aircraft: AircraftBoardRow[];
  now: Date;
  selectedFilter: AircraftFilter;
}) {
  return (
    <section className="rounded-xl bg-white p-1 shadow-sm">
      <div className="hidden grid-cols-[minmax(9rem,1fr)_minmax(8rem,0.8fr)_minmax(14rem,1.6fr)] px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500 md:grid">
        <span className="px-3 py-2">Aircraft</span>
        <span className="px-3 py-2">Status</span>
        <span className="px-3 py-2">Current / next leg</span>
      </div>
      <div className="grid gap-1">
        {aircraft.map((item, index) => {
          const displayedFlight = currentOrNextFlight(item, now);
          const rowHref = aircraftHref({
            filter: selectedFilter,
            panel: "aircraft",
            selected: item.id,
          });

          return (
            <Link
              className={`grid rounded-lg transition focus:outline-none focus:ring-2 focus:ring-zinc-950/15 md:grid-cols-[minmax(9rem,1fr)_minmax(8rem,0.8fr)_minmax(14rem,1.6fr)] md:items-stretch ${
                index % 2 === 0 ? "bg-white hover:bg-zinc-50" : "bg-zinc-100 hover:bg-zinc-200"
              }`}
              href={rowHref}
              key={item.id}
            >
              <div className="min-w-0 px-3 py-3 md:min-h-[4.5rem]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base font-semibold text-zinc-950">
                    {item.tailNumber}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[0.65rem] font-semibold text-zinc-600">
                    {formatAircraftType(item.type)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {item.homeStation ? `${item.homeStation.code} - ${item.homeStation.city}` : "No base"}
                  {item.seats ? ` | ${item.seats} seats` : ""}
                </p>
              </div>

              <div className="flex flex-wrap content-start gap-1.5 px-3 py-3 md:min-h-[4.5rem]">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${aircraftStatusBadgeClasses(
                    item.status,
                  )}`}
                >
                  {aircraftStatusLabel(item.status)}
                </span>
                {item.alerts.length > 0 ? (
                  <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[0.68rem] font-semibold text-rose-700">
                    {item.alerts.length} alert{item.alerts.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>

              <div className="min-w-0 px-3 py-3 text-sm md:min-h-[4.5rem]">
                {displayedFlight ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-zinc-950">
                        {displayedFlight.flightNumber}
                      </span>
                      <span className="font-medium text-zinc-700">
                        {displayedFlight.departureStation.code} -&gt; {displayedFlight.arrivalStation.code}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {toDateTime(displayedFlight.scheduledDeparture)} - {toDateTime(displayedFlight.scheduledArrival)}
                    </p>
                  </>
                ) : (
                  <span className="text-xs font-medium text-zinc-500">No current or upcoming leg</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function TimelineHeader({
  days,
  filters,
  now,
  windowStart,
}: {
  days: number;
  filters: CoveragePlannerFilters;
  now: Date;
  windowStart: Date;
}) {
  const gridTemplateColumns = timelineHeaderGridTemplate(filters.range, days);
  const previousDate = addDays(filters.date, -coverageShiftDays(filters.range));
  const nextDate = addDays(filters.date, coverageShiftDays(filters.range));

  if (filters.range === "1") {
    const hours = Array.from({ length: 24 }, (_, index) => addHours(windowStart, index));

    return (
      <div
        className="border-b border-zinc-200 bg-zinc-50"
        style={{ minWidth: `${timelineMinWidth(filters.range, days)}px` }}
      >
        <div className="grid border-b border-zinc-200" style={{ gridTemplateColumns }}>
          <Link
            className="flex items-center justify-center border-r border-zinc-200 px-1 py-2 text-[0.62rem] font-semibold text-zinc-700 hover:bg-zinc-100"
            href={coverageWindowHref(filters, previousDate)}
          >
            Prev
          </Link>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-r border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-700" style={{ gridColumn: "2 / span 24" }}>
            <span />
            <span>{formatFullDateLabel(windowStart)}</span>
            <Link
              className="justify-self-end rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[0.62rem] font-semibold text-zinc-700 hover:bg-zinc-50"
              href={coverageWindowHref(filters, nextDate)}
            >
              Next
            </Link>
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns }}>
          <div className="border-r border-zinc-200 px-1 py-2 text-center text-[0.62rem] font-semibold text-zinc-500">
            Time
          </div>
          {hours.map((marker) => {
            const currentHour =
              isSameCalendarDate(marker, now) && marker.getHours() === now.getHours();

            return (
              <div
                className={`flex items-center justify-center border-r px-1 py-2 text-center text-[0.62rem] font-semibold ${
                  currentHour
                    ? "border-zinc-950 bg-zinc-700 text-white ring-1 ring-inset ring-zinc-950/40"
                    : "border-zinc-200 text-zinc-500"
                }`}
                key={marker.toISOString()}
              >
                {formatHourLabel(marker)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const markers = Array.from({ length: days }, (_, index) => addDays(windowStart, index));
  const segments = monthHeaderSegments(markers);

  return (
    <div
      className="border-b border-zinc-200 bg-zinc-50"
      style={{ minWidth: `${timelineMinWidth(filters.range, days)}px` }}
    >
      <div className="grid border-b border-zinc-200" style={{ gridTemplateColumns }}>
        <Link
          className="flex items-center justify-center border-r border-zinc-200 px-1 py-2 text-[0.62rem] font-semibold text-zinc-700 hover:bg-zinc-100"
          href={coverageWindowHref(filters, previousDate)}
        >
          Prev
        </Link>
        {segments.map((segment, index) => (
          <div
            className="flex items-center justify-center border-r border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-700"
            key={`${segment.label}-${segment.startIndex}`}
            style={{ gridColumn: `${segment.startIndex + 2} / span ${segment.length}` }}
          >
            {index === segments.length - 1 ? (
              <span className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
                <span />
                <span>{segment.label}</span>
                <Link
                  className="justify-self-end rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[0.62rem] font-semibold text-zinc-700 hover:bg-zinc-50"
                  href={coverageWindowHref(filters, nextDate)}
                >
                  Next
                </Link>
              </span>
            ) : (
              segment.label
            )}
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns }}>
        <div className="border-r border-zinc-200 px-1 py-2 text-center text-[0.62rem] font-semibold text-zinc-500">
          Lane
        </div>
        {markers.map((marker) => {
          const isToday = isSameCalendarDate(marker, now);

          return (
            <Link
              className={`flex items-center justify-center border-r px-1 py-2 text-center text-[0.62rem] font-semibold ${
                isToday
                  ? "border-zinc-950 bg-zinc-700 text-white ring-1 ring-inset ring-zinc-950/40"
                  : "border-zinc-200 text-zinc-500 hover:bg-sky-50 hover:text-sky-800"
              }`}
              href={coverageWindowHref(filters, marker, "1")}
              key={marker.toISOString()}
              title={`Drill into ${formatFullDateLabel(marker)}`}
            >
              <span className="block w-full overflow-hidden whitespace-nowrap">
                {formatDateLabel(marker)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TodayColumnMarker({
  now,
  windowEnd,
  windowStart,
}: {
  now: Date;
  windowEnd: Date;
  windowStart: Date;
}) {
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);

  if (!overlapsTimelineWindow(todayStart, todayEnd, windowStart, windowEnd)) {
    return null;
  }

  const position = timelinePosition(todayStart, todayEnd, windowStart, windowEnd);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-y-0 bg-zinc-700"
      style={{
        left: `${position.left}%`,
        width: `${position.width}%`,
      }}
    />
  );
}

function FlightMarkers({
  item,
  now,
  windowEnd,
  windowStart,
}: {
  item: AircraftBoardRow;
  now: Date;
  windowEnd: Date;
  windowStart: Date;
}) {
  const flights = item.flights.filter((flight) =>
    overlapsTimelineWindow(flight.scheduledDeparture, flight.scheduledArrival, windowStart, windowEnd),
  );

  return (
    <div className="relative h-8 border-b border-zinc-100 bg-white">
      <div className="absolute left-0 top-0 z-10 flex h-full w-11 items-center border-r border-zinc-200 bg-zinc-50 px-2 text-[0.65rem] font-semibold text-zinc-600">
        FLT
      </div>
      <div className="absolute inset-y-0 left-11 right-0 overflow-hidden">
        <TodayColumnMarker now={now} windowEnd={windowEnd} windowStart={windowStart} />
        {flights.map((flight) => {
          const position = timelinePosition(
            flight.scheduledDeparture,
            flight.scheduledArrival,
            windowStart,
            windowEnd,
          );

          return (
            <div
              className="absolute top-1 h-6 overflow-hidden rounded border border-sky-300 bg-sky-50 px-1 text-[0.62rem] font-semibold leading-6 text-sky-800"
              key={flight.id}
              style={{
                left: `${position.left}%`,
                width: `${Math.max(position.width, 1.5)}%`,
              }}
              title={`${flight.flightNumber} ${flight.departureStation.code} to ${flight.arrivalStation.code}`}
            >
              {flight.flightNumber}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CoverageLane({
  filters,
  item,
  seatRole,
  windowEnd,
  windowStart,
  now,
}: {
  filters: CoveragePlannerFilters;
  item: AircraftBoardRow;
  seatRole: SeatRole;
  windowEnd: Date;
  windowStart: Date;
  now: Date;
}) {
  const segments = laneSegments(item.coverageAssignments, seatRole, windowStart, windowEnd);

  return (
    <div className="relative h-10 border-b border-zinc-100 bg-white">
      <div className="absolute left-0 top-0 z-10 flex h-full w-11 items-center border-r border-zinc-200 bg-zinc-50 px-2 text-[0.65rem] font-semibold text-zinc-600">
        {formatRoleLabel(seatRole)}
      </div>
      <div className="absolute inset-y-0 left-11 right-0 overflow-hidden">
        <TodayColumnMarker now={now} windowEnd={windowEnd} windowStart={windowStart} />
        {segments.map((segment) => {
          const position = timelinePosition(segment.startsAt, segment.endsAt, windowStart, windowEnd);

          if (segment.type === "gap") {
            return (
              <Link
                className="absolute top-1 h-8 overflow-hidden rounded border border-red-700 bg-red-600 px-1 text-center text-[0.62rem] font-semibold leading-8 text-white hover:bg-red-700"
                href={aircraftHref({
                  aircraftType: filters.aircraftType,
                  date: filters.dateInput,
                  endsAt: segment.endsAt.toISOString(),
                  panel: "assign",
                  range: filters.range,
                  role: seatRole,
                  selected: item.id,
                  startsAt: segment.startsAt.toISOString(),
                  view: "crew-coverage",
                })}
                key={`${item.id}-${seatRole}-gap-${segment.startsAt.toISOString()}`}
                style={{
                  left: `${position.left}%`,
                  width: `${position.width}%`,
                }}
                title={`Assign ${formatRoleLabel(seatRole)} to ${item.tailNumber}`}
              >
                {position.width > 8 ? "Gap" : ""}
              </Link>
            );
          }

          const assignment = segment.assignment;
          if (!assignment) {
            return null;
          }

          const warnings = assignmentWarnings(assignment, item.type, now);
          const toneClasses =
            warnings.length > 0
              ? "border-amber-700 bg-amber-500 text-white"
              : "border-emerald-700 bg-emerald-600 text-white";

          return (
            <Link
              className={`absolute top-1 h-8 overflow-hidden rounded border px-1 text-[0.62rem] font-semibold leading-8 hover:brightness-95 ${toneClasses}`}
              href={`/aircraft/${item.id}/crew`}
              key={`${item.id}-${seatRole}-${assignment.id}`}
              style={{
                left: `${position.left}%`,
                width: `${position.width}%`,
              }}
              title={`${assignment.crewMember.firstName} ${assignment.crewMember.lastName}${
                warnings.length ? ` | ${warnings.join("; ")}` : ""
              }`}
            >
              {assignment.crewMember.firstName} {assignment.crewMember.lastName}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function AircraftCoveragePlanner({
  aircraft,
  filters,
  now,
}: {
  aircraft: AircraftBoardRow[];
  filters: CoveragePlannerFilters;
  now: Date;
}) {
  const days = coverageRangeDays(filters.range);
  const windowStart = startOfDay(filters.date);
  const windowEnd = addDays(windowStart, days);
  const shiftDays = coverageShiftDays(filters.range);
  const previousDate = addDays(filters.date, -shiftDays);
  const nextDate = addDays(filters.date, shiftDays);
  const visibleAircraft = coveragePlannerAircraft(aircraft, filters, windowStart, windowEnd, now);
  return (
    <>
      <CoveragePlannerToolbar filters={filters} visibleCount={visibleAircraft.length} />
      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[18rem] flex-1">
              <h2 className="text-sm font-semibold text-zinc-950">Aircraft crew coverage planner</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {filters.range === "1"
                  ? `${formatFullDateLabel(windowStart)} shown hour by hour.`
                  : `${formatDateLabel(windowStart)} through ${formatDateLabel(addDays(windowEnd, -1))}. Click a date to drill into the day.`}{" "}
                Flight markers are context; red gaps are missing aircraft crew coverage.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
              <div className="flex items-center overflow-hidden rounded-md border border-zinc-300 bg-white">
                <Link
                  className="px-2 py-1 text-[0.68rem] font-semibold text-zinc-700 hover:bg-zinc-50"
                  href={coverageWindowHref(filters, previousDate)}
                >
                  Prev
                </Link>
                <Link
                  className="border-l border-zinc-300 px-2 py-1 text-[0.68rem] font-semibold text-zinc-700 hover:bg-zinc-50"
                  href={coverageWindowHref(filters, startOfDay(now))}
                >
                  Today
                </Link>
                <Link
                  className="border-l border-zinc-300 px-2 py-1 text-[0.68rem] font-semibold text-zinc-700 hover:bg-zinc-50"
                  href={coverageWindowHref(filters, nextDate)}
                >
                  Next
                </Link>
              </div>
              <Link
                className={focusChipClasses(filters, "covered", "status-badge-success")}
                href={coverageFocusHref(filters, "covered")}
              >
                Covered
              </Link>
              <Link
                className={focusChipClasses(filters, "review", "status-badge-caution")}
                href={coverageFocusHref(filters, "review")}
              >
                Review
              </Link>
              <Link
                className={focusChipClasses(filters, "gap", "status-badge-stop")}
                href={coverageFocusHref(filters, "gap")}
              >
                Gap
              </Link>
              <Link
                className={focusChipClasses(
                  filters,
                  "flights",
                  "border-sky-300 bg-sky-50 text-sky-800",
                )}
                href={coverageFocusHref(filters, "flights")}
              >
                Flight
              </Link>
              {filters.focus !== "all" ? (
                <Link
                  className="rounded-full border border-zinc-300 bg-white px-2.5 py-1 font-semibold text-zinc-600 hover:bg-zinc-50"
                  href={coverageFocusHref(filters, "all")}
                >
                  Clear focus
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        {visibleAircraft.length === 0 ? (
          <div className="p-4 text-sm text-zinc-600">No aircraft match this coverage view.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[980px] grid-cols-[15rem_1fr]">
              <div className="flex items-center justify-between gap-2 border-b border-r border-zinc-200 bg-zinc-50 p-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <span>Aircraft</span>
                <Link
                  className="rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-[0.65rem] font-semibold normal-case tracking-normal text-zinc-800 hover:bg-zinc-50"
                  href={coverageWindowHref(filters, startOfDay(now))}
                >
                  Today
                </Link>
              </div>
              <TimelineHeader days={days} filters={filters} now={now} windowStart={windowStart} />
              {visibleAircraft.map((item) => {
                const summary = aircraftTimelineCoverageSummary(item, windowStart, windowEnd, now);

                return (
                  <div className="contents" key={item.id}>
                    <div className="border-r border-t border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="font-mono text-sm font-semibold text-sky-700 hover:text-sky-900"
                          href={aircraftHref({
                            aircraftType: filters.aircraftType,
                            date: filters.dateInput,
                            panel: "aircraft",
                            range: filters.range,
                            selected: item.id,
                            view: "crew-coverage",
                          })}
                        >
                          {item.tailNumber}
                        </Link>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${aircraftCoverageSummaryBadgeClasses(
                            summary,
                          )}`}
                        >
                          {summary.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-600">
                        {formatAircraftType(item.type)}
                        {item.homeStation ? ` | ${item.homeStation.code}` : ""}
                        {item.seats ? ` | ${item.seats} seats` : ""}
                      </p>
                      {requiresFlightAttendant(item) ? (
                        <p className="mt-1 text-[0.68rem] font-medium text-amber-700">
                          FA lane shown for 20+ passenger seats
                        </p>
                      ) : null}
                      <p className="mt-1 text-[0.68rem] text-zinc-500">
                        {item.flights.length} upcoming leg{item.flights.length === 1 ? "" : "s"} in view
                      </p>
                    </div>
                    <div
                      className="border-t border-zinc-200"
                      style={{ minWidth: `${timelineMinWidth(filters.range, days)}px` }}
                    >
                      <FlightMarkers item={item} now={now} windowEnd={windowEnd} windowStart={windowStart} />
                      {requiredCoverageRoles(item).map((seatRole) => (
                        <CoverageLane
                          filters={filters}
                          item={item}
                          key={`${item.id}-${seatRole}`}
                          now={now}
                          seatRole={seatRole}
                          windowEnd={windowEnd}
                          windowStart={windowStart}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function AircraftDrawer({
  aircraft,
  selectedFilter,
  selectedId,
}: {
  aircraft: AircraftBoardRow[];
  selectedFilter: AircraftFilter;
  selectedId: string | null;
}) {
  if (!selectedId) {
    return null;
  }

  const item = aircraft.find((aircraftRow) => aircraftRow.id === selectedId);
  const closeHref = aircraftHref({ filter: selectedFilter });

  if (!item) {
    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Aircraft quick review" title="Aircraft">
        <p className="text-sm text-zinc-600">No aircraft found for this selection.</p>
      </ContextDrawer>
    );
  }

  const now = new Date();
  const currentFlight =
    item.flights.find(
      (flight) =>
        flight.status === FlightStatus.ENROUTE ||
        (flight.scheduledDeparture <= now && flight.scheduledArrival >= now),
    ) ?? null;
  const nextFlight = item.flights.find((flight) => flight.scheduledDeparture > now) ?? null;
  const displayedFlight = currentFlight ?? nextFlight;
  const scheduleFlights = scheduleFlightsInWindow(item, now, 7);
  const currentFlightDisplay = displayedFlight
    ? {
        flightNumber: displayedFlight.flightNumber,
        routeLabel: `${displayedFlight.departureStation.code} -> ${displayedFlight.arrivalStation.code}`,
        windowLabel: toCompactFlightWindow(
          displayedFlight.scheduledDeparture,
          displayedFlight.scheduledArrival,
        ),
      }
    : null;
  const scheduleFlightDisplays = scheduleFlights.map((flight) => ({
    flightLegId: flight.flightLegId,
    flightNumber: flight.flightNumber,
    id: `${flight.readSource}-${flight.id}`,
    routeLabel: `${flight.departureStation.code} -> ${flight.arrivalStation.code}`,
    statusClassName: flightStatusBadgeClasses(flight.status),
    statusLabel: formatValueLabel(flight.status),
    windowLabel: toCompactFlightWindow(flight.scheduledDeparture, flight.scheduledArrival),
  }));
  const serviceability = evaluateAircraftServiceability(item, now);

  return (
    <ContextDrawer
      closeHref={closeHref}
      eyebrow="Aircraft quick review"
      title={`${item.tailNumber} | ${formatAircraftType(item.type)}`}
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${aircraftStatusBadgeClasses(item.status)}`}>
              {aircraftStatusLabel(item.status)}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${serviceabilityBadgeClasses(
                serviceability.tone,
              )}`}
            >
              {serviceability.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            Home station {item.homeStation ? `${item.homeStation.code} - ${item.homeStation.city}` : "not assigned"}
          </p>
          <p className="mt-1 text-sm text-zinc-600">{serviceability.message}</p>
        </section>

        <AircraftScheduleDropdown
          currentFlight={currentFlightDisplay}
          flights={scheduleFlightDisplays}
          fullScheduleHref={`/aircraft/${item.id}#upcoming-legs`}
        />

        <Link
          className="block rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-sky-200 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
          href={`/aircraft/${item.id}/logbook`}
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Maintenance state
          </h3>
          <p className="mt-2 text-sm text-zinc-700">
            {openWriteUps(item).length} open write-up
            {openWriteUps(item).length === 1 ? "" : "s"} | {item.deferrals.length} open MEL
            {item.deferrals.length === 1 ? "" : "s"}
          </p>
        </Link>

        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white" href={`/aircraft/${item.id}`}>
            Aircraft context
          </Link>
          <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700" href={`/aircraft/${item.id}/fuel`}>
            Fuel ledger
          </Link>
          <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700" href={`/aircraft/${item.id}/airworthiness`}>
            Airworthiness
          </Link>
        </div>
      </div>
    </ContextDrawer>
  );
}

function AircraftCoverageAssignDrawer({
  closeHref,
  data,
  endsAt,
  error,
  role,
  selectedCrewId,
  selectedId,
  startsAt,
  success,
}: {
  closeHref: string;
  data: Awaited<ReturnType<typeof getAircraftCrewWorkflowData>> | null;
  endsAt: Date | null;
  error: string | null;
  role: SeatRole;
  selectedCrewId: string | null;
  selectedId: string | null;
  startsAt: Date | null;
  success: string | null;
}) {
  if (!selectedId) {
    return null;
  }

  if (!data) {
    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Crew coverage" title="Assign crew">
        <p className="text-sm text-zinc-600">No aircraft found for this coverage assignment.</p>
      </ContextDrawer>
    );
  }

  const createAction = createAircraftCrewAssignmentAction.bind(null, selectedId);
  const savePublishedAction = saveAircraftCoveragePublishedAssignmentAction.bind(null, selectedId);
  const candidateDays = candidateScheduleDays(startsAt);
  const contextWindowStart = startsAt ?? candidateDays[0]?.date ?? startOfDay(new Date());
  const contextWindowEnd =
    candidateDays.length > 0
      ? addDays(candidateDays[candidateDays.length - 1].date, 1)
      : endsAt && endsAt > contextWindowStart
        ? endsAt
        : addDays(contextWindowStart, 1);
  const crewOptions = [...data.crewOptions].sort((first, second) => {
    const firstWarnings = first.warningsBySeatRole[role]?.length ?? 0;
    const secondWarnings = second.warningsBySeatRole[role]?.length ?? 0;

    if (first.availabilityStatus !== second.availabilityStatus) {
      const order = { CLEAR: 0, CAUTION: 1, UNAVAILABLE: 2 };
      return order[first.availabilityStatus] - order[second.availabilityStatus];
    }

    if (firstWarnings !== secondWarnings) {
      return firstWarnings - secondWarnings;
    }

    return first.lastName.localeCompare(second.lastName);
  });
  const roleCandidates = crewOptions.filter((crewMember) =>
    candidateHasSeatRole(crewMember, data.type, role),
  ).sort((first, second) => {
    if (first.id === selectedCrewId) {
      return -1;
    }

    if (second.id === selectedCrewId) {
      return 1;
    }

    return 0;
  });
  const assignmentStartValue = toInputDateTime(startsAt);
  const assignmentEndValue = toInputDateTime(endsAt);
  const selectionBase = {
    date: startsAt ? toDateInput(startsAt) : null,
    endsAt: endsAt?.toISOString() ?? null,
    panel: "assign" as const,
    role,
    selected: data.id,
    startsAt: startsAt?.toISOString() ?? null,
    view: "crew-coverage" as const,
  };
  const navigationDayCount = Math.max(candidateDays.length, 1);
  const currentWindowStart = startOfDay(new Date());
  const currentWindowEnd = addDays(currentWindowStart, navigationDayCount);
  const previousWindowStart = addDays(contextWindowStart, -navigationDayCount);
  const previousWindowEnd = addDays(contextWindowEnd, -navigationDayCount);
  const nextWindowStart = addDays(contextWindowStart, navigationDayCount);
  const nextWindowEnd = addDays(contextWindowEnd, navigationDayCount);
  const navigationBase = {
    panel: "assign" as const,
    role,
    selected: data.id,
    selectedCrew: selectedCrewId,
    view: "crew-coverage" as const,
  };
  const coverageNavigation = {
    currentHref: aircraftHref({
      ...navigationBase,
      date: toDateInput(currentWindowStart),
      endsAt: currentWindowEnd.toISOString(),
      startsAt: currentWindowStart.toISOString(),
    }),
    currentLabel: "Current",
    nextHref: aircraftHref({
      ...navigationBase,
      date: toDateInput(nextWindowStart),
      endsAt: nextWindowEnd.toISOString(),
      startsAt: nextWindowStart.toISOString(),
    }),
    previousHref: aircraftHref({
      ...navigationBase,
      date: toDateInput(previousWindowStart),
      endsAt: previousWindowEnd.toISOString(),
      startsAt: previousWindowStart.toISOString(),
    }),
  };
  const drawerReturnHref = aircraftHref({
    ...selectionBase,
    selectedCrew: selectedCrewId,
  });
  const headerMessage = error
    ? { text: decodeURIComponent(error), tone: "error" as const }
    : success
      ? { text: decodeURIComponent(success), tone: "success" as const }
      : null;
  const visibleRoleCandidates = roleCandidates.slice(0, 12);
  const stagingDays = candidateDays.map((day) => ({
    dateIso: day.date.toISOString(),
    dayKey: day.dayKey,
    label: day.label,
  }));
  const stagingFlights = data.upcomingLegs
    .filter((flight) =>
      overlapsDateWindow(flight.scheduledDeparture, flight.scheduledArrival, contextWindowStart, contextWindowEnd),
    )
    .map((flight) => ({
      arrivalCode: flight.arrivalStation.code,
      departureCode: flight.departureStation.code,
      endIso: flight.scheduledArrival.toISOString(),
      flightNumber: flight.flightNumber ?? "UNNUMBERED",
      id: flight.id,
      startIso: flight.scheduledDeparture.toISOString(),
    }));
  const stagingLanes = aircraftDrawerCoverageRoles(data, role).map((seatRole) => ({
    label: formatRoleLabel(seatRole),
    role: seatRole,
    segments: aircraftWorkflowAssignmentSegments(
      data.assignments,
      seatRole,
      contextWindowStart,
      contextWindowEnd,
    ).map((segment) => ({
      crewName: segment.assignment ? crewDisplayName(segment.assignment.crewMember) : undefined,
      endIso: segment.endsAt.toISOString(),
      id: segment.assignment
        ? `${seatRole}-${segment.assignment.id}`
        : `${seatRole}-gap-${segment.startsAt.toISOString()}`,
      startIso: segment.startsAt.toISOString(),
      type: segment.type,
    })),
  }));
  const stagingCandidates = visibleRoleCandidates.map((crewMember) => {
    const isSelectedCrew = crewMember.id === selectedCrewId;
    const displayName = crewDisplayName(crewMember);
    const roleWarnings = crewMember.warningsBySeatRole[role] ?? [];
    const warningMessages = [...roleWarnings, ...crewMember.availabilityWarnings];
    const selectionHref = aircraftHref({
      ...selectionBase,
      selectedCrew: isSelectedCrew ? null : crewMember.id,
    });

    return {
      availabilityLabel: formatValueLabel(crewMember.availabilityStatus),
      availabilityToneClass: candidateBadgeClasses(crewMember.availabilityStatus),
      displayName,
      employeeNumber: crewMember.employeeNumber,
      id: crewMember.id,
      isSelected: isSelectedCrew,
      metaLabel: `${formatAircraftType(data.type)} ${formatRoleLabel(role)} | Base ${
        crewMember.locationRecords[0]?.station?.code ?? data.homeStation?.code ?? "not set"
      }`,
      runs: candidateScheduleRuns(crewMember, data.id, candidateDays).map((run) => {
        const runStart = candidateDays[run.startIndex]?.date ?? contextWindowStart;
        const runEnd = addDays(candidateDays[run.startIndex + run.length - 1]?.date ?? runStart, 1);
        const startsAt = runStart > contextWindowStart ? runStart : contextWindowStart;
        const endsAt = runEnd < contextWindowEnd ? runEnd : contextWindowEnd;

        return {
          endIso: endsAt.toISOString(),
          label: run.label,
          length: run.length,
          startIndex: run.startIndex,
          startIso: startsAt.toISOString(),
          tone: run.tone,
        };
      }),
      selectionHref,
      warningMessages,
    };
  });

  return (
    <ContextDrawer
      closeHref={closeHref}
      eyebrow="Aircraft coverage"
      size="wide"
      title={`${formatRoleLabel(role)} coverage for ${data.tailNumber}`}
    >
      <div className="space-y-3">
        <AircraftCoverageStagingClient
          aircraftTypeLabel={formatAircraftType(data.type)}
          candidates={stagingCandidates}
          days={stagingDays}
          flightSegments={stagingFlights}
          gapEndIso={endsAt?.toISOString() ?? null}
          gapStartIso={startsAt?.toISOString() ?? null}
          message={headerMessage}
          navigation={coverageNavigation}
          lanes={stagingLanes}
          role={role}
          roleLabel={formatRoleLabel(role)}
          returnTo={drawerReturnHref}
          saveAction={savePublishedAction}
          selectedCrewId={selectedCrewId}
          tailNumber={data.tailNumber}
          windowEndIso={contextWindowEnd.toISOString()}
          windowStartIso={contextWindowStart.toISOString()}
        />

        <details className="rounded-xl border border-zinc-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-950">
            Manual assignment details
          </summary>
          <form action={createAction} className="mt-3">
            <input name="returnTo" type="hidden" value={closeHref} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-zinc-600">Crew member</span>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-950"
                  name="crewMemberId"
                  required
                >
                  <option value="">Select crew member</option>
                  {roleCandidates.map((crewMember) => (
                    <option key={crewMember.id} value={crewMember.id}>
                      {crewDisplayName(crewMember)} #{crewMember.employeeNumber} -{" "}
                      {crewMember.availabilityStatus}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-600">Role</span>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-950"
                  defaultValue={role}
                  name="seatRole"
                  required
                >
                  <option value={role}>{formatRoleLabel(role)}</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-600">Start</span>
                <input
                  className="mt-1 h-10 w-full rounded-md border border-zinc-300 px-2 text-sm text-zinc-950"
                  defaultValue={assignmentStartValue}
                  name="startsAt"
                  required
                  type="datetime-local"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-600">End</span>
                <input
                  className="mt-1 h-10 w-full rounded-md border border-zinc-300 px-2 text-sm text-zinc-950"
                  defaultValue={assignmentEndValue}
                  name="endsAt"
                  type="datetime-local"
                />
              </label>
            </div>
            <label className="mt-3 block">
              <span className="text-xs font-medium text-zinc-600">Notes</span>
              <textarea
                className="mt-1 min-h-20 w-full rounded-md border border-zinc-300 px-2 py-2 text-sm text-zinc-950"
                name="notes"
                placeholder="Optional coverage note"
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                href={closeHref}
              >
                Cancel
              </Link>
              <button
                className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                type="submit"
              >
                Assign to aircraft block
              </button>
            </div>
          </form>
        </details>
      </div>
    </ContextDrawer>
  );
}

function AircraftCreateDrawer({
  closeHref,
  error,
  options,
  selectedFilter,
}: {
  closeHref: string;
  error: string | null;
  options: AircraftCreateOptions;
  selectedFilter: AircraftFilter;
}) {
  return (
    <ContextDrawer closeHref={closeHref} eyebrow="Aircraft setup" title="Add aircraft">
      <form action={createAircraftAction} className="space-y-4">
        <input name="returnFilter" type="hidden" value={selectedFilter} />
        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-700">
            Tail number
            <input
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm uppercase"
              name="tailNumber"
              placeholder="N215AO"
              required
            />
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Aircraft type
            <select
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              name="type"
              required
            >
              {Object.values(AircraftType).map((type) => (
                <option key={type} value={type}>
                  {formatAircraftType(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Status
            <select
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              defaultValue={AircraftStatus.AVAILABLE}
              name="status"
              required
            >
              {Object.values(AircraftStatus).map((status) => (
                <option key={status} value={status}>
                  {aircraftStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Home station
            <select
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              name="homeStationId"
            >
              <option value="">Not assigned</option>
              {options.stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.code} - {station.city}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Name
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              name="name"
              placeholder="Optional"
            />
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Seats
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              min="1"
              name="seats"
              placeholder="Optional"
              step="1"
              type="number"
            />
          </label>
        </section>

        <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
          New aircraft start with the selected inventory status only. MELs, write-ups, crew blocks,
          fuel records, and airworthiness records stay in their existing workflows.
        </section>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 pt-4">
          <Link
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            href={closeHref}
          >
            Cancel
          </Link>
          <button
            className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            type="submit"
          >
            Save aircraft
          </button>
        </div>
      </form>
    </ContextDrawer>
  );
}

export default async function AircraftPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const now = new Date();
  const selectedPanel = parseAircraftPanel(params.panel);
  const selectedView = parseAircraftView(params.view);
  const coverageDate = parseCoverageDate(params.date, now);
  const coverageFilters: CoveragePlannerFilters = {
    aircraftType: parseCoverageAircraftType(params.aircraftType),
    date: coverageDate,
    dateInput: toDateInput(coverageDate),
    focus: parseCoverageFocus(params.focus),
    range: parseCoverageRange(params.range),
    role: parseCoverageRole(params.role),
    view: selectedView,
  };
  const selectedRawId = firstParam(params.selected);
  const assignmentStartsAt = parseQueryDateTime(firstParam(params.startsAt));
  const assignmentEndsAt = parseQueryDateTime(firstParam(params.endsAt));
  const selectedCrewId = firstParam(params.selectedCrew);
  const assignmentDisplayWindowEnd =
    selectedPanel === "assign" && assignmentStartsAt
      ? addDays(startOfDay(assignmentStartsAt), aircraftCoverageDrawerTimelineDays)
      : assignmentEndsAt;
  const assignmentWorkflowWindowEnd =
    assignmentDisplayWindowEnd && assignmentEndsAt && assignmentEndsAt > assignmentDisplayWindowEnd
      ? assignmentEndsAt
      : assignmentDisplayWindowEnd;
  const [{ aircraft, summary }, createOptions, assignmentDrawerData] = await Promise.all([
    getAircraftBoard(),
    selectedPanel === "create" ? getAircraftCreateOptions() : Promise.resolve(null),
    selectedPanel === "assign" && selectedRawId
      ? getAircraftCrewWorkflowData(selectedRawId, {
          windowEnd: assignmentWorkflowWindowEnd,
          windowStart: assignmentStartsAt,
        })
      : Promise.resolve(null),
  ]);
  const selectedFilter = parseAircraftFilter(params.filter);
  const selectedId = selectedPanel === "aircraft" ? selectedRawId : null;
  const assignSelectedId = selectedPanel === "assign" ? selectedRawId : null;
  const errorMessage = firstParam(params.error);
  const successMessage = firstParam(params.success);
  const visibleAircraft = aircraft.filter((item) => aircraftMatchesFilter(item, selectedFilter));
  const assignCloseHref = coverageReturnHref(coverageFilters);
  const notAvailableCount = Math.max(0, summary.total - summary.available);
  const showCompactFleetBoard = true;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        {selectedView === "crew-coverage" ? (
          <AircraftCoveragePlanner aircraft={aircraft} filters={coverageFilters} now={now} />
        ) : (
          <>
          <AircraftFleetToolbar now={now} selectedFilter={selectedFilter} />
          <section className="grid grid-cols-7 gap-1.5">
            <SummaryTile
              active={selectedFilter === "all"}
              href={aircraftHref({ filter: "all" })}
              label="Aircraft"
              tone="zinc"
              value={summary.total}
            />
            <SummaryTile
              active={selectedFilter === "available"}
              href={aircraftHref({ filter: "available" })}
              label="Available"
              tone={summary.available > 0 ? "emerald" : "zinc"}
              value={summary.available}
            />
            <MetricPill
              label="Not avail"
              tone={notAvailableCount > 0 ? "amber" : "zinc"}
              value={notAvailableCount}
            />
            <SummaryTile
              active={selectedFilter === "in-flight"}
              href={aircraftHref({ filter: "in-flight" })}
              label="In flight"
              tone={summary.inFlight > 0 ? "blue" : "zinc"}
              value={summary.inFlight}
            />
            <SummaryTile
              active={selectedFilter === "aog"}
              href={aircraftHref({ filter: "aog" })}
              label="AOG"
              tone={summary.aog > 0 ? "rose" : "zinc"}
              value={summary.aog}
            />
            <SummaryTile
              active={selectedFilter === "open-mels"}
              href={aircraftHref({ filter: "open-mels" })}
              label="Open MELs"
              tone={summary.aircraftWithOpenMels > 0 ? "amber" : "zinc"}
              value={summary.aircraftWithOpenMels}
            />
            <SummaryTile
              active={selectedFilter === "open-writeups"}
              href={aircraftHref({ filter: "open-writeups" })}
              label="Open write-ups"
              tone={summary.aircraftWithOpenWriteUps > 0 ? "amber" : "zinc"}
              value={summary.aircraftWithOpenWriteUps}
            />
          </section>

          {visibleAircraft.length === 0 ? (
            <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">No aircraft found for this view.</p>
              <p className="mt-1">
                Select a different summary tile to broaden the aircraft board.
              </p>
            </section>
          ) : showCompactFleetBoard ? (
            <AircraftFleetList aircraft={visibleAircraft} now={now} selectedFilter={selectedFilter} />
          ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {visibleAircraft.map((item) => {
              const currentFlight =
                item.flights.find(
                  (flight) =>
                    flight.status === FlightStatus.ENROUTE ||
                    (flight.scheduledDeparture <= now && flight.scheduledArrival >= now),
                ) ?? null;
              const nextFlight =
                item.flights.find((flight) => flight.scheduledDeparture > now) ?? null;
              const displayedFlight = currentFlight ?? nextFlight;
              const missingRoles = missingCockpitRoles(item.crewAssignments);
              const maintenanceAlerts = item.alerts.filter((alert) => alert.type === AlertType.MAINTENANCE);
              const openWriteUpItems = openWriteUps(item);
              const currentConfiguration = item.configurations[0] ?? null;
              const latestMaintenanceEvent = latestCompletedMaintenanceEvent(item);
              const serviceability = evaluateAircraftServiceability(item, now);
              const activeCapabilityCodes = item.capabilities
                .map((capability) => capability.capabilityCode)
                .join(", ");
              const coverageSummary = aircraftCoverageSummary(item);

              return (
                <article
                  className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
                  key={item.id}
                >
                  <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="font-mono text-xl font-semibold tracking-tight text-sky-700 hover:text-sky-900"
                          href={aircraftHref({
                            filter: selectedFilter,
                            panel: "aircraft",
                            selected: item.id,
                          })}
                        >
                          {item.tailNumber}
                        </Link>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${aircraftStatusBadgeClasses(
                            item.status,
                          )}`}
                        >
                          {aircraftStatusLabel(item.status)}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${aircraftCoverageSummaryBadgeClasses(
                            coverageSummary,
                          )}`}
                        >
                          {coverageSummary.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-600">
                        {item.name ?? "Unnamed aircraft"} | {formatAircraftType(item.type)}
                        {item.seats ? ` | ${item.seats} seats` : ""}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Home station{" "}
                        {item.homeStation
                          ? `${item.homeStation.code} - ${item.homeStation.city}`
                          : "not assigned"}
                      </p>
                    </div>
                    <div className="text-left text-xs text-zinc-500 sm:text-right">
                      <p>Aircraft ID</p>
                      <p className="font-mono text-zinc-700">{item.id.slice(0, 8)}</p>
                      <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
                        <Link
                          className="rounded-md bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800"
                          href={`/aircraft/${item.id}`}
                        >
                          Aircraft context
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/crew`}
                        >
                          Manage crew
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/fuel`}
                        >
                          Fuel ledger
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/crew/scheduling?aircraft=${item.id}&assignment=assigned`}
                        >
                          Crew planner
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/airworthiness`}
                        >
                          Airworthiness
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Current / next flight
                      </h3>
                      {displayedFlight ? (
                        <div className="mt-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-zinc-950">
                              {displayedFlight.flightNumber}
                            </span>
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${flightStatusBadgeClasses(
                                displayedFlight.status,
                              )}`}
                            >
                              {displayedFlight.status}
                            </span>
                          </div>
                          <span
                            className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${sourceBadgeClasses(
                              displayedFlight.readSource,
                            )}`}
                          >
                            {sourceLabel(displayedFlight.readSource)}
                          </span>
                          <p className="mt-2 font-medium text-zinc-800">
                            {displayedFlight.departureStation.code} -&gt;{" "}
                            {displayedFlight.arrivalStation.code}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {displayedFlight.departureStation.city} to{" "}
                            {displayedFlight.arrivalStation.city}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-zinc-600">
                            Out {toDateTime(displayedFlight.scheduledDeparture)}
                            <br />
                            In {toDateTime(displayedFlight.scheduledArrival)}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-zinc-600">
                          No current or upcoming flight found for this aircraft.
                        </p>
                      )}
                    </section>

                    <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900">
                          Crew coverage bridge
                        </h3>
                        <Link
                          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/crew`}
                        >
                          Manage crew
                        </Link>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Active aircraft crew blocks are used to resolve FlightLeg coverage.
                      </p>
                      {item.flights.length === 0 ? (
                        <p className="mt-3 text-sm text-zinc-600">
                          No upcoming legs to evaluate for this tail.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {item.flights.map((flight) => (
                            <li
                              className="rounded-md border border-zinc-200 bg-white p-2 text-sm"
                              key={flight.id}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-zinc-950">
                                  {flight.flightNumber} {flight.departureStation.code} -&gt;{" "}
                                  {flight.arrivalStation.code}
                                </p>
                                <span
                                  className={`inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${flightCoverageBadgeClasses(
                                    flight,
                                  )}`}
                                >
                                  {flightCoverageLabel(flight)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-zinc-600">
                                {flightCoverageCrewLine(flight)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Aircraft status
                      </h3>
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="text-zinc-700">
                          Aircraft status is{" "}
                          <span className="font-semibold text-zinc-950">
                            {aircraftStatusLabel(item.status)}
                          </span>.
                        </p>
                        {maintenanceAlerts.length === 0 ? (
                          <p className="text-zinc-600">
                            No active maintenance alerts are attached to this aircraft.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {maintenanceAlerts.map((alert) => (
                              <li
                                className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-800"
                                key={alert.id}
                              >
                                <p className="font-medium">{alert.title}</p>
                                <p className="text-xs">{alert.message}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </section>
                  </div>

                  <section className="mt-3 rounded-md border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Airworthiness summary
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${serviceabilityBadgeClasses(
                            serviceability.tone,
                          )}`}
                        >
                          {serviceability.label}
                        </span>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/airworthiness`}
                        >
                          Manage airworthiness
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/crew`}
                        >
                          Manage crew
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/aircraft/${item.id}/fuel`}
                        >
                          Fuel ledger
                        </Link>
                        <Link
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={`/crew/scheduling?aircraft=${item.id}&assignment=assigned`}
                        >
                          Crew planner
                        </Link>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
                        <p className="font-semibold text-zinc-900">Configuration</p>
                        <p className="mt-1 text-zinc-700">
                          {currentConfiguration?.configurationLabel ?? "No active configuration"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Seats{" "}
                          {currentConfiguration?.passengerSeatCount ??
                            item.seats ??
                            "not set"}{" "}
                          | Empty weight{" "}
                          {currentConfiguration?.emptyWeight?.toString() ?? "not set"} | CG{" "}
                          {currentConfiguration?.emptyWeightCg ?? "not set"}
                        </p>
                      </div>
                      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
                        <p className="font-semibold text-zinc-900">Serviceability</p>
                        <p className="mt-1 text-zinc-700">{serviceability.message}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {serviceability.openDiscrepancyCount} open write-up
                          {serviceability.openDiscrepancyCount === 1 ? "" : "s"} |{" "}
                          {serviceability.activeDeferralCount} active deferral
                          {serviceability.activeDeferralCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
                        <p className="font-semibold text-zinc-900">Capabilities</p>
                        <p className="mt-1 text-zinc-700">
                          {activeCapabilityCodes || "No active capability records"}
                        </p>
                      </div>
                      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
                        <p className="font-semibold text-zinc-900">Last maintenance</p>
                        <p className="mt-1 text-zinc-700">
                          {latestMaintenanceEvent
                            ? `${latestMaintenanceEvent.maintenanceNumber} | ${latestMaintenanceEvent.eventType}`
                            : "No completed maintenance event"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Completed {toOptionalDateTime(latestMaintenanceEvent?.completedAt)} |
                          RTS {toOptionalDateTime(latestMaintenanceEvent?.returnToServiceAt)}
                        </p>
                      </div>
                    </div>

                    {openWriteUpItems.length > 0 || item.deferrals.length > 0 ? (
                      <div className="mt-3 grid gap-3 xl:grid-cols-2">
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <p className="font-semibold">Open write-ups</p>
                          {openWriteUpItems.length === 0 ? (
                            <p className="mt-1 text-amber-800">None.</p>
                          ) : (
                            <ul className="mt-2 space-y-1">
                              {openWriteUpItems.map((discrepancy) => (
                                <li key={discrepancy.id}>
                                  {discrepancy.discrepancyNumber}: {discrepancy.title} (
                                  {discrepancy.status})
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <p className="font-semibold">Open MELs</p>
                          {item.deferrals.length === 0 ? (
                            <p className="mt-1 text-amber-800">None.</p>
                          ) : (
                            <ul className="mt-2 space-y-1">
                              {item.deferrals.map((deferral) => (
                                <li key={deferral.id}>
                                  {deferral.deferralNumber}: {deferral.discrepancy.title}
                                  {deferral.dueAt ? ` due ${toDateTime(deferral.dueAt)}` : ""}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className="mt-3 rounded-md border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Active crew assignment block
                      </h3>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          missingRoles.length === 0
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {missingRoles.length === 0
                          ? "CPT/FO covered"
                          : `Missing ${missingRoles.map(formatRoleLabel).join(", ")}`}
                      </span>
                    </div>
                    {item.crewAssignments.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-600">
                        No active aircraft-block crew assignments.
                      </p>
                    ) : (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {item.crewAssignments.map((assignment) => {
                          const crewMemberName = `${assignment.crewMember.firstName} ${assignment.crewMember.lastName}`;
                          const matchingQualification =
                            assignment.crewMember.qualifications.find(
                              (qualification) =>
                                qualification.aircraftType === item.type &&
                                qualification.seatRole === assignment.seatRole,
                            ) ?? null;
                          const isExpired =
                            Boolean(matchingQualification?.expiresAt) &&
                            matchingQualification!.expiresAt!.getTime() < now.getTime();

                          return (
                            <div
                              className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm"
                              key={assignment.id}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700">
                                  {formatRoleLabel(assignment.seatRole)}
                                </span>
                                <span className="font-semibold text-zinc-950">
                                  {crewMemberName}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">
                                {assignment.crewMember.employeeNumber} |{" "}
                                {assignment.crewMember.dutyStatus} |{" "}
                                {assignment.crewMember.employmentStatus}
                              </p>
                              <p className="mt-2 text-xs leading-5 text-zinc-600">
                                Starts {toDateTime(assignment.startsAt)}
                                <br />
                                Ends{" "}
                                {assignment.endsAt ? toDateTime(assignment.endsAt) : "open block"}
                              </p>
                              {!matchingQualification ? (
                                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                                  No matching qualification found for this aircraft type and seat.
                                </p>
                              ) : isExpired ? (
                                <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                                  Qualification expired{" "}
                                  {matchingQualification.expiresAt
                                    ? toDateTime(matchingQualification.expiresAt)
                                    : ""}.
                                </p>
                              ) : (
                                <p className="mt-2 text-xs text-emerald-700">
                                  Matching qualification on file.
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section className="mt-3 rounded-md border border-zinc-200 p-3">
                    <h3 className="text-sm font-semibold text-zinc-900">Active alerts</h3>
                    {item.alerts.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-600">
                        No active alerts attached to this aircraft.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {item.alerts.map((alert) => (
                          <li className="rounded-md border border-zinc-200 p-2.5 text-sm" key={alert.id}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${severityBadgeClasses(
                                  alert.severity,
                                )}`}
                              >
                                {alert.severity}
                              </span>
                              <span className="font-medium text-zinc-800">{alert.type}</span>
                              {alert.flight?.flightNumber && (
                                <span className="ml-auto text-xs text-zinc-500">
                                  Flight {alert.flight.flightNumber}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 font-medium text-zinc-950">{alert.title}</p>
                            <p className="text-zinc-600">{alert.message}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </article>
              );
            })}
          </section>
          )}
          </>
        )}
        <AircraftDrawer
          aircraft={aircraft}
          selectedFilter={selectedFilter}
          selectedId={selectedId}
        />
        <AircraftCoverageAssignDrawer
          closeHref={assignCloseHref}
          data={assignmentDrawerData}
          endsAt={assignmentEndsAt}
          error={errorMessage}
          role={coverageFilters.role}
          selectedCrewId={selectedCrewId}
          selectedId={assignSelectedId}
          startsAt={assignmentStartsAt}
          success={successMessage}
        />
        {selectedPanel === "create" && createOptions ? (
          <AircraftCreateDrawer
            closeHref={
              selectedView === "crew-coverage"
                ? coverageReturnHref(coverageFilters)
                : aircraftHref({ filter: selectedFilter })
            }
            error={errorMessage}
            options={createOptions}
            selectedFilter={selectedFilter}
          />
        ) : null}
      </div>
    </main>
  );
}
