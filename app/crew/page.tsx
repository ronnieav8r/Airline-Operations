import {
  AircraftType,
  CrewComplianceRequirementType,
  DutyStatus,
  EmploymentStatus,
  MedicalCertificateClass,
  OperatingPart,
  SeatRole,
  TimeOffRequestStatus,
} from "@prisma/client";
import Link from "next/link";
import { ReactNode } from "react";

import {
  createCrewDrawerComplianceEvidenceAction,
  createCrewMemberAction,
  createCrewQualificationAction,
  updateCrewMemberAction,
} from "@/app/crew/actions";
import { reviewTimeOffRequestAction } from "@/app/crew/scheduling/time-off/actions";
import { ContextDrawer } from "@/components/context-drawer";
import { TimeOffAssignmentCoverageReviewPanel } from "@/components/time-off-assignment-coverage-review";
import { TimeOffCoverageImpactPanel } from "@/components/time-off-coverage-impact";
import { prisma } from "@/lib/prisma";
import { evaluateCrewCompliance } from "@/lib/crew-compliance-evaluator";
import { getActiveCrewComplianceRuleDefinitions } from "@/lib/crew-compliance-rule-defaults";
import {
  getUpcomingCoverageFlightsForAircrafts,
  UpcomingCoverageFlight,
} from "@/lib/flightleg-upcoming-coverage";
import {
  getTimeOffWorkflowData,
  TimeOffWorkflowData,
  TimeOffWorkflowRequest,
} from "@/lib/time-off-workflow-queries";

export const dynamic = "force-dynamic";

const UPCOMING_WINDOW_DAYS = 7;
const EXPIRING_SOON_DAYS = 30;
const TIME_OFF_STATUS_FILTERS = [
  TimeOffRequestStatus.PENDING,
  TimeOffRequestStatus.APPROVED,
  TimeOffRequestStatus.DENIED,
  TimeOffRequestStatus.CANCELLED,
] as const;

type PageProps = {
  searchParams: Promise<{
    assignment?: string | string[];
    base?: string | string[];
    duty?: string | string[];
    issue?: string | string[];
    panel?: string | string[];
    selected?: string | string[];
    status?: string | string[];
    timeOffStatus?: string | string[];
    error?: string | string[];
  }>;
};

type CrewMemberRow = Awaited<ReturnType<typeof getCrewRosterData>>["crewMembers"][number];
type CrewAssignmentRow = CrewMemberRow["assignments"][number];
type QualificationRow = CrewMemberRow["qualifications"][number];

type UpcomingFlightRow = Pick<
  UpcomingCoverageFlight,
  | "arrivalCode"
  | "coverage"
  | "departureCode"
  | "flightLegId"
  | "flightNumber"
  | "id"
  | "legacyFlightId"
  | "readSource"
  | "scheduledDeparture"
  | "status"
  | "tailNumber"
> & {
  seatRoles: SeatRole[];
};

type CrewFilters = {
  assignment: "all" | "assigned" | "unassigned";
  base: string;
  duty: "all" | DutyStatus;
  issue: "all" | "warnings";
  panel: "create" | "crew" | "time-off" | null;
  selected: string | null;
  status: "all" | EmploymentStatus;
  timeOffStatus: TimeOffRequestStatus | "all";
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function oneOf<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return value && options.includes(value as T) ? (value as T) : fallback;
}

function parseCrewFilters(searchParams: Awaited<PageProps["searchParams"]>): CrewFilters {
  const panelParam = firstParam(searchParams.panel);

  return {
    assignment: oneOf(firstParam(searchParams.assignment), ["all", "assigned", "unassigned"], "all"),
    base: firstParam(searchParams.base) ?? "all",
    duty: oneOf(firstParam(searchParams.duty), ["all", ...Object.values(DutyStatus)], "all"),
    issue: oneOf(firstParam(searchParams.issue), ["all", "warnings"], "all"),
    panel:
      panelParam === "create" || panelParam === "crew" || panelParam === "time-off"
        ? panelParam
        : null,
    selected: firstParam(searchParams.selected),
    status: oneOf(firstParam(searchParams.status), ["all", ...Object.values(EmploymentStatus)], EmploymentStatus.ACTIVE),
    timeOffStatus: oneOf(
      firstParam(searchParams.timeOffStatus),
      ["all", ...Object.values(TimeOffRequestStatus)],
      TimeOffRequestStatus.PENDING,
    ),
  };
}

