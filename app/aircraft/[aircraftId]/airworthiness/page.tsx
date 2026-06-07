import { DeferralStatus, DiscrepancyStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createDeferralAction,
  createDiscrepancyAction,
  updateDeferralAction,
  updateDiscrepancyAction,
} from "@/app/aircraft/[aircraftId]/airworthiness/actions";
import {
  editableDeferralStatuses,
  editableDiscrepancyStatuses,
  getAircraftAirworthinessWorkflowData,
  AircraftAirworthinessWorkflowData,
} from "@/lib/airworthiness-workflow-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    aircraftId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

type Discrepancy = AircraftAirworthinessWorkflowData["discrepancies"][number];
type Deferral = AircraftAirworthinessWorkflowData["deferrals"][number];

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toDateTimeLabel(value: Date | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
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

function statusClasses(status: DiscrepancyStatus | null): string {
  if (status === DiscrepancyStatus.OPEN || status === DiscrepancyStatus.DEFERRED) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === DiscrepancyStatus.CLEARED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === DiscrepancyStatus.CANCELLED) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function StatusBadge({ status }: { status: DiscrepancyStatus | null }) {
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

function DeferralStatusBadge({ status }: { status: DeferralStatus | null }) {
  const classes =
    status === DeferralStatus.ACTIVE
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : status === DeferralStatus.CLEARED
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-zinc-200 bg-zinc-50 text-zinc-500";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}>
      {status ?? "Missing"}
    </span>
  );
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

function StatusSelect({ defaultValue }: { defaultValue?: DiscrepancyStatus }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Status</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? DiscrepancyStatus.OPEN}
        name="status"
      >
        {editableDiscrepancyStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </label>
  );
}

function DeferralStatusSelect({ defaultValue }: { defaultValue?: DeferralStatus }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Status</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? DeferralStatus.ACTIVE}
        name="status"
      >
        {editableDeferralStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </label>
  );
}

function DiscrepancySelect({ discrepancies }: { discrepancies: Discrepancy[] }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Discrepancy</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        name="discrepancyId"
        required
      >
        <option value="">Select discrepancy</option>
        {discrepancies.map((discrepancy) => (
          <option key={discrepancy.id} value={discrepancy.id}>
            {discrepancy.discrepancyNumber} | {discrepancy.title}
          </option>
        ))}
      </select>
    </label>
  );
}

function DiscrepancyForm({
  action,
  discrepancy,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  discrepancy?: Discrepancy;
  submitLabel: string;
}) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field
          defaultValue={discrepancy?.discrepancyNumber ?? ""}
          label="Discrepancy number"
          name="discrepancyNumber"
        />
        <Field defaultValue={discrepancy?.title ?? ""} label="Title" name="title" required />
        <Field defaultValue={discrepancy?.severity ?? ""} label="Severity" name="severity" />
        <StatusSelect defaultValue={discrepancy?.status} />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <TextArea
          defaultValue={discrepancy?.description}
          label="Description"
          name="description"
        />
        <TextArea
          defaultValue={discrepancy?.correctiveSummary}
          label="Corrective summary"
          name="correctiveSummary"
        />
      </div>
      <div className="mt-3 max-w-sm">
        <Field
          defaultValue={toInputDateTime(discrepancy?.clearedAt)}
          label="Cleared at"
          name="clearedAt"
          type="datetime-local"
        />
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

