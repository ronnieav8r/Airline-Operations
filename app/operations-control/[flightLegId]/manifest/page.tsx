import { ManifestStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addManifestItemAction,
  deleteManifestItemAction,
  markManifestReadyAction,
  updateManifestItemAction,
} from "@/app/operations-control/[flightLegId]/manifest/actions";
import {
  getManifestWorkflowData,
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

function passengerName(item: ManifestItem): string {
  if (item.personName) {
    return item.personName;
  }

  if (item.passenger) {
    return `${item.passenger.firstName} ${item.passenger.lastName}`;
  }

  return "";
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
  const detail = await getManifestWorkflowData(flightLegId);

  if (!detail) {
    notFound();
  }

  const addAction = addManifestItemAction.bind(null, flightLegId);
  const readyAction = markManifestReadyAction.bind(null, flightLegId);
  const warnings = manifestWarnings(detail.manifest);
  const isLocked = detail.manifest?.status === ManifestStatus.LOCKED;

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
          <h2 className="text-lg font-semibold">Add manual item</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Manual person-name entries are the v1 path; passenger identity redesign remains deferred.
          </p>
          <div className="mt-4">
            <ManifestItemForm action={addAction} submitLabel="Add item" />
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
