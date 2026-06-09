import { DutyStatus, EmploymentStatus, SeatRole } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createAircraftCrewAssignmentAction,
  relieveAircraftCrewAssignmentAction,
  updateAircraftCrewAssignmentAction,
} from "@/app/aircraft/[aircraftId]/crew/actions";
import {
  AircraftCrewMemberOption,
  AircraftCrewWorkflowAssignment,
  editableSeatRoles,
  getAircraftCrewWorkflowData,
  SeatRole as WorkflowSeatRole,
} from "@/lib/aircraft-crew-workflow-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    aircraftId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
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

function toInputDateTime(value: Date | null | undefined): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 16);
}

function formatRoleLabel(role: SeatRole): string {
  return role === SeatRole.CPT ? "CPT" : role;
}

function assignmentTimingBadgeClasses(timing: AircraftCrewWorkflowAssignment["timing"]): string {
  if (timing === "CURRENT") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function availabilityBadgeClasses(status: AircraftCrewMemberOption["availabilityStatus"]): string {
  if (status === "CLEAR") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "UNAVAILABLE") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function dutyBadgeClasses(status: DutyStatus): string {
  if (status === DutyStatus.ON_DUTY || status === DutyStatus.RESERVE) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === DutyStatus.SICK || status === DutyStatus.VACATION) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === DutyStatus.TRAINING || status === DutyStatus.OFF_DUTY) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
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

function Field({
  defaultValue,
  label,
  name,
  required = false,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? ""}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function TextArea({
  defaultValue,
  label,
  name,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <textarea
        className="mt-1 min-h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? ""}
        name={name}
      />
    </label>
  );
}

function SeatRoleSelect({ defaultValue }: { defaultValue?: SeatRole }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Seat role</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? WorkflowSeatRole.FO}
        name="seatRole"
        required
      >
        {editableSeatRoles.map((seatRole) => (
          <option key={seatRole} value={seatRole}>
            {formatRoleLabel(seatRole)}
          </option>
        ))}
      </select>
    </label>
  );
}