function DeferralForm({
  action,
  deferral,
  discrepancies,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  deferral?: Deferral;
  discrepancies?: Discrepancy[];
  submitLabel: string;
}) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      {discrepancies ? (
        <div className="mb-3">
          <DiscrepancySelect discrepancies={discrepancies} />
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field
          defaultValue={deferral?.deferralNumber ?? ""}
          label="Deferral number"
          name="deferralNumber"
        />
        <Field defaultValue={deferral?.category ?? ""} label="Category" name="category" />
        <DeferralStatusSelect defaultValue={deferral?.status} />
        <Field
          defaultValue={toInputDateTime(deferral?.dueAt)}
          label="Due at"
          name="dueAt"
          type="datetime-local"
        />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <TextArea defaultValue={deferral?.notes} label="Notes" name="notes" />
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">
            Discrepancy handling when cleared
          </span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue="KEEP_DEFERRED"
            name="discrepancyResolution"
          >
            <option value="KEEP_DEFERRED">Keep discrepancy deferred</option>
            <option value="MARK_CLEARED">Mark discrepancy cleared</option>
          </select>
        </label>
      </div>
      <div className="mt-3 max-w-sm">
        <Field
          defaultValue={toInputDateTime(deferral?.clearedAt)}
          label="Cleared at"
          name="clearedAt"
          type="datetime-local"
        />
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

function ContextCards({ aircraft }: { aircraft: AircraftAirworthinessWorkflowData }) {
  const configuration = aircraft.configurations[0] ?? null;
  const release = aircraft.airworthinessReleases[0] ?? null;
  const latestMaintenance = aircraft.maintenanceEvents[0] ?? null;
  const capabilityCodes = aircraft.capabilities
    .map((capability) => capability.capabilityCode)
    .join(", ");

  return (
    <section className="grid gap-3 lg:grid-cols-2">
      <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-zinc-900">Configuration</p>
        <p className="mt-2 text-sm text-zinc-700">
          {configuration?.configurationLabel ?? "No active configuration"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Seats {configuration?.passengerSeatCount ?? aircraft.seats ?? "not set"} | Empty
          weight {configuration?.emptyWeight?.toString() ?? "not set"} | CG{" "}
          {configuration?.emptyWeightCg ?? "not set"}
        </p>
      </article>
      <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-zinc-900">Airworthiness release</p>
        <p className="mt-2 text-sm text-zinc-700">
          {release?.releaseNumber ?? "No released airworthiness record"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Released {toDateTimeLabel(release?.releasedAt)} | Expires{" "}
          {toDateTimeLabel(release?.expiresAt)}
        </p>
      </article>
      <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-zinc-900">Capabilities</p>
        <p className="mt-2 text-sm text-zinc-700">
          {capabilityCodes || "No active capability records"}
        </p>
      </article>
      <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-zinc-900">Latest maintenance</p>
        <p className="mt-2 text-sm text-zinc-700">
          {latestMaintenance
            ? `${latestMaintenance.maintenanceNumber} | ${latestMaintenance.eventType}`
            : "No completed maintenance event"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Completed {toDateTimeLabel(latestMaintenance?.completedAt)} | RTS{" "}
          {toDateTimeLabel(latestMaintenance?.returnToServiceAt)}
        </p>
      </article>
    </section>
  );
}

function ActiveDeferrals({ aircraft }: { aircraft: AircraftAirworthinessWorkflowData }) {
  if (aircraft.deferrals.length === 0) {
    return <p className="text-sm text-zinc-600">No deferrals recorded.</p>;
  }

  return (
    <div className="space-y-2">
      {aircraft.deferrals.map((deferral) => (
        <article
          className="rounded-md border border-zinc-200 bg-white p-3 text-sm"
          key={deferral.id}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-zinc-950">{deferral.deferralNumber}</p>
                <DeferralStatusBadge status={deferral.status} />
                <span className="text-zinc-600">{deferral.category ?? "No category"}</span>
              </div>
              <p className="mt-1 text-zinc-700">
                {deferral.discrepancy.discrepancyNumber}: {deferral.discrepancy.title}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Deferred {toDateTimeLabel(deferral.deferredAt)} | Due{" "}
                {toDateTimeLabel(deferral.dueAt)} | Cleared{" "}
                {toDateTimeLabel(deferral.clearedAt)}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <DeferralForm
              action={updateDeferralAction.bind(null, aircraft.id, deferral.id)}
              deferral={deferral}
              submitLabel="Save deferral"
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function DiscrepancyList({
  aircraftId,
  discrepancies,
}: {
  aircraftId: string;
  discrepancies: Discrepancy[];
}) {
  if (discrepancies.length === 0) {
    return <p className="text-sm text-zinc-600">No discrepancies recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {discrepancies.map((discrepancy) => {
        const updateAction = updateDiscrepancyAction.bind(null, aircraftId, discrepancy.id);

        return (
          <article className="rounded-md border border-zinc-200 bg-white p-3" key={discrepancy.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-zinc-950">
                    {discrepancy.discrepancyNumber}
                  </p>
                  <StatusBadge status={discrepancy.status} />
                </div>
                <p className="mt-1 font-medium text-zinc-900">{discrepancy.title}</p>
                <p className="mt-1 text-sm text-zinc-600">
                  {discrepancy.description ?? "No description."}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Reported {toDateTimeLabel(discrepancy.reportedAt)} | Cleared{" "}
                  {toDateTimeLabel(discrepancy.clearedAt)} | Severity{" "}
                  {discrepancy.severity ?? "not set"}
                </p>
              </div>
              <div className="text-xs text-zinc-500">
                {discrepancy.deferrals.length} deferral(s)
              </div>
            </div>
            {discrepancy.correctiveSummary ? (
              <p className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm text-zinc-700">
                {discrepancy.correctiveSummary}
              </p>
            ) : null}
            <div className="mt-3">
              <DiscrepancyForm
                action={updateAction}
                discrepancy={discrepancy}
                submitLabel="Save discrepancy"
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default async function AircraftAirworthinessPage({ params, searchParams }: PageProps) {
  const [{ aircraftId }, queryParams] = await Promise.all([params, searchParams]);
  const aircraft = await getAircraftAirworthinessWorkflowData(aircraftId);

  if (!aircraft) {
    notFound();
  }

  const createAction = createDiscrepancyAction.bind(null, aircraft.id);
  const activeDiscrepancies = aircraft.discrepancies.filter(
    (discrepancy) =>
      discrepancy.status === DiscrepancyStatus.OPEN ||
      discrepancy.status === DiscrepancyStatus.DEFERRED,
  );
  const activeDeferrals = aircraft.deferrals.filter(
    (deferral) => deferral.status === DeferralStatus.ACTIVE,
  );

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Link className="text-sm font-medium text-sky-700 hover:text-sky-900" href="/aircraft">
              Back to Aircraft
            </Link>
            <Link
              className="text-sm font-medium text-zinc-700 hover:text-zinc-950"
              href="/operations-control"
            >
              Operations Control
            </Link>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Aircraft Airworthiness
          </p>
          <h1 className="mt-1.5 font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
            {aircraft.tailNumber}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Aircraft-level discrepancy workflow. Deferrals, maintenance events,
            airworthiness release signing, and release blocking remain deferred.
          </p>
        </header>

        {firstSearchParam(queryParams.error) ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {firstSearchParam(queryParams.error)}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-4">
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Open/deferred</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {activeDiscrepancies.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">All discrepancies</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {aircraft.discrepancies.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Active deferrals</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {activeDeferrals.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Capabilities</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {aircraft.capabilities.length}
            </p>
          </article>
        </section>

        <ContextCards aircraft={aircraft} />

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create discrepancy</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Leave discrepancy number blank to auto-generate one. This first
            workflow records aircraft-level discrepancy evidence only.
          </p>
          <div className="mt-4">
            <DiscrepancyForm action={createAction} submitLabel="Create discrepancy" />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Discrepancies</h2>
          <div className="mt-4">
            <DiscrepancyList aircraftId={aircraft.id} discrepancies={aircraft.discrepancies} />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create deferral</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Create deferrals from existing OPEN or DEFERRED discrepancies. Hard
            release blocking remains deferred.
          </p>
          <div className="mt-4">
            {activeDiscrepancies.length === 0 ? (
              <p className="text-sm text-zinc-600">
                No OPEN or DEFERRED discrepancies are available for deferral.
              </p>
            ) : (
              <DeferralForm
                action={createDeferralAction.bind(null, aircraft.id)}
                discrepancies={activeDiscrepancies}
                submitLabel="Create deferral"
              />
            )}
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Deferrals</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Deferral workflow is aircraft-level. Maintenance events and release
            signing remain deferred.
          </p>
          <div className="mt-4">
            <ActiveDeferrals aircraft={aircraft} />
          </div>
        </section>
      </div>
    </main>
  );
}
