import Link from "next/link";

import { FlightLegEditData, FlightLegFormOptions } from "@/lib/flightleg-form-queries";

type FlightLegFormProps = {
  action: (formData: FormData) => Promise<void>;
  error?: string | null;
  initial?: FlightLegEditData | null;
  mode: "create" | "edit";
  options: FlightLegFormOptions;
};

function formatDateTimeInput(value: Date | null | undefined): string {
  if (!value) {
    return "";
  }

  const pad = (input: number) => input.toString().padStart(2, "0");

  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
    value.getHours(),
  )}:${pad(value.getMinutes())}`;
}

function selectedAircraftId(initial?: FlightLegEditData | null): string {
  return initial?.aircraftAssignments[0]?.aircraftId ?? "";
}

function selectedControlValue(
  initial: FlightLegEditData | null | undefined,
  key: "controllingEntity" | "controlNotes",
): string {
  return initial?.operationalControlRecord?.[key] ?? "";
}

export function FlightLegForm({ action, error, initial, mode, options }: FlightLegFormProps) {
  const title = mode === "create" ? "New FlightLeg" : "Edit FlightLeg";
  const submitLabel = mode === "create" ? "Create FlightLeg" : "Save FlightLeg";

  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-zinc-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Operations Control
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Creates or updates the FlightLeg anchor, compatibility Flight row, aircraft
            assignment, trip container, and operational-control record together.
          </p>
        </div>
        <Link className="text-sm font-medium text-sky-700 hover:text-sky-900" href="/operations-control">
          Back to board
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Flight number</span>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={initial?.flightNumber ?? ""}
            name="flightNumber"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Aircraft</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={selectedAircraftId(initial)}
            name="aircraftId"
            required
          >
            <option value="">Select aircraft</option>
            {options.aircraft.map((aircraft) => (
              <option key={aircraft.id} value={aircraft.id}>
                {aircraft.tailNumber} - {aircraft.type} - {aircraft.status}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Departure station</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={initial?.departureStationId ?? ""}
            name="departureStationId"
            required
          >
            <option value="">Select departure</option>
            {options.stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.code} - {station.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Arrival station</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={initial?.arrivalStationId ?? ""}
            name="arrivalStationId"
            required
          >
            <option value="">Select arrival</option>
            {options.stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.code} - {station.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Scheduled departure</span>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={formatDateTimeInput(initial?.scheduledDeparture)}
            name="scheduledDeparture"
            required
            type="datetime-local"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Scheduled arrival</span>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={formatDateTimeInput(initial?.scheduledArrival)}
            name="scheduledArrival"
            required
            type="datetime-local"
          />
        </label>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Operator</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={initial?.operatorId ?? ""}
            name="operatorId"
            required
          >
            <option value="">Select operator</option>
            {options.operators.map((operator) => (
              <option key={operator.id} value={operator.id}>
                {operator.code} - {operator.name}
                {operator.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Operating authority</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={initial?.operatingAuthorityId ?? ""}
            name="operatingAuthorityId"
            required
          >
            <option value="">Select authority</option>
            {options.operatingAuthorities.map((authority) => (
              <option key={authority.id} value={authority.id}>
                {authority.operator.code} - {authority.operatingPart} - {authority.displayName}
                {authority.status === "ACTIVE" ? "" : ` (${authority.status})`}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Authority revision</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={initial?.authorityRevisionId ?? ""}
            name="authorityRevisionId"
            required
          >
            <option value="">Select revision</option>
            {options.authorityRevisions.map((revision) => (
              <option key={revision.id} value={revision.id}>
                {revision.operatingAuthority.operator.code} -{" "}
                {revision.operatingAuthority.operatingPart} - {revision.revisionLabel}
                {revision.status === "ACTIVE" ? "" : ` (${revision.status})`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Controlling entity</span>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={selectedControlValue(initial, "controllingEntity")}
            name="controllingEntity"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Flight notes</span>
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={initial?.notes ?? ""}
            name="notes"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-zinc-700">Control notes</span>
        <textarea
          className="mt-1 min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
          defaultValue={selectedControlValue(initial, "controlNotes")}
          name="controlNotes"
        />
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          type="submit"
        >
          {submitLabel}
        </button>
        <Link
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          href="/operations-control"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
