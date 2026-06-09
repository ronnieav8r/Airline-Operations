import Link from "next/link";
import { DutyStatus, EmploymentStatus, SeatRole, TimeOffRequestStatus } from "@prisma/client";

import {
  CREW_SCHEDULING_WINDOW_DAYS,
  CrewPlannerMember,
  getCrewSchedulingPlannerData,
} from "@/lib/crew-scheduling-planner-queries";

export const dynamic = "force-dynamic";

function toDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
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

function formatRoleLabel(role: SeatRole): string {
  return role === SeatRole.CPT ? "CPT" : role;
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function employmentBadgeClasses(status: EmploymentStatus): string {
  if (status === EmploymentStatus.ACTIVE) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === EmploymentStatus.ON_LEAVE) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function dutyBadgeClasses(status: DutyStatus): string {
  if (status === DutyStatus.ON_DUTY || status === DutyStatus.RESERVE) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === DutyStatus.SICK || status === DutyStatus.VACATION) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === DutyStatus.TRAINING || status === DutyStatus.DEADHEADING) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function timeOffBadgeClasses(status: TimeOffRequestStatus): string {
  if (status === TimeOffRequestStatus.APPROVED) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function availabilityBadgeClasses(crewMember: CrewPlannerMember): string {
  if (crewMember.availabilityWarnings.length === 0) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (
    crewMember.employmentStatus !== EmploymentStatus.ACTIVE ||
    crewMember.dutyStatus === DutyStatus.SICK ||
    crewMember.dutyStatus === DutyStatus.VACATION
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function availabilityLabel(crewMember: CrewPlannerMember): string {
  if (crewMember.availabilityWarnings.length === 0) {
    return "Available context clear";
  }
  if (
    crewMember.employmentStatus !== EmploymentStatus.ACTIVE ||
    crewMember.dutyStatus === DutyStatus.SICK ||
    crewMember.dutyStatus === DutyStatus.VACATION
  ) {
    return "Unavailable warning";
  }
  return "Review warnings";
}

export default async function CrewSchedulingPage() {
  const data = await getCrewSchedulingPlannerData();
  const windowLabel = `${toDate(data.windowStart)} - ${toDate(data.windowEnd)}`;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Crew Scheduling
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                Crew Availability Planner
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-600">
                Read-only availability, schedule, time-off, assignment, and upcoming
                FlightLeg coverage context. Actual staffing changes still happen through
                aircraft-block crew assignments.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew"
              >
                Crew roster
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/scheduling"
              >
                Flight schedule
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <p className="font-semibold">Planning boundary</p>
          <p className="mt-1">
            This page helps decide who appears available. It does not assign crew,
            replace aircraft-block staffing, enforce duty/rest, or block release actions.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Planning window</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{windowLabel}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {CREW_SCHEDULING_WINDOW_DAYS} days
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Active crew</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.activeCrew}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Schedule blocks</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.crewWithScheduleBlocks}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Time-off overlap</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.crewWithTimeOff}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Assigned now</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.assignedCrew}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Warnings / gaps</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.crewWithAvailabilityWarnings} /{" "}
              {data.summary.upcomingCoverageGaps}
            </p>
          </article>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Crew availability</h2>
              <p className="text-sm text-zinc-600">
                Warning-only planning context for crew scheduling and aircraft-block
                staffing decisions.
              </p>
            </div>
          </div>

          {data.crewMembers.length === 0 ? (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              No crew members found.
            </p>
          ) : (
            <div className="mt-4 grid gap-4">
              {data.crewMembers.map((crewMember) => (
                <article
                  className="rounded-md border border-zinc-200 bg-white p-4"
                  key={crewMember.id}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-zinc-950">
                          {crewMember.firstName} {crewMember.lastName}
                        </h3>
                        <span className="text-xs text-zinc-500">
                          #{crewMember.employeeNumber}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-600">
                        Base {crewMember.baseStation.code} - {crewMember.baseStation.city}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${employmentBadgeClasses(
                          crewMember.employmentStatus,
                        )}`}
                      >
                        {formatStatus(crewMember.employmentStatus)}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${dutyBadgeClasses(
                          crewMember.dutyStatus,
                        )}`}
                      >
                        {formatStatus(crewMember.dutyStatus)}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${availabilityBadgeClasses(
                          crewMember,
                        )}`}
                      >
                        {availabilityLabel(crewMember)}
                      </span>
                    </div>
                  </div>

                  {crewMember.availabilityWarnings.length > 0 ? (
                    <ul className="mt-3 grid gap-2 text-sm text-amber-900 lg:grid-cols-2">
                      {crewMember.availabilityWarnings.map((warning) => (
                        <li
                          className="rounded-md border border-amber-200 bg-amber-50 p-2"
                          key={warning}
                        >
                          {warning}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-4 grid gap-3 xl:grid-cols-4">
                    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Schedule Blocks
                      </h4>
                      {crewMember.schedulesInWindow.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-600">
                          No schedule block in this window.
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-2 text-sm">
                          {crewMember.schedulesInWindow.map((schedule) => (
                            <li key={schedule.id}>
                              <div className="font-medium text-zinc-900">
                                {toDate(schedule.date)} | {formatStatus(schedule.dutyStatus)}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {schedule.startsAt ? toDateTime(schedule.startsAt) : "No start"} -{" "}
                                {schedule.endsAt ? toDateTime(schedule.endsAt) : "No end"} |{" "}
                                {schedule.station?.code ?? "No station"}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Time Off
                      </h4>
                      {crewMember.timeOffInWindow.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-600">No overlapping time off.</p>
                      ) : (
                        <ul className="mt-2 space-y-2 text-sm">
                          {crewMember.timeOffInWindow.map((request) => (
                            <li key={request.id}>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${timeOffBadgeClasses(
                                  request.status,
                                )}`}
                              >
                                {formatStatus(request.status)}
                              </span>
                              <div className="mt-1 text-zinc-900">
                                {formatStatus(request.requestType)}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {toDate(request.startDate)} - {toDate(request.endDate)}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Aircraft Assignment
                      </h4>
                      {crewMember.currentAssignments.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-600">
                          No current aircraft-block assignment.
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-2 text-sm">
                          {crewMember.currentAssignments.map((assignment) => (
                            <li key={assignment.id}>
                              <div className="font-medium text-zinc-900">
                                {formatRoleLabel(assignment.seatRole)} on{" "}
                                {assignment.aircraft.tailNumber}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {assignment.aircraft.type.replaceAll("_", "-")} | since{" "}
                                {toDateTime(assignment.startsAt)}
                              </div>
                              <Link
                                className="mt-1 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900"
                                href={`/aircraft/${assignment.aircraft.id}/crew`}
                              >
                                Manage aircraft crew
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Upcoming Coverage
                      </h4>
                      {crewMember.upcomingFlights.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-600">
                          No upcoming covered FlightLegs in this window.
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-2 text-sm">
                          {crewMember.upcomingFlights.slice(0, 4).map((flight) => (
                            <li key={`${flight.id}-${crewMember.id}`}>
                              <div className="font-medium text-zinc-900">
                                {flight.flightNumber} | {flight.route}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {toDateTime(flight.scheduledDeparture)} | {flight.tailNumber} |{" "}
                                {flight.seatRoles.map(formatRoleLabel).join(", ")}
                              </div>
                              {flight.flightLegId ? (
                                <Link
                                  className="mt-1 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-900"
                                  href={`/operations-control/${flight.flightLegId}`}
                                >
                                  Operations detail
                                </Link>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
