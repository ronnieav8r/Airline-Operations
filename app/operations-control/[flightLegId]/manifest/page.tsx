import {
  IdDocumentType,
  ManifestStatus,
  PassengerAviationInterest,
  PassengerConversationPreference,
  PassengerTemperaturePreference,
} from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addManifestItemAction,
  addExistingPassengerToManifestAction,
  createPassengerAndAddToManifestAction,
  deleteManifestItemAction,
  markManifestReadyAction,
  updateManifestItemAction,
} from "@/app/operations-control/[flightLegId]/manifest/actions";
import {
  getManifestWorkflowData,
  getManifestPassengerOptions,
  ManifestWorkflowData,
} from "@/lib/manifest-workflow-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    flightLegId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

type ManifestItem = NonNullable<ManifestWorkflowData["manifest"]>["items"][number];
type PassengerServiceProfileSummary = {
  aviationInterest: PassengerAviationInterest;
  beveragePreferences: string | null;
  cabinComfortNotes: string | null;
  cateringAvoidances: string | null;
  cateringPreferences: string | null;
  conversationPreference: PassengerConversationPreference;
  flightDeckInteractionNotes: string | null;
  serviceNotes: string | null;
  temperaturePreference: PassengerTemperaturePreference;
} | null;

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toDateTimeLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function decimalString(value: { toString(): string } | null): string {
  return value?.toString() ?? "";
}