function CrewMemberSelect({ crewOptions }: { crewOptions: AircraftCrewMemberOption[] }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Crew member</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        name="crewMemberId"
        required
      >
        <option value="">Select crew member</option>
        {crewOptions.map((crewMember) => (
          <option key={crewMember.id} value={crewMember.id}>
            {crewMember.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function WarningPanel({
  crewOptions,
  seatRole,
}: {
  crewOptions: AircraftCrewMemberOption[];
  seatRole: SeatRole;
}) {
  const warnings = crewOptions.flatMap((crewMember) =>
    (crewMember.warningsBySeatRole[seatRole] ?? []).map((warning) => ({
      crewMember,
      warning,
    })),
  );

  if (warnings.length === 0) {
    return (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        No qualification warnings found for {formatRoleLabel(seatRole)} on this aircraft type.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">
        Qualification warnings are informational and do not block saves.
      </p>
      <ul className="mt-2 space-y-1">
        {warnings.slice(0, 8).map(({ crewMember, warning }) => (
          <li key={`${crewMember.id}-${warning}`}>
            {crewMember.label}: {warning}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AvailabilityHintPanel({ crewOptions }: { crewOptions: AircraftCrewMemberOption[] }) {
  const warnings = crewOptions.filter((crewMember) => crewMember.availabilityWarnings.length > 0);

  return (
    <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">Crew availability hints are warning-only.</p>
          <p className="mt-1">
            Use this context before creating an aircraft-block assignment. The save
            rules are unchanged and the full planner remains read-only.
          </p>
        </div>
        <Link
          className="rounded-md border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
          href="/crew/scheduling"
        >
          Full crew planner
        </Link>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        {crewOptions.map((crewMember) => (
          <article
            className="rounded-md border border-zinc-200 bg-white p-3 text-zinc-800"
            key={crewMember.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">
                {crewMember.firstName} {crewMember.lastName}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${availabilityBadgeClasses(
                  crewMember.availabilityStatus,
                )}`}
              >
                {crewMember.availabilityStatus}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${employmentBadgeClasses(
                  crewMember.employmentStatus,
                )}`}
              >
                {formatStatus(crewMember.employmentStatus)}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${dutyBadgeClasses(
                  crewMember.dutyStatus,
                )}`}
              >
                {formatStatus(crewMember.dutyStatus)}
              </span>
            </div>
            {crewMember.availabilityWarnings.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-500">
                No schedule, time-off, duty, or assignment availability warnings found.
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs text-amber-900">
                {crewMember.availabilityWarnings.slice(0, 3).map((warning) => (
                  <li
                    className="rounded-md border border-amber-200 bg-amber-50 p-2"
                    key={warning}
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>

      {warnings.length === 0 ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
          No crew availability warnings found for active crew options.
        </p>
      ) : null}
    </div>
  );
}

function AssignmentForm({
  action,
  assignment,
  crewOptions,
  mode,
}: {
  action: (formData: FormData) => void;
  assignment?: AircraftCrewWorkflowAssignment;
  crewOptions: AircraftCrewMemberOption[];
  mode: "CREATE" | "EDIT";
}) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="grid gap-3 lg:grid-cols-2">
        {mode === "CREATE" ? (
          <CrewMemberSelect crewOptions={crewOptions} />
        ) : (
          <div>
            <span className="text-sm font-medium text-zinc-700">Crew member</span>
            <p className="mt-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
              {assignment?.crewMember.firstName} {assignment?.crewMember.lastName}
            </p>
          </div>
        )}
        <SeatRoleSelect defaultValue={assignment?.seatRole} />
        <Field
          defaultValue={toInputDateTime(assignment?.startsAt)}
          label="Start time"
          name="startsAt"
          required
          type="datetime-local"
        />
        <Field
          defaultValue={toInputDateTime(assignment?.endsAt)}
          label="End time"
          name="endsAt"
          type="datetime-local"
        />
      </div>
      <div className="mt-3">
        <TextArea defaultValue={assignment?.notes} label="Notes" name="notes" />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          type="submit"
        >
          {mode === "CREATE" ? "Create assignment" : "Save assignment"}
        </button>
        <span className="text-xs text-zinc-500">
          Qualification and CPT/FO coverage issues are warning-only in this workflow.
        </span>
      </div>
    </form>
  );
}

function AssignmentCard({
  aircraftId,
  assignment,
  crewOptions,
}: {
  aircraftId: string;
  assignment: AircraftCrewWorkflowAssignment;
  crewOptions: AircraftCrewMemberOption[];
}) {
  const updateAction = updateAircraftCrewAssignmentAction.bind(
    null,
    aircraftId,
    assignment.id,
  );
  const relieveAction = relieveAircraftCrewAssignmentAction.bind(
    null,
    aircraftId,
    assignment.id,
  );

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-950">
              {assignment.crewMember.firstName} {assignment.crewMember.lastName}
            </h3>
            <span className="rounded-full border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-xs font-semibold text-zinc-700">
              {formatRoleLabel(assignment.seatRole)}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${assignmentTimingBadgeClasses(
                assignment.timing,
              )}`}
            >
              {assignment.timing}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            #{assignment.crewMember.employeeNumber} | {assignment.crewMember.dutyStatus} |{" "}
            {assignment.crewMember.employmentStatus}
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Starts {toDateTime(assignment.startsAt)}
            <br />
            Ends {assignment.endsAt ? toDateTime(assignment.endsAt) : "open block"}
          </p>
        </div>
        {assignment.timing === "CURRENT" ? (
          <form action={relieveAction}>
            <button
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              type="submit"
            >
              Relieve now
            </button>
          </form>
        ) : null}
      </div>
      {assignment.warnings.length > 0 ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Warning-only qualification issue</p>
          <ul className="mt-1 list-inside list-disc">
            {assignment.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <details className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
          Edit assignment
        </summary>
        <div className="mt-3">
          <AssignmentForm
            action={updateAction}
            assignment={assignment}
            crewOptions={crewOptions}
            mode="EDIT"
          />
        </div>
      </details>
    </article>
  );
}

export default async function AircraftCrewWorkflowPage({
  params,
  searchParams,
}: PageProps) {
  const [{ aircraftId }, queryParams] = await Promise.all([params, searchParams]);
  const data = await getAircraftCrewWorkflowData(aircraftId);

  if (!data) {
    notFound();
  }

  const error = firstSearchParam(queryParams.error);
  const createAction = createAircraftCrewAssignmentAction.bind(null, aircraftId);
  const currentAssignments = data.assignments.filter(
    (assignment) => assignment.timing === "CURRENT",
  );
  const upcomingAssignments = data.assignments.filter(
    (assignment) => assignment.timing === "UPCOMING",
  );

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                className="text-sm font-semibold text-sky-700 hover:text-sky-900"
                href={`/aircraft/${aircraftId}`}
              >
                Back to aircraft context
              </Link>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Aircraft Crew Assignment
              </p>
              <h1 className="mt-1.5 font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
                {data.tailNumber}
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                Assign crew to this aircraft by time block. Flight coverage continues to
                resolve from aircraft-block assignments.
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
                href={`/crew/scheduling?aircraft=${aircraftId}&assignment=assigned`}
              >
                Crew planner
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/operations-control"
              >
                Operations Control
              </Link>
            </div>
          </div>
        </header>

        {error ? (
          <section className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {decodeURIComponent(error)}
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Current assignments</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.currentAssignments}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Upcoming assignments</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.upcomingAssignments}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Current CPT/FO gaps</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.missingCurrentRoles.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Leg snapshot gaps</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {data.summary.upcomingLegsWithSnapshotGaps}
            </p>
          </article>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create aircraft-block assignment</h2>
          <p className="mt-1 text-sm text-zinc-600">
            This creates an `AircraftCrewAssignment`, then refreshes affected future
            FlightLeg crew snapshots.
          </p>
          <div className="mt-4">
            <AssignmentForm action={createAction} crewOptions={data.crewOptions} mode="CREATE" />
          </div>
          <div className="mt-4">
            <AvailabilityHintPanel crewOptions={data.crewOptions} />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <WarningPanel crewOptions={data.crewOptions} seatRole={WorkflowSeatRole.CPT} />
            <WarningPanel crewOptions={data.crewOptions} seatRole={WorkflowSeatRole.FO} />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Current assignments</h2>
              <p className="text-sm text-zinc-600">
                Active aircraft-block assignments affecting current coverage.
              </p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                data.summary.missingCurrentRoles.length === 0
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {data.summary.missingCurrentRoles.length === 0
                ? "CPT/FO covered"
                : `Missing ${data.summary.missingCurrentRoles
                    .map(formatRoleLabel)
                    .join(", ")}`}
            </span>
          </div>
          {currentAssignments.length === 0 ? (
            <p className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              No current aircraft-block assignments.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {currentAssignments.map((assignment) => (
                <AssignmentCard
                  aircraftId={aircraftId}
                  assignment={assignment}
                  crewOptions={data.crewOptions}
                  key={assignment.id}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Upcoming assignments</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Future aircraft-block assignments already entered for this aircraft.
          </p>
          {upcomingAssignments.length === 0 ? (
            <p className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              No upcoming aircraft-block assignments.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {upcomingAssignments.map((assignment) => (
                <AssignmentCard
                  aircraftId={aircraftId}
                  assignment={assignment}
                  crewOptions={data.crewOptions}
                  key={assignment.id}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Future FlightLeg snapshot impact</h2>
          <p className="mt-1 text-sm text-zinc-600">
            CrewLegAssignment remains a snapshot/evidence table. Future FlightLeg
            snapshots are refreshed after aircraft-block crew changes.
          </p>
          {data.upcomingLegs.length === 0 ? (
            <p className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              No future FlightLegs are assigned to this aircraft.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-2 font-medium">FlightLeg</th>
                    <th className="px-3 py-2 font-medium">Route</th>
                    <th className="px-3 py-2 font-medium">Scheduled</th>
                    <th className="px-3 py-2 font-medium">Snapshot coverage</th>
                    <th className="px-3 py-2 font-medium">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcomingLegs.map((leg) => (
                    <tr className="border-b border-zinc-100 align-top" key={leg.id}>
                      <td className="px-3 py-2.5 font-medium text-zinc-900">
                        {leg.flightNumber ?? "Unnumbered"}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-700">
                        {leg.departureStation.code} -&gt; {leg.arrivalStation.code}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-700">
                        {toDateTime(leg.scheduledDeparture)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                            leg.missingRoles.length === 0
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}
                        >
                          {leg.missingRoles.length === 0
                            ? "CPT/FO snapshot covered"
                            : `Missing ${leg.missingRoles.map(formatRoleLabel).join(", ")}`}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          className="text-xs font-semibold text-sky-700 hover:text-sky-900"
                          href={`/operations-control/${leg.id}`}
                        >
                          Operations detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
