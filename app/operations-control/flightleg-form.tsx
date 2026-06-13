import Link from "next/link";
import type { OperatingPart } from "@prisma/client";

import { FlightLegEditData, FlightLegFormOptions } from "@/lib/flightleg-form-queries";

type FlightLegFormProps = {
  action: (formData: FormData) => Promise<void>;
  backHref?: string;
  cancelHref?: string;
  createReturnMode?: "default" | "flight-drawer";
  error?: string | null;
  initial?: FlightLegEditData | null;
  mode: "create" | "edit";
  options: FlightLegFormOptions;
  variant?: "drawer" | "page";
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

function selectedControlNotes(initial: FlightLegEditData | null | undefined): string {
  return initial?.operationalControlRecord?.controlNotes ?? "";
}

function selectedCustomerId(initial: FlightLegEditData | null | undefined): string {
  return initial?.operationalControlRecord?.customer?.id ?? "";
}

function formatOperatingPart(part: OperatingPart): string {
  return part.replace("PART_", "Part ");
}

function authorityLabel(
  authority: FlightLegFormOptions["operatingAuthorities"][number],
): string {
  return `${formatOperatingPart(authority.operatingPart)}${
    authority.status === "ACTIVE" ? "" : ` (${authority.status.toLowerCase()})`
  }`;
}

function selectedOperatingAuthorityId(
  initial: FlightLegEditData | null | undefined,
  options: FlightLegFormOptions,
): string {
  if (initial?.operatingAuthorityId) {
    return initial.operatingAuthorityId;
  }

  return options.operatingAuthorities.find((authority) => authority.status === "ACTIVE")?.id ?? "";
}

function visibleAuthorities(
  options: FlightLegFormOptions,
  selectedAuthorityId: string,
): FlightLegFormOptions["operatingAuthorities"] {
  return options.operatingAuthorities.filter(
    (authority) => authority.status === "ACTIVE" || authority.id === selectedAuthorityId,
  );
}

function customerOptionLabel(customer: FlightLegFormOptions["customers"][number]): string {
  return customer.customerCode ? `${customer.name} (${customer.customerCode})` : customer.name;
}

export function FlightLegForm({
  action,
  backHref = "/operations-control",
  cancelHref = "/operations-control",
  createReturnMode = "default",
  error,
  initial,
  mode,
  options,
  variant = "page",
}: FlightLegFormProps) {
  const title = mode === "create" ? "New flight leg" : "Edit flight leg";
  const submitLabel = mode === "create" ? "Create flight leg" : "Save flight leg";
  const selectedAuthorityId = selectedOperatingAuthorityId(initial, options);
  const authorityOptions = visibleAuthorities(options, selectedAuthorityId);
  const isDrawer = variant === "drawer";

  return (
    <form
      action={action}
      className={
        isDrawer
          ? "rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
          : "rounded-md border border-zinc-200 bg-white p-5 shadow-sm"
      }
    >
      {mode === "create" && createReturnMode !== "default" ? (
        <input name="afterCreate" type="hidden" value={createReturnMode} />
      ) : null}

      <div className="flex flex-col gap-2 border-b border-zinc-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Flight setup
          </p>
          <h1 className={isDrawer ? "mt-1 text-xl font-semibold tracking-tight text-zinc-950" : "mt-1 text-2xl font-semibold tracking-tight text-zinc-950"}>
            {title}
          </h1>
          {isDrawer ? null : (
            <p className="mt-2 max-w-3xl text-sm text-zinc-600">
              Creates or updates the flight leg, aircraft assignment, customer link, and
              operating authority together.
            </p>
          )}
        </div>
        <Link className="text-sm font-medium text-sky-700 hover:text-sky-900" href={backHref}>
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
          <span className="flex items-center justify-between gap-3 text-sm font-medium text-zinc-700">
            Customer
            <Link className="text-xs font-semibold text-sky-700 hover:text-sky-900" href="/customers">
              Create customer
            </Link>
          </span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={selectedCustomerId(initial)}
            name="customerId"
            required
          >
            <option value="">Select customer</option>
            {options.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customerOptionLabel(customer)}
              </option>
            ))}
          </select>
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Operating authority</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={selectedAuthorityId}
            name="operatingAuthorityId"
            required
          >
            <option value="">Select authority</option>
            {authorityOptions.map((authority) => (
              <option key={authority.id} value={authority.id}>
                {authorityLabel(authority)}
              </option>
            ))}
          </select>
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
          defaultValue={selectedControlNotes(initial)}
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
          href={cancelHref}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