function formatEnum(value: string | null | undefined): string {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function servicePreferenceLabel(value: string | null | undefined): string {
  return value && value !== "UNKNOWN" ? formatEnum(value) : "Not set";
}

function hasServiceProfile(profile: PassengerServiceProfileSummary | undefined): profile is NonNullable<PassengerServiceProfileSummary> {
  return Boolean(
    profile &&
      (profile.aviationInterest !== PassengerAviationInterest.UNKNOWN ||
        profile.beveragePreferences ||
        profile.cabinComfortNotes ||
        profile.cateringAvoidances ||
        profile.cateringPreferences ||
        profile.conversationPreference !== PassengerConversationPreference.UNKNOWN ||
        profile.flightDeckInteractionNotes ||
        profile.serviceNotes ||
        profile.temperaturePreference !== PassengerTemperaturePreference.UNKNOWN),
  );
}

function serviceProfileOptionSummary(profile: PassengerServiceProfileSummary | undefined): string | null {
  if (!hasServiceProfile(profile)) {
    return null;
  }

  const parts = [
    profile.cateringPreferences || profile.beveragePreferences ? "service notes" : null,
    profile.temperaturePreference !== PassengerTemperaturePreference.UNKNOWN
      ? servicePreferenceLabel(profile.temperaturePreference)
      : null,
    profile.conversationPreference !== PassengerConversationPreference.UNKNOWN
      ? servicePreferenceLabel(profile.conversationPreference)
      : null,
    profile.aviationInterest !== PassengerAviationInterest.UNKNOWN
      ? servicePreferenceLabel(profile.aviationInterest)
      : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : "service profile";
}

function passengerName(item: ManifestItem): string {
  if (item.personName) {
    return item.personName;
  }

  if (item.passenger) {
    return [item.passenger.firstName, item.passenger.middleName, item.passenger.lastName]
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function passengerRecordName(passenger: {
  firstName: string;
  lastName: string;
  middleName: string | null;
}) {
  return [passenger.firstName, passenger.middleName, passenger.lastName]
    .filter(Boolean)
    .join(" ");
}

function optionName(passenger: {
  email: string | null;
  firstName: string;
  idDocumentType: IdDocumentType | null;
  lastName: string;
  middleName: string | null;
  serviceProfile?: PassengerServiceProfileSummary;
}) {
  const name = passengerRecordName(passenger);
  const details = [
    passenger.email,
    passenger.idDocumentType?.replaceAll("_", " "),
    serviceProfileOptionSummary(passenger.serviceProfile),
  ]
    .filter(Boolean)
    .join(" | ");

  return details ? `${name} (${details})` : name;
}

function itemWarnings(item: ManifestItem): string[] {
  const warnings: string[] = [];

  if (!passengerName(item)) {
    warnings.push("Missing person name.");
  }

  if (!item.weight) {
    warnings.push("Missing passenger weight.");
  }

  return warnings;
}

function manifestWarnings(manifest: ManifestWorkflowData["manifest"]): string[] {
  if (!manifest || manifest.items.length === 0) {
    return ["No manifest items have been added."];
  }

  return manifest.items.flatMap((item) =>
    itemWarnings(item).map((warning) => `${passengerName(item) || "Unnamed item"}: ${warning}`),
  );
}

function statusClasses(status: ManifestStatus | null): string {
  if (status === ManifestStatus.READY || status === ManifestStatus.LOCKED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === ManifestStatus.DRAFT) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function StatusBadge({ status }: { status: ManifestStatus | null }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
        status,
      )}`}
    >
      {status ?? "Missing"}
    </span>
  );
}

function ServiceProfileHighlights({
  profile,
  title = "Passenger service profile",
}: {
  profile: PassengerServiceProfileSummary | undefined;
  title?: string;
}) {
  if (!hasServiceProfile(profile)) {
    return null;
  }

  const highlights = [
    ["Catering", profile.cateringPreferences],
    ["Avoid", profile.cateringAvoidances],
    ["Beverage", profile.beveragePreferences],
    ["Temperature", servicePreferenceLabel(profile.temperaturePreference)],
    ["Conversation", servicePreferenceLabel(profile.conversationPreference)],
    ["Aviation interest", servicePreferenceLabel(profile.aviationInterest)],
  ].filter(([, value]) => value && value !== "Not set");

  const notes = [
    ["Cabin", profile.cabinComfortNotes],
    ["Cockpit / flight deck", profile.flightDeckInteractionNotes],
    ["Service", profile.serviceNotes],
  ].filter(([, value]) => value);

  return (
    <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{title}</p>
        <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5 text-xs font-semibold text-sky-700">
          Preference notes
        </span>
      </div>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        {highlights.map(([label, value]) => (
          <p key={label}>
            <span className="font-medium">{label}:</span> {value}
          </p>
        ))}
      </div>
      {notes.length > 0 ? (
        <div className="mt-2 space-y-1">
          {notes.map(([label, value]) => (
            <p className="rounded border border-sky-200 bg-white p-2" key={label}>
              <span className="font-medium">{label}:</span> {value}
            </p>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-xs text-sky-800">
        Preference notes only; not an operational promise or cockpit-access authorization.
      </p>
    </div>
  );
}

function Field({
  defaultValue,
  label,
  name,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? ""}
        name={name}
        step={type === "number" ? "0.01" : undefined}
        type={type}
      />
    </label>
  );
}

function ManifestItemForm({
  action,
  item,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  item?: ManifestItem;
  submitLabel: string;
}) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Field defaultValue={item ? passengerName(item) : ""} label="Person name" name="personName" />
        <Field defaultValue={item?.seatNumber ?? ""} label="Seat" name="seatNumber" />
        <Field defaultValue={decimalString(item?.weight ?? null)} label="Weight" name="weight" type="number" />
        <Field
          defaultValue={decimalString(item?.baggageWeight ?? null)}
          label="Baggage"
          name="baggageWeight"
          type="number"
        />
        <Field defaultValue={item?.notes ?? ""} label="Notes" name="notes" />
      </div>
      <div className="mt-3">
        <button
          className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          type="submit"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function AddPassengerForm({
  action,
  customerName,
  globalPassengers,
  linkedPassengers,
}: {
  action: (formData: FormData) => Promise<void>;
  customerName: string | null;
  globalPassengers: Awaited<ReturnType<typeof getManifestPassengerOptions>>;
  linkedPassengers: Awaited<ReturnType<typeof getManifestPassengerOptions>>;
}) {
  const linkedIds = new Set(linkedPassengers.map((passenger) => passenger.id));
  const otherPassengers = globalPassengers.filter((passenger) => !linkedIds.has(passenger.id));
  const profiledPassengers = [...linkedPassengers, ...otherPassengers]
    .filter((passenger) => hasServiceProfile(passenger.serviceProfile))
    .slice(0, 6);

  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="block xl:col-span-2">
          <span className="text-xs font-medium text-zinc-600">Passenger</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            name="passengerId"
            required
          >
            <option value="">Select passenger</option>
            {linkedPassengers.length > 0 ? (
              <optgroup label={`${customerName ?? "Customer"} passengers`}>
                {linkedPassengers.map((passenger) => (
                  <option key={passenger.id} value={passenger.id}>
                    {optionName(passenger)}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label="All passengers">
              {otherPassengers.map((passenger) => (
                <option key={passenger.id} value={passenger.id}>
                  {optionName(passenger)}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <Field label="Seat" name="seatNumber" />
        <Field label="Weight" name="weight" type="number" />
        <Field label="Baggage" name="baggageWeight" type="number" />
      </div>
      {profiledPassengers.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Service profiles on file
          </p>
          {profiledPassengers.map((passenger) => (
            <ServiceProfileHighlights
              key={passenger.id}
              profile={passenger.serviceProfile}
              title={passengerRecordName(passenger)}
            />
          ))}
        </div>
      ) : null}
      <div className="mt-3">
        <Field label="Manifest notes" name="notes" />
      </div>
      <button
        className="mt-3 rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
        type="submit"
      >
        Add passenger
      </button>
    </form>
  );
}

function CreatePassengerManifestForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="First name" name="firstName" />
        <Field label="Middle" name="middleName" />
        <Field label="Last name" name="lastName" />
        <Field label="Date of birth" name="dateOfBirth" type="date" />
        <Field label="Email" name="email" type="email" />
        <Field label="Phone" name="phone" />
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">ID type</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            name="idDocumentType"
          >
            <option value="">Not set</option>
            {Object.values(IdDocumentType).map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <Field label="ID number" name="idDocumentNumber" />
        <Field label="Issuing country" name="idIssuingCountry" />
        <Field label="Issuing state" name="idIssuingState" />
        <Field label="ID expiration" name="idDocumentExpiresAt" type="date" />
        <Field label="Seat" name="seatNumber" />
        <Field label="Weight" name="weight" type="number" />
        <Field label="Baggage" name="baggageWeight" type="number" />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Passenger notes" name="passengerNotes" />
        <Field label="Manifest notes" name="notes" />
      </div>
      <button
        className="mt-3 rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
        type="submit"
      >
        Create passenger and add
      </button>
    </form>
  );
}

function ManifestItems({
  flightLegId,
  manifest,
}: {
  flightLegId: string;
  manifest: ManifestWorkflowData["manifest"];
}) {
  if (!manifest || manifest.items.length === 0) {
    return <p className="text-sm text-zinc-600">No manifest items recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {manifest.items.map((item) => {
        const updateAction = updateManifestItemAction.bind(null, flightLegId, item.id);
        const deleteAction = deleteManifestItemAction.bind(null, flightLegId, item.id);
        const warnings = itemWarnings(item);

        return (
          <article className="rounded-md border border-zinc-200 bg-white p-3" key={item.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium text-zinc-900">{passengerName(item) || "Unnamed item"}</p>
                <p className="text-sm text-zinc-500">
                  Seat {item.seatNumber ?? "unassigned"} · Weight{" "}
                  {item.weight?.toString() ?? "not set"} · Baggage{" "}
                  {item.baggageWeight?.toString() ?? "not set"}
                </p>
              </div>
              <form action={deleteAction}>
                <button
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  type="submit"
                >
                  Remove
                </button>
              </form>
            </div>
            {warnings.length > 0 ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                {warnings.join(" ")}
              </div>
            ) : null}
            {item.passenger ? (
              <div className="mt-3">
                <ServiceProfileHighlights profile={item.passenger.serviceProfile} />
              </div>
            ) : null}
            <div className="mt-3">
              <ManifestItemForm action={updateAction} item={item} submitLabel="Save item" />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default async function ManifestWorkflowPage({ params, searchParams }: PageProps) {
  const [{ flightLegId }, queryParams] = await Promise.all([params, searchParams]);
  const [detail, passengerOptions] = await Promise.all([
    getManifestWorkflowData(flightLegId),
    getManifestPassengerOptions(),
  ]);

  if (!detail) {
    notFound();
  }

  const addAction = addManifestItemAction.bind(null, flightLegId);
  const addPassengerAction = addExistingPassengerToManifestAction.bind(null, flightLegId);
  const createPassengerAction = createPassengerAndAddToManifestAction.bind(null, flightLegId);
  const readyAction = markManifestReadyAction.bind(null, flightLegId);
  const warnings = manifestWarnings(detail.manifest);
  const isLocked = detail.manifest?.status === ManifestStatus.LOCKED;
  const linkedPassengers =
    detail.operationalControlRecord?.customer?.passengers.map((link) => link.passenger) ?? [];
  const customerName = detail.operationalControlRecord?.customer?.name ?? null;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="text-sm font-medium text-sky-700 hover:text-sky-900"
              href={`/operations-control/${detail.id}`}
            >
              Back to FlightLeg detail
            </Link>
            <Link className="text-sm font-medium text-zinc-700 hover:text-zinc-950" href="/operations-control">
              Operations Control
            </Link>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Manifest Workflow
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {detail.flightNumber ?? "Unnumbered FlightLeg"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Manual manifest items for {detail.departureStation.code} to {detail.arrivalStation.code},
            scheduled {toDateTimeLabel(detail.scheduledDeparture)}.
          </p>
        </header>

        {firstSearchParam(queryParams.error) ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {firstSearchParam(queryParams.error)}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Manifest status</p>
            <div className="mt-2">
              <StatusBadge status={detail.manifest?.status ?? null} />
            </div>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Items</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{detail.manifest?.items.length ?? 0}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Readiness warnings</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{warnings.length}</p>
          </article>
        </section>

        {warnings.length > 0 ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Warning-first manifest readiness</p>
            <ul className="mt-2 space-y-1">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Manifest readiness</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Marking ready does not lock the manifest and does not gate release yet.
              </p>
            </div>
            <form action={readyAction}>
              <button
                className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                disabled={isLocked}
                type="submit"
              >
                Mark Manifest Ready
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Add passenger</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {customerName
              ? `Passengers linked to ${customerName} are listed first.`
              : "Select from the passenger database or create a new passenger below."}
          </p>
          <div className="mt-4">
            <AddPassengerForm
              action={addPassengerAction}
              customerName={customerName}
              globalPassengers={passengerOptions}
              linkedPassengers={linkedPassengers}
            />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create passenger and add to manifest</h2>
          <p className="mt-1 text-sm text-zinc-600">
            New passengers created here are linked to the flight customer automatically when a
            customer is selected for the FlightLeg.
          </p>
          <div className="mt-4">
            <CreatePassengerManifestForm action={createPassengerAction} />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Manual manifest item</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Use only when a reusable passenger record is not available yet.
          </p>
          <div className="mt-4">
            <ManifestItemForm action={addAction} submitLabel="Add manual item" />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Manifest items</h2>
          <div className="mt-4">
            <ManifestItems flightLegId={flightLegId} manifest={detail.manifest} />
          </div>
        </section>
      </div>
    </main>
  );
}