function crewHref(filters: CrewFilters, next: Partial<CrewFilters> = {}) {
  const merged = { ...filters, ...next };
  const params = new URLSearchParams();

  if (merged.status !== EmploymentStatus.ACTIVE) {
    params.set("status", merged.status);
  }
  if (merged.duty !== "all") {
    params.set("duty", merged.duty);
  }
  if (merged.assignment !== "all") {
    params.set("assignment", merged.assignment);
  }
  if (merged.issue !== "all") {
    params.set("issue", merged.issue);
  }
  if (merged.base !== "all") {
    params.set("base", merged.base);
  }
  if (merged.panel) {
    params.set("panel", merged.panel);
  }
  if (merged.selected) {
    params.set("selected", merged.selected);
  }
  if (merged.panel === "time-off" && merged.timeOffStatus !== TimeOffRequestStatus.PENDING) {
    params.set("timeOffStatus", merged.timeOffStatus);
  }

  const query = params.toString();
  return query ? `/crew?${query}` : "/crew";
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function toDate(value: Date | null): string {
  if (!value) {
    return "No expiration";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function toDateOrNotSet(value: Date | null): string {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function toInputDate(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
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

function formatAircraftType(value: AircraftType): string {
  return value.replaceAll("_", "-");
}

function formatRoleLabel(role: SeatRole): string {
  return role === SeatRole.CPT ? "CPT" : role;
}

function statusLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function dutyStatusLabel(status: DutyStatus): string {
  const labels: Record<DutyStatus, string> = {
    DEADHEADING: "Deadheading",
    OFF_DUTY: "Off duty",
    ON_DUTY: "On duty",
    PERSONAL: "Personal",
    RESERVE: "Reserve",
    SICK: "Sick",
    TRAINING: "Training",
    VACATION: "Vacation",
  };

  return labels[status];
}

function employmentFilterNote(status: CrewFilters["status"]): string {
  if (status === EmploymentStatus.ACTIVE) {
    return "Normal roster view.";
  }
  if (status === EmploymentStatus.ON_LEAVE) {
    return "Retained, temporarily unavailable.";
  }
  if (status === EmploymentStatus.INACTIVE) {
    return "Retained record, not normally available.";
  }
  if (status === EmploymentStatus.TERMINATED) {
    return "Separated historical record.";
  }

  return "Includes active and non-active records.";
}

function SelectFilter({
  children,
  defaultValue,
  label,
  name,
}: {
  children: ReactNode;
  defaultValue: string;
  label: string;
  name: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <select
        className="mt-1 h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm font-medium text-zinc-900"
        defaultValue={defaultValue}
        name={name}
      >
        {children}
      </select>
    </label>
  );
}

function employmentBadgeClasses(status: EmploymentStatus): string {
  if (status === EmploymentStatus.ACTIVE) {
    return "status-badge-success";
  }
  if (status === EmploymentStatus.ON_LEAVE) {
    return "status-badge-caution";
  }
  if (status === EmploymentStatus.TERMINATED) {
    return "status-badge-stop";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function dutyBadgeClasses(status: DutyStatus): string {
  if (status === DutyStatus.ON_DUTY || status === DutyStatus.RESERVE) {
    return "status-badge-info";
  }
  if (status === DutyStatus.TRAINING || status === DutyStatus.DEADHEADING) {
    return "status-badge-info";
  }
  if (status === DutyStatus.SICK) {
    return "status-badge-stop";
  }
  if (status === DutyStatus.VACATION) {
    return "status-badge-caution";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function complianceStatusBadgeClasses(status: string): string {
  if (status === "EXPIRED" || status === "MISSING") {
    return "status-badge-stop";
  }
  if (status === "DUE_SOON" || status === "NOT_ENOUGH_DATA") {
    return "status-badge-caution";
  }
  return "status-badge-success";
}

function timeOffBadgeClasses(status: TimeOffRequestStatus): string {
  if (status === TimeOffRequestStatus.APPROVED) {
    return "status-badge-success";
  }
  if (status === TimeOffRequestStatus.PENDING) {
    return "status-badge-caution";
  }
  if (status === TimeOffRequestStatus.DENIED) {
    return "status-badge-stop";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function qualificationBadgeClasses(qualification: QualificationRow, now: Date): string {
  if (!qualification.expiresAt) {
    return "status-badge-success";
  }

  if (qualification.expiresAt.getTime() < now.getTime()) {
    return "status-badge-stop";
  }

  if (qualification.expiresAt.getTime() <= addDays(now, EXPIRING_SOON_DAYS).getTime()) {
    return "status-badge-caution";
  }

  return "status-badge-success";
}

function qualificationStatus(qualification: QualificationRow, now: Date): string {
  if (!qualification.expiresAt) {
    return "Current";
  }

  if (qualification.expiresAt.getTime() < now.getTime()) {
    return "Expired";
  }

  if (qualification.expiresAt.getTime() <= addDays(now, EXPIRING_SOON_DAYS).getTime()) {
    return "Expiring soon";
  }

  return "Current";
}

function getQualificationWarnings(qualifications: QualificationRow[], now: Date): string[] {
  return qualifications
    .filter((qualification) => qualification.expiresAt)
    .filter((qualification) => {
      const expiresAt = qualification.expiresAt;
      return expiresAt ? expiresAt.getTime() <= addDays(now, EXPIRING_SOON_DAYS).getTime() : false;
    })
    .map(
      (qualification) =>
        `${formatAircraftType(qualification.aircraftType)} ${formatRoleLabel(
          qualification.seatRole,
        )} ${qualificationStatus(qualification, now).toLowerCase()} (${toDate(
          qualification.expiresAt,
        )}).`,
    );
}

function assignmentLabel(assignment: CrewAssignmentRow): string {
  return `${formatRoleLabel(assignment.seatRole)} on ${assignment.aircraft.tailNumber}`;
}

async function getCrewRosterData() {
  const now = new Date();
  const upcomingEnd = addDays(now, UPCOMING_WINDOW_DAYS);

  const [crewMembers, stations, complianceRules, activeOperatingParts] = await Promise.all([
  prisma.crewMember.findMany({
    orderBy: [{ employmentStatus: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      dutyStatus: true,
      employmentStatus: true,
      dateOfBirth: true,
      hireDate: true,
      phone: true,
      email: true,
      baseStation: {
        select: {
          id: true,
          code: true,
          city: true,
        },
      },
      qualifications: {
        orderBy: [{ aircraftType: "asc" }, { seatRole: "asc" }],
        select: {
          id: true,
          aircraftType: true,
          seatRole: true,
          issuedAt: true,
          expiresAt: true,
        },
      },
      certificates: {
        orderBy: [{ aircraftType: "asc" }, { seatRole: "asc" }, { issuedAt: "desc" }],
        select: {
          aircraftType: true,
          certificateType: true,
          coveredOperatingParts: true,
          expiresAt: true,
          id: true,
          issuedAt: true,
          satisfiesRequirements: true,
          seatRole: true,
          status: true,
        },
      },
      assignments: {
        where: {
          isActive: true,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        orderBy: [{ aircraft: { tailNumber: "asc" } }, { seatRole: "asc" }],
        select: {
          id: true,
          seatRole: true,
          startsAt: true,
          endsAt: true,
          aircraft: {
            select: {
              id: true,
              tailNumber: true,
              type: true,
              status: true,
            },
          },
        },
      },
      medicals: {
        orderBy: [{ expiresAt: "asc" }, { issuedAt: "desc" }],
        select: {
          coveredOperatingParts: true,
          id: true,
          expiresAt: true,
          issuedAt: true,
          medicalClass: true,
          satisfiesRequirements: true,
          status: true,
        },
      },
      trainingEvents: {
        orderBy: [{ completedAt: "desc" }],
        take: 8,
        select: {
          id: true,
          completedAt: true,
          coveredOperatingParts: true,
          expiresAt: true,
          result: true,
          satisfiesRequirements: true,
          status: true,
          trainingType: true,
        },
      },
      checkEvents: {
        orderBy: [{ completedAt: "desc" }],
        take: 8,
        select: {
          id: true,
          checkType: true,
          completedAt: true,
          coveredOperatingParts: true,
          expiresAt: true,
          result: true,
          satisfiesRequirements: true,
          seatRole: true,
          status: true,
        },
      },
      recencyEvents: {
        orderBy: [{ eventAt: "desc" }],
        take: 8,
        select: {
          id: true,
          eventAt: true,
          coveredOperatingParts: true,
          quantity: true,
          recencyType: true,
          result: true,
          satisfiesRequirements: true,
          seatRole: true,
          status: true,
        },
      },
      plannedComplianceEvents: {
        where: {
          status: "SCHEDULED",
        },
        orderBy: [{ scheduledFor: "asc" }],
        take: 8,
        select: {
          id: true,
          eventType: true,
          scheduledFor: true,
          status: true,
        },
      },
    },
  }),
  prisma.station.findMany({
    where: { isActive: true },
    orderBy: [{ code: "asc" }],
    select: {
      id: true,
      code: true,
      city: true,
    },
  }),
  getActiveCrewComplianceRuleDefinitions(prisma),
  prisma.operatingAuthority.findMany({
    where: {
      operator: { isActive: true },
      status: "ACTIVE",
    },
    orderBy: { operatingPart: "asc" },
    select: { operatingPart: true },
  }),
  ]);

  const aircraftIds = Array.from(
    new Set(
      crewMembers.flatMap((crewMember) =>
        crewMember.assignments.map((assignment) => assignment.aircraft.id),
      ),
    ),
  );

  const flightsWithCoverage = await getUpcomingCoverageFlightsForAircrafts(
    aircraftIds,
    now,
    upcomingEnd,
  );

  const upcomingFlightsByCrewId = new Map<string, UpcomingFlightRow[]>();

  for (const crewMember of crewMembers) {
    const crewFlights = flightsWithCoverage.flatMap((flight) => {
      const seatRoles = flight.coverage?.assignedCrew
        .filter((assignment) => assignment.crewMemberId === crewMember.id)
        .map((assignment) => assignment.seatRole);

      if (!seatRoles || seatRoles.length === 0) {
        return [];
      }

      return [
        {
          id: flight.id,
          legacyFlightId: flight.legacyFlightId,
          flightLegId: flight.flightLegId,
          readSource: flight.readSource,
          flightNumber: flight.flightNumber,
          scheduledDeparture: flight.scheduledDeparture,
          status: flight.status,
          departureCode: flight.departureCode,
          arrivalCode: flight.arrivalCode,
          tailNumber: flight.tailNumber,
          seatRoles,
          coverage: flight.coverage,
        },
      ];
    });

    upcomingFlightsByCrewId.set(crewMember.id, crewFlights.slice(0, 3));
  }

  const crewMembersWithCompliance = crewMembers.map((crewMember) => {
    const evaluation = evaluateCrewCompliance(crewMember, complianceRules, now);

    return {
      ...crewMember,
      complianceFindings: evaluation.findings,
      complianceStatus: evaluation.strongestStatus,
      complianceWarnings: evaluation.warnings,
    };
  });

  return {
    crewMembers: crewMembersWithCompliance,
    stations,
    activeOperatingParts: Array.from(new Set(activeOperatingParts.map((authority) => authority.operatingPart))),
    upcomingFlightsByCrewId,
    now,
  };
}

function CrewMemberCreateForm({
  stations,
}: {
  stations: Awaited<ReturnType<typeof getCrewRosterData>>["stations"];
}) {
  const defaultStation = stations[0]?.id;
  const inputClass = "mt-1 h-9 w-full rounded-md border border-zinc-300 px-2 text-sm";
  const labelClass = "block min-w-0";
  const labelTextClass = "text-xs font-medium text-zinc-600";

  return (
    <form action={createCrewMemberAction} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
      <label className={labelClass}>
        <span className={labelTextClass}>Employee #</span>
        <input className={inputClass} name="employeeNumber" required />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>First name</span>
        <input className={inputClass} name="firstName" required />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Last name</span>
        <input className={inputClass} name="lastName" required />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Base</span>
        <select className={inputClass} defaultValue={defaultStation} name="baseStationId" required>
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.code} - {station.city}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Employment</span>
        <select className={inputClass} defaultValue={EmploymentStatus.ACTIVE} name="employmentStatus" required>
          {Object.values(EmploymentStatus).map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Duty</span>
        <select className={inputClass} defaultValue={DutyStatus.OFF_DUTY} name="dutyStatus" required>
          {Object.values(DutyStatus).map((status) => (
            <option key={status} value={status}>
              {dutyStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Hire date</span>
        <input className={inputClass} name="hireDate" type="date" />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Date of birth</span>
        <input className={inputClass} name="dateOfBirth" type="date" />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Phone</span>
        <input className={inputClass} name="phone" />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Email</span>
        <input className={inputClass} name="email" type="email" />
      </label>
      </div>

      <details className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-950">
          Starter medical, ratings, and currency
        </summary>
        <div className="mt-3 grid gap-4">
          <section className="grid gap-3 sm:grid-cols-3">
            <label className={labelClass}>
              <span className={labelTextClass}>Medical class</span>
              <select className={inputClass} defaultValue={MedicalCertificateClass.FIRST_CLASS} name="initialMedicalClass">
                {Object.values(MedicalCertificateClass).map((medicalClass) => (
                  <option key={medicalClass} value={medicalClass}>
                    {statusLabel(medicalClass)}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Medical issued</span>
              <input className={inputClass} name="initialMedicalIssuedAt" type="date" />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Medical expires</span>
              <input className={inputClass} name="initialMedicalExpiresAt" type="date" />
            </label>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              <span className={labelTextClass}>Type / aircraft</span>
              <select className={inputClass} defaultValue="" name="initialTypeRatingAircraftType">
                <option value="">No starter type rating</option>
                {Object.values(AircraftType).map((aircraftType) => (
                  <option key={aircraftType} value={aircraftType}>
                    {formatAircraftType(aircraftType)}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Qualification seat</span>
              <select className={inputClass} defaultValue="" name="initialTypeRatingSeatRole">
                <option value="">No seat qualification</option>
                {Object.values(SeatRole).map((role) => (
                  <option key={role} value={role}>
                    {formatRoleLabel(role)}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Type issued</span>
              <input className={inputClass} name="initialTypeRatingIssuedAt" type="date" />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Type expires</span>
              <input className={inputClass} name="initialTypeRatingExpiresAt" type="date" />
            </label>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              <span className={labelTextClass}>Recurrent training</span>
              <input className={inputClass} name="initialRecurrentTrainingCompletedAt" type="date" />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Proficiency check</span>
              <input className={inputClass} name="initialProficiencyCheckCompletedAt" type="date" />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Instrument check / IPC</span>
              <input className={inputClass} name="initialInstrumentCheckCompletedAt" type="date" />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Line check</span>
              <input className={inputClass} name="initialLineCheckCompletedAt" type="date" />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Takeoff / landing recency</span>
              <input className={inputClass} name="initialTakeoffLandingRecencyAt" type="date" />
            </label>
          </section>
        </div>
      </details>

      <div className="flex items-end">
        <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800" type="submit">
          Create crew member
        </button>
      </div>
    </form>
  );
}

function CrewMemberInlineEditForm({
  crewMember,
  returnTo,
  stations,
}: {
  crewMember: CrewMemberRow;
  returnTo: string;
  stations: Awaited<ReturnType<typeof getCrewRosterData>>["stations"];
}) {
  const action = updateCrewMemberAction.bind(null, crewMember.id);
  const inputClass = "mt-1 h-8 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm";
  const labelClass = "block min-w-0";
  const labelTextClass = "text-xs font-medium text-zinc-600";

  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className={labelClass}>
        <span className={labelTextClass}>Employee #</span>
        <input className={inputClass} defaultValue={crewMember.employeeNumber} name="employeeNumber" required />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Base</span>
        <select className={inputClass} defaultValue={crewMember.baseStation.id} name="baseStationId" required>
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.code} - {station.city}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>First name</span>
        <input className={inputClass} defaultValue={crewMember.firstName} name="firstName" required />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Last name</span>
        <input className={inputClass} defaultValue={crewMember.lastName} name="lastName" required />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Employment</span>
        <select className={inputClass} defaultValue={crewMember.employmentStatus} name="employmentStatus" required>
          {Object.values(EmploymentStatus).map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Duty</span>
        <select className={inputClass} defaultValue={crewMember.dutyStatus} name="dutyStatus" required>
          {Object.values(DutyStatus).map((status) => (
            <option key={status} value={status}>
              {dutyStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Hire date</span>
        <input className={inputClass} defaultValue={toInputDate(crewMember.hireDate)} name="hireDate" type="date" />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Date of birth</span>
        <input className={inputClass} defaultValue={toInputDate(crewMember.dateOfBirth)} name="dateOfBirth" type="date" />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Phone</span>
        <input className={inputClass} defaultValue={crewMember.phone ?? ""} name="phone" />
      </label>
      <label className={labelClass}>
        <span className={labelTextClass}>Email</span>
        <input className={inputClass} defaultValue={crewMember.email ?? ""} name="email" type="email" />
      </label>
      <div className="sm:col-span-2">
        <button className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800" type="submit">
          Save profile
        </button>
      </div>
    </form>
  );
}

function CrewQualificationInlineCreateForm({
  crewMember,
  returnTo,
}: {
  crewMember: CrewMemberRow;
  returnTo: string;
}) {
  const action = createCrewQualificationAction.bind(null, crewMember.id);
  const inputClass = "mt-1 h-8 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm";

  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="block min-w-0">
        <span className="text-xs font-medium text-zinc-600">Aircraft type</span>
        <select className={inputClass} name="aircraftType" required>
          {Object.values(AircraftType).map((aircraftType) => (
            <option key={aircraftType} value={aircraftType}>
              {formatAircraftType(aircraftType)}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-0">
        <span className="text-xs font-medium text-zinc-600">Seat</span>
        <select className={inputClass} name="seatRole" required>
          {Object.values(SeatRole).map((role) => (
            <option key={role} value={role}>
              {formatRoleLabel(role)}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-0">
        <span className="text-xs font-medium text-zinc-600">Issued</span>
        <input className={inputClass} name="issuedAt" required type="date" />
      </label>
      <label className="block min-w-0">
        <span className="text-xs font-medium text-zinc-600">Administrative expires</span>
        <input className={inputClass} name="expiresAt" type="date" />
      </label>
      <label className="block min-w-0 sm:col-span-2">
        <span className="text-xs font-medium text-zinc-600">Notes</span>
        <input className={inputClass} name="notes" placeholder="Type rating, company qualification, or limitation notes" />
      </label>
      <div className="sm:col-span-2">
        <button className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" type="submit">
          Add qualification
        </button>
      </div>
    </form>
  );
}

function defaultEvidenceAircraftType(crewMember: CrewMemberRow): AircraftType | "" {
  return crewMember.qualifications[0]?.aircraftType ?? "";
}

function defaultEvidenceSeatRole(crewMember: CrewMemberRow): SeatRole | "" {
  return crewMember.qualifications[0]?.seatRole ?? "";
}

function relatedRequirementTypes(requirementType: CrewComplianceRequirementType): CrewComplianceRequirementType[] {
  if (requirementType === CrewComplianceRequirementType.INSTRUMENT_CHECK) {
    return [CrewComplianceRequirementType.INSTRUMENT_CHECK, CrewComplianceRequirementType.PROFICIENCY_CHECK];
  }
  if (requirementType === CrewComplianceRequirementType.PROFICIENCY_CHECK) {
    return [CrewComplianceRequirementType.PROFICIENCY_CHECK, CrewComplianceRequirementType.INSTRUMENT_CHECK];
  }
  if (
    requirementType === CrewComplianceRequirementType.RECURRENT_TRAINING ||
    requirementType === CrewComplianceRequirementType.COMPETENCY_CHECK
  ) {
    return [CrewComplianceRequirementType.RECURRENT_TRAINING, CrewComplianceRequirementType.COMPETENCY_CHECK];
  }
  if (requirementType === CrewComplianceRequirementType.TYPE_RATING) {
    return [CrewComplianceRequirementType.TYPE_RATING, CrewComplianceRequirementType.PROFICIENCY_CHECK];
  }

  return [requirementType];
}

function EvidenceQuickForm({
  activeOperatingParts,
  crewMember,
  finding,
  returnTo,
}: {
  activeOperatingParts: OperatingPart[];
  crewMember: CrewMemberRow;
  finding: CrewMemberRow["complianceFindings"][number];
  returnTo: string;
}) {
  const action = createCrewDrawerComplianceEvidenceAction.bind(null, crewMember.id);
  const inputClass = "mt-1 h-8 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm";
  const showMedical = finding.requirementType === CrewComplianceRequirementType.MEDICAL;
  const showAircraft =
    finding.requirementType !== CrewComplianceRequirementType.MEDICAL &&
    finding.requirementType !== CrewComplianceRequirementType.FLIGHT_REVIEW;
  const coverageParts = finding.operatingPart ? [finding.operatingPart] : activeOperatingParts;
  const requirementTypes = relatedRequirementTypes(finding.requirementType);

  return (
    <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="requirementType" type="hidden" value={finding.requirementType} />
      <input name="title" type="hidden" value={finding.title} />
      {showMedical ? (
        <label className="block min-w-0">
          <span className="text-xs font-medium text-zinc-600">Medical class</span>
          <select className={inputClass} defaultValue={MedicalCertificateClass.FIRST_CLASS} name="medicalClass">
            {Object.values(MedicalCertificateClass).map((medicalClass) => (
              <option key={medicalClass} value={medicalClass}>
                {statusLabel(medicalClass)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showAircraft ? (
        <>
          <label className="block min-w-0">
            <span className="text-xs font-medium text-zinc-600">Aircraft type</span>
            <select className={inputClass} defaultValue={defaultEvidenceAircraftType(crewMember)} name="aircraftType">
              <option value="">Not aircraft-specific</option>
              {Object.values(AircraftType).map((aircraftType) => (
                <option key={aircraftType} value={aircraftType}>
                  {formatAircraftType(aircraftType)}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-xs font-medium text-zinc-600">Seat</span>
            <select className={inputClass} defaultValue={defaultEvidenceSeatRole(crewMember)} name="seatRole">
              <option value="">Not seat-specific</option>
              {Object.values(SeatRole).map((role) => (
                <option key={role} value={role}>
                  {formatRoleLabel(role)}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      <label className="block min-w-0">
        <span className="text-xs font-medium text-zinc-600">{showMedical ? "Issued" : "Completed"}</span>
        <input className={inputClass} name="completedAt" required type="date" />
      </label>
      <label className="block min-w-0">
        <span className="text-xs font-medium text-zinc-600">Expiration override</span>
        <input className={inputClass} name="expiresAt" type="date" />
      </label>
      <label className="block min-w-0 sm:col-span-2">
        <span className="text-xs font-medium text-zinc-600">Notes</span>
        <input className={inputClass} name="notes" placeholder="Provider, evaluator, limitations, or source notes" />
      </label>
      {activeOperatingParts.length ? (
        <fieldset className="rounded-md border border-zinc-200 bg-zinc-50 p-2 sm:col-span-2">
          <legend className="px-1 text-xs font-semibold text-zinc-600">Operating parts covered</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {activeOperatingParts.map((operatingPart) => (
              <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700" key={operatingPart}>
                <input
                  defaultChecked={coverageParts.includes(operatingPart)}
                  name="coveredOperatingParts"
                  type="checkbox"
                  value={operatingPart}
                />
                {statusLabel(operatingPart)}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset className="rounded-md border border-zinc-200 bg-zinc-50 p-2 sm:col-span-2">
        <legend className="px-1 text-xs font-semibold text-zinc-600">Requirements this evidence satisfies</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {requirementTypes.map((requirementType) => (
            <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700" key={requirementType}>
              <input
                defaultChecked={requirementType === finding.requirementType}
                name="satisfiesRequirements"
                type="checkbox"
                value={requirementType}
              />
              {statusLabel(requirementType)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <p className="mb-2 text-xs text-zinc-500">
          Leave expiration blank when the rule can calculate the next due date from the completed or issued date.
        </p>
        <button className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800" type="submit">
          Save evidence
        </button>
      </div>
    </form>
  );
}

function crewWarnings(crewMember: CrewMemberRow, now: Date): string[] {
  const qualificationWarnings = getQualificationWarnings(crewMember.qualifications, now);

  return [...qualificationWarnings, ...crewMember.complianceWarnings];
}

function filterCrewMembers(crewMembers: CrewMemberRow[], filters: CrewFilters, now: Date) {
  return crewMembers.filter((crewMember) => {
    if (filters.status !== "all" && crewMember.employmentStatus !== filters.status) {
      return false;
    }
    if (filters.duty !== "all" && crewMember.dutyStatus !== filters.duty) {
      return false;
    }
    if (filters.assignment === "assigned" && crewMember.assignments.length === 0) {
      return false;
    }
    if (filters.assignment === "unassigned" && crewMember.assignments.length > 0) {
      return false;
    }
    if (filters.base !== "all" && crewMember.baseStation.code !== filters.base) {
      return false;
    }
    if (filters.issue === "warnings" && crewWarnings(crewMember, now).length === 0) {
      return false;
    }

    return true;
  });
}

function TimeOffReviewButton({
  label,
  requestId,
  returnTo,
  status,
  variant = "primary",
}: {
  label: string;
  requestId: string;
  returnTo: string;
  status: TimeOffRequestStatus;
  variant?: "primary" | "secondary";
}) {
  return (
    <form action={reviewTimeOffRequestAction.bind(null, requestId, status)}>
      <input name="returnTo" type="hidden" value={returnTo} />
      <button
        className={
          variant === "primary"
            ? "rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            : "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        }
        type="submit"
      >
        {label}
      </button>
    </form>
  );
}

function TimeOffRequestRow({
  request,
  returnTo,
}: {
  request: TimeOffWorkflowRequest;
  returnTo: string;
}) {
  const crewName = `${request.crewMember.firstName} ${request.crewMember.lastName}`;

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(13rem,1fr)_minmax(20rem,1.35fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="font-semibold text-sky-700 hover:text-sky-900"
              href={`/crew/${request.crewMember.id}`}
            >
              {crewName}
            </Link>
            <span className="text-xs text-zinc-500">#{request.crewMember.employeeNumber}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${timeOffBadgeClasses(
                request.status,
              )}`}
            >
              {statusLabel(request.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-700">
            {statusLabel(request.requestType)} | {toDateTime(request.startDate)} -{" "}
            {toDateTime(request.endDate)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Base {request.crewMember.baseStation.code}
            {request.reviewedAt ? ` | reviewed ${toDateTime(request.reviewedAt)}` : ""}
          </p>
          {request.reason ? (
            <p className="mt-2 text-sm text-zinc-600">{request.reason}</p>
          ) : null}
        </div>
        <TimeOffCoverageImpactPanel impacts={request.coverageImpact} variant="compact" />
        <div className="flex flex-wrap gap-2 xl:justify-end">
          {request.status === TimeOffRequestStatus.PENDING ? (
            <>
              <TimeOffReviewButton
                label="Approve"
                requestId={request.id}
                returnTo={returnTo}
                status={TimeOffRequestStatus.APPROVED}
              />
              <TimeOffReviewButton
                label="Deny"
                requestId={request.id}
                returnTo={returnTo}
                status={TimeOffRequestStatus.DENIED}
                variant="secondary"
              />
              <TimeOffReviewButton
                label="Cancel"
                requestId={request.id}
                returnTo={returnTo}
                status={TimeOffRequestStatus.CANCELLED}
                variant="secondary"
              />
            </>
          ) : null}
          {request.status === TimeOffRequestStatus.APPROVED ? (
            <TimeOffReviewButton
              label="Cancel approved"
              requestId={request.id}
              returnTo={returnTo}
              status={TimeOffRequestStatus.CANCELLED}
              variant="secondary"
            />
          ) : null}
        </div>
      </div>
      {request.conflictWarnings.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-xs">
          {request.conflictWarnings.map((warning) => (
            <li className="rounded-md border status-embedded-caution p-2" key={warning}>
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
      <TimeOffAssignmentCoverageReviewPanel
        reviews={request.assignmentCoverageReview}
        variant="compact"
      />
    </article>
  );
}

function TimeOffDrawer({
  filters,
  timeOffData,
}: {
  filters: CrewFilters;
  timeOffData: TimeOffWorkflowData;
}) {
  const closeHref = crewHref(filters, { panel: null, selected: null });
  const returnTo = crewHref(filters, { panel: "time-off", selected: null });
  const visibleRequests =
    filters.timeOffStatus === "all"
      ? TIME_OFF_STATUS_FILTERS.flatMap((status) => timeOffData.requestsByStatus[status])
      : timeOffData.requestsByStatus[filters.timeOffStatus];

  return (
    <ContextDrawer closeHref={closeHref} eyebrow="Ops review" size="wide" title="Time-Off Requests">
      <div className="space-y-4">
        <section className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-950">Action queue</p>
              <p className="mt-1 text-sm text-zinc-600">
                Pending requests are the operational work. Approved, denied, and
                cancelled are available here for review.
              </p>
            </div>
            <Link
              className="text-xs font-semibold text-sky-700 hover:text-sky-900"
              href="/crew/scheduling/time-off"
            >
              Full page
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className={
                filters.timeOffStatus === TimeOffRequestStatus.PENDING
                  ? "rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white"
                  : "rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              }
              href={crewHref(filters, {
                panel: "time-off",
                selected: null,
                timeOffStatus: TimeOffRequestStatus.PENDING,
              })}
            >
              Pending
            </Link>
            {TIME_OFF_STATUS_FILTERS.filter(
              (status) => status !== TimeOffRequestStatus.PENDING,
            ).map((status) => (
              <Link
                className={
                  filters.timeOffStatus === status
                    ? "rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white"
                    : "rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                }
                href={crewHref(filters, { panel: "time-off", selected: null, timeOffStatus: status })}
                key={status}
              >
                {statusLabel(status)}
              </Link>
            ))}
            <Link
              className={
                filters.timeOffStatus === "all"
                  ? "rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white"
                  : "rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              }
              href={crewHref(filters, { panel: "time-off", selected: null, timeOffStatus: "all" })}
            >
              All
            </Link>
          </div>
        </section>

        <section className="grid gap-2 sm:grid-cols-4">
          {TIME_OFF_STATUS_FILTERS.map((status) => (
            <article className="rounded-md border border-zinc-200 bg-white p-3" key={status}>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                {statusLabel(status)}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {timeOffData.summary[status]}
              </p>
            </article>
          ))}
        </section>

        <section className="space-y-2">
          {visibleRequests.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
              No {statusLabel(filters.timeOffStatus).toLowerCase()} time-off requests.
            </p>
          ) : (
            visibleRequests.map((request) => (
              <TimeOffRequestRow key={request.id} request={request} returnTo={returnTo} />
            ))
          )}
        </section>
      </div>
    </ContextDrawer>
  );
}

function CrewDrawer({
  crewMembers,
  filters,
  roster,
  timeOffData,
}: {
  crewMembers: CrewMemberRow[];
  filters: CrewFilters;
  roster: Awaited<ReturnType<typeof getCrewRosterData>>;
  timeOffData: TimeOffWorkflowData;
}) {
  if (!filters.panel) {
    return null;
  }

  const closeHref = crewHref(filters, { panel: null, selected: null });
  if (filters.panel === "time-off") {
    return <TimeOffDrawer filters={filters} timeOffData={timeOffData} />;
  }

  if (filters.panel === "create") {
    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Crew workflow" size="wide" title="Add Crew Member">
        <div className="space-y-4">
          <section className="rounded-md border status-surface-info p-3 text-sm">
            Create the core crew record first. Qualifications, compliance evidence,
            logistics, scheduling, and aircraft assignments stay in their focused
            workflows after the person exists.
          </section>
          <CrewMemberCreateForm stations={roster.stations} />
        </div>
      </ContextDrawer>
    );
  }

  if (!filters.selected) {
    return null;
  }

  const crewMember = crewMembers.find((item) => item.id === filters.selected);

  if (!crewMember) {
    return (
      <ContextDrawer closeHref={closeHref} eyebrow="Crew quick review" title="Crew Member">
        <p className="text-sm text-zinc-600">No crew member found for this selection.</p>
      </ContextDrawer>
    );
  }

  const qualificationWarnings = getQualificationWarnings(crewMember.qualifications, roster.now);
  const warnings = crewWarnings(crewMember, roster.now);
  const currentDrawerHref = crewHref(filters, { panel: "crew", selected: crewMember.id });
  const complianceStatusOrder = ["EXPIRED", "MISSING", "NOT_ENOUGH_DATA", "DUE_SOON", "CURRENT"];
  const actionableFindings = crewMember.complianceFindings
    .filter((finding) => finding.status !== "CURRENT")
    .sort((left, right) => {
      if (left.requirementType === CrewComplianceRequirementType.MEDICAL) {
        return -1;
      }
      if (right.requirementType === CrewComplianceRequirementType.MEDICAL) {
        return 1;
      }

      return complianceStatusOrder.indexOf(left.status) - complianceStatusOrder.indexOf(right.status);
    });

  return (
    <ContextDrawer
      closeHref={closeHref}
      eyebrow="Crew profile"
      size="wide"
      title={`${crewMember.firstName} ${crewMember.lastName}`}
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${employmentBadgeClasses(crewMember.employmentStatus)}`}>
              {statusLabel(crewMember.employmentStatus)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${dutyBadgeClasses(crewMember.dutyStatus)}`}>
              {dutyStatusLabel(crewMember.dutyStatus)}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            Base {crewMember.baseStation.code} - {crewMember.baseStation.city}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {crewMember.email ?? "No email"} | {crewMember.phone ?? "No phone"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Employee #{crewMember.employeeNumber}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            DOB {toDateOrNotSet(crewMember.dateOfBirth)}
          </p>
          <details className="mt-3 rounded-lg border border-zinc-200 bg-white p-2">
            <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
              Edit profile
            </summary>
            <CrewMemberInlineEditForm
              crewMember={crewMember}
              returnTo={currentDrawerHref}
              stations={roster.stations}
            />
          </details>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Warnings
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${complianceStatusBadgeClasses(
                crewMember.complianceStatus,
              )}`}
            >
              {warnings.length} open
            </span>
          </div>
          {actionableFindings.length || qualificationWarnings.length ? (
            <div className="mt-2 space-y-2">
              {actionableFindings.map((finding) => (
                <details className="rounded-lg border status-surface-stop p-2 text-sm" key={finding.ruleKey}>
                  <summary className="cursor-pointer font-semibold">
                    {finding.title} <span className="font-medium">({statusLabel(finding.status)})</span>
                  </summary>
                  <p className="mt-2 text-xs status-on-stop-muted">{finding.message}</p>
                  <p className="mt-1 text-xs status-on-stop-muted">
                    Due {toDateOrNotSet(finding.dueAt)} | {finding.sourceCitation}
                  </p>
                  <EvidenceQuickForm
                    activeOperatingParts={roster.activeOperatingParts}
                    crewMember={crewMember}
                    finding={finding}
                    returnTo={currentDrawerHref}
                  />
                </details>
              ))}
              {qualificationWarnings.map((warning) => (
                <p className="rounded-lg border status-surface-stop p-2 text-sm" key={warning}>
                  {warning}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-2 rounded-lg border status-surface-success p-3 text-sm">
              No current crew-profile warnings.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Aircraft qualifications
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                These are aircraft/seat qualification records. Recurrent, IPC, medical, and line-check currency are tracked under compliance requirements.
              </p>
            </div>
          </div>
          {crewMember.qualifications.length ? (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {crewMember.qualifications.map((qualification) => (
                <li
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-sm"
                  key={qualification.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-zinc-950">
                      {formatAircraftType(qualification.aircraftType)}{" "}
                      {formatRoleLabel(qualification.seatRole)}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${qualificationBadgeClasses(
                        qualification,
                        roster.now,
                      )}`}
                    >
                      {qualificationStatus(qualification, roster.now)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">
                    Issued {toDate(qualification.issuedAt)} | Admin expires{" "}
                    {toDate(qualification.expiresAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">No qualifications recorded.</p>
          )}
          <details className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
            <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
              Add aircraft/seat qualification
            </summary>
            <CrewQualificationInlineCreateForm crewMember={crewMember} returnTo={currentDrawerHref} />
          </details>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Compliance snapshot
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${complianceStatusBadgeClasses(
                crewMember.complianceStatus,
              )}`}
            >
              {statusLabel(crewMember.complianceStatus)}
            </span>
          </div>
          {crewMember.complianceFindings.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600">No crew compliance rules are active.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {crewMember.complianceFindings.map((finding) => (
                <li className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-sm" key={finding.ruleKey}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-zinc-950">{finding.title}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${complianceStatusBadgeClasses(
                        finding.status,
                      )}`}
                    >
                      {statusLabel(finding.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">
                    Due {toDateOrNotSet(finding.dueAt)} | {finding.sourceCitation}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{finding.message}</p>
                  {finding.evidenceRef ? (
                    <p className="mt-1 text-xs font-medium text-emerald-700">
                      Evidence on file: {finding.evidenceRef.type.replace("Crew", "").replace("Event", " event")}
                    </p>
                  ) : null}
                  {finding.status !== "CURRENT" ? (
                    <details className="mt-2 rounded-md border border-zinc-200 bg-white p-2">
                      <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
                        Add completed evidence
                      </summary>
                      <EvidenceQuickForm
                        activeOperatingParts={roster.activeOperatingParts}
                        crewMember={crewMember}
                        finding={finding}
                        returnTo={currentDrawerHref}
                      />
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            Preference/warning review only. Planned items do not satisfy a rule until completed evidence is recorded.
          </p>
        </section>

        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
            href={crewHref(filters, {
              panel: "time-off",
              selected: null,
              timeOffStatus: TimeOffRequestStatus.PENDING,
            })}
          >
            Time off
          </Link>
          <Link className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700" href={`/crew/${crewMember.id}/logistics`}>
            Logistics
          </Link>
        </div>
      </div>
    </ContextDrawer>
  );
}

export default async function CrewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseCrewFilters(params);
  const [roster, timeOffData] = await Promise.all([
    getCrewRosterData(),
    getTimeOffWorkflowData({
      crewMemberId: "all",
      fromDate: null,
      requestType: "all",
      status: "all",
      toDate: null,
    }),
  ]);
  const error = firstParam(params.error);
  const filteredCrewMembers = filterCrewMembers(roster.crewMembers, filters, roster.now);
  const baseOptions = Array.from(new Set(roster.crewMembers.map((crewMember) => crewMember.baseStation.code))).sort();
  const activeCrewMembers = roster.crewMembers.filter(
    (crewMember) => crewMember.employmentStatus === EmploymentStatus.ACTIVE,
  );
  const activeCrew = activeCrewMembers.length;
  const warningCrewCount = activeCrewMembers.filter(
    (crewMember) => crewWarnings(crewMember, roster.now).length > 0,
  ).length;
  const warningCount = activeCrewMembers.reduce((count, crewMember) => {
    return count + crewWarnings(crewMember, roster.now).length;
  }, 0);
  const leaveOrInactiveCount = roster.crewMembers.filter(
    (crewMember) => crewMember.employmentStatus !== EmploymentStatus.ACTIVE,
  ).length;
  const pendingTimeOffCount = timeOffData.summary[TimeOffRequestStatus.PENDING];

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        {error ? (
          <section className="rounded-md border status-surface-stop p-3 text-sm">
            {decodeURIComponent(error)}
          </section>
        ) : null}

        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Active roster</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {activeCrew}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Visible crew</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{filteredCrewMembers.length}</p>
          </article>
          <article className="rounded-xl border status-surface-stop px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide status-on-stop-muted">Crew warnings</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {warningCrewCount} / {warningCount}
            </p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">Pending time off</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{pendingTimeOffCount}</p>
          </article>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <form className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
              <SelectFilter defaultValue={filters.status} label="Employment" name="status">
                <option value={EmploymentStatus.ACTIVE}>Active</option>
                <option value={EmploymentStatus.ON_LEAVE}>On leave</option>
                <option value={EmploymentStatus.INACTIVE}>Inactive</option>
                <option value={EmploymentStatus.TERMINATED}>Terminated</option>
                <option value="all">All statuses</option>
              </SelectFilter>
              <SelectFilter defaultValue={filters.duty} label="Duty availability" name="duty">
                <option value="all">All duty states</option>
                <optgroup label="Scheduled / available">
                  <option value={DutyStatus.ON_DUTY}>On duty</option>
                  <option value={DutyStatus.RESERVE}>Reserve</option>
                  <option value={DutyStatus.TRAINING}>Training</option>
                  <option value={DutyStatus.DEADHEADING}>Deadheading</option>
                </optgroup>
                <optgroup label="Off / unavailable">
                  <option value={DutyStatus.OFF_DUTY}>Off duty</option>
                  <option value={DutyStatus.VACATION}>Vacation</option>
                  <option value={DutyStatus.SICK}>Sick</option>
                  <option value={DutyStatus.PERSONAL}>Personal</option>
                </optgroup>
              </SelectFilter>
              <SelectFilter defaultValue={filters.assignment} label="Assignment" name="assignment">
                <option value="all">All assignments</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </SelectFilter>
              <SelectFilter defaultValue={filters.issue} label="Issue focus" name="issue">
                <option value="all">All crew</option>
                <option value="warnings">Warnings only</option>
              </SelectFilter>
              <SelectFilter defaultValue={filters.base} label="Base" name="base">
                <option value="all">All bases</option>
                {baseOptions.map((base) => (
                  <option key={base} value={base}>
                    {base}
                  </option>
                ))}
              </SelectFilter>
              <div className="flex flex-wrap items-end gap-2 lg:col-span-5">
                <button className="rounded-md bg-zinc-950 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800" type="submit">
                  Apply filters
                </button>
                <Link className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" href="/crew">
                  Reset
                </Link>
                <span className="text-xs font-medium text-zinc-500">{employmentFilterNote(filters.status)}</span>
              </div>
            </form>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href={crewHref(filters, { panel: "create", selected: null })}
              >
                Add crew member
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href={crewHref(filters, {
                  panel: "time-off",
                  selected: null,
                  timeOffStatus: TimeOffRequestStatus.PENDING,
                })}
              >
                Time off
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/logistics"
              >
                Logistics
              </Link>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                Non-active {leaveOrInactiveCount}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          {roster.crewMembers.length === 0 ? (
            <div className="rounded-md border status-surface-info p-4 text-sm">
              <p className="font-medium">No crew members found.</p>
              <p className="mt-1">
                The read-only crew page is ready, but the database has no roster rows to display.
              </p>
            </div>
          ) : filteredCrewMembers.length === 0 ? (
            <div className="rounded-md border status-surface-info p-4 text-sm">
              <p className="font-medium">No crew match the selected filters.</p>
              <p className="mt-1">Clear filters to return to the full crew roster.</p>
              <Link className="mt-3 inline-flex rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white" href="/crew">
                Reset crew filters
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredCrewMembers.map((crewMember) => {
                const upcomingFlights = roster.upcomingFlightsByCrewId.get(crewMember.id) ?? [];
                const warnings = crewWarnings(crewMember, roster.now);

                return (
                  <Link
                    className="group block rounded-md border border-zinc-200 bg-white px-3 py-2.5 transition hover:border-sky-200 hover:bg-sky-50"
                    href={crewHref(filters, { panel: "crew", selected: crewMember.id })}
                    key={crewMember.id}
                  >
                    <article className="grid gap-3 lg:grid-cols-[minmax(15rem,1.2fr)_minmax(14rem,1fr)_minmax(13rem,0.9fr)_minmax(12rem,0.8fr)] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-zinc-950 group-hover:text-sky-900">
                            {crewMember.firstName} {crewMember.lastName}
                          </span>
                          <span className="text-xs text-zinc-500">
                            #{crewMember.employeeNumber}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-zinc-600">
                          {crewMember.baseStation.code} - {crewMember.baseStation.city}
                          {crewMember.email ? ` | ${crewMember.email}` : " | no email"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${employmentBadgeClasses(
                            crewMember.employmentStatus,
                          )}`}
                        >
                          {statusLabel(crewMember.employmentStatus)}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${dutyBadgeClasses(
                            crewMember.dutyStatus,
                          )}`}
                        >
                          {dutyStatusLabel(crewMember.dutyStatus)}
                        </span>
                        {warnings.length > 0 ? (
                          <span className="inline-flex rounded-full border status-badge-stop px-2 py-0.5 text-xs font-medium">
                            {warnings.length} warning{warnings.length === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>

                      <div className="min-w-0 text-xs text-zinc-600">
                        {crewMember.assignments.length === 0 ? (
                          <p>No active aircraft assignment</p>
                        ) : (
                          <p className="truncate">
                            {crewMember.assignments.map(assignmentLabel).join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="min-w-0">
                        {crewMember.qualifications.length === 0 ? (
                          <p className="text-xs text-zinc-500">No qualifications</p>
                        ) : (
                          <p className="truncate text-xs text-zinc-600">
                            {crewMember.qualifications
                              .slice(0, 3)
                              .map(
                                (qualification) =>
                                  `${formatAircraftType(qualification.aircraftType)} ${formatRoleLabel(
                                    qualification.seatRole,
                                  )}`,
                              )
                              .join(", ")}
                            {crewMember.qualifications.length > 3
                              ? ` +${crewMember.qualifications.length - 3}`
                              : ""}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 lg:col-start-4">
                        {upcomingFlights.length === 0 ? (
                          <span>No upcoming covered legs</span>
                        ) : (
                          <span>{upcomingFlights.length} upcoming covered leg{upcomingFlights.length === 1 ? "" : "s"}</span>
                        )}
                        <span className="font-semibold text-sky-700 group-hover:text-sky-900">
                          Open
                        </span>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
        <CrewDrawer
          crewMembers={roster.crewMembers}
          filters={filters}
          roster={roster}
          timeOffData={timeOffData}
        />
      </div>
    </main>
  );
}
