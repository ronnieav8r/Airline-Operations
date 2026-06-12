import { AircraftFuelEventType, WeightBalanceStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addWeightBalanceRunAction,
  approveWeightBalanceRunAction,
  markWeightBalanceCalculatedAction,
  updateWeightBalanceRunAction,
  voidWeightBalanceRunAction,
} from "@/app/operations-control/[flightLegId]/weight-balance/actions";
import {
  getWeightBalanceWorkflowData,
  WeightBalanceWorkflowData,
} from "@/lib/weight-balance-workflow-queries";
import { formatFuelAmount, fuelReadyLabel } from "@/lib/fuel";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    flightLegId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

type WeightBalanceRun = WeightBalanceWorkflowData["weightBalanceRuns"][number];

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toDateTimeLabel(value: Date | null): string {
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

function decimalString(value: { toString(): string } | null): string {
  return value?.toString() ?? "";
}

function snapshotNotes(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const notes = (value as { notes?: unknown }).notes;
  return typeof notes === "string" ? notes : "";
}

function statusClasses(status: WeightBalanceStatus | null): string {
  if (status === WeightBalanceStatus.CALCULATED || status === WeightBalanceStatus.APPROVED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === WeightBalanceStatus.DRAFT) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === WeightBalanceStatus.VOIDED) {
    return "border-zinc-200 bg-zinc-50 text-zinc-500";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function StatusBadge({ status }: { status: WeightBalanceStatus | null }) {
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
        step={type === "number" ? "0.01" : undefined}
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
  defaultValue?: string;
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

function WeightBalanceRunForm({
  action,
  run,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  run?: WeightBalanceRun;
  submitLabel: string;
}) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field
          defaultValue={run?.runLabel ?? "Manual W&B"}
          label="Run label"
          name="runLabel"
          required
        />
        <Field
          defaultValue={decimalString(run?.takeoffWeight ?? null)}
          label="Takeoff weight"
          name="takeoffWeight"
          type="number"
        />
        <Field
          defaultValue={decimalString(run?.landingWeight ?? null)}
          label="Landing weight"
          name="landingWeight"
          type="number"
        />
        <Field
          defaultValue={run?.centerOfGravity ?? ""}
          label="Center of gravity"
          name="centerOfGravity"
        />
      </div>
      <div className="mt-3">
        <TextArea defaultValue={snapshotNotes(run?.calculationSnapshot)} label="Notes" name="notes" />
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

function runWarnings(run: WeightBalanceRun): string[] {
  const warnings: string[] = [];

  if (!run.takeoffWeight) {
    warnings.push("Takeoff weight is missing.");
  }

  if (!run.landingWeight) {
    warnings.push("Landing weight is missing.");
  }

  if (!run.centerOfGravity) {
    warnings.push("Center of gravity is missing.");
  }

  return warnings;
}

function workflowWarnings(detail: WeightBalanceWorkflowData, latestRun: WeightBalanceRun | null): string[] {
  const warnings: string[] = [];

  if (!detail.manifest) {
    warnings.push("No manifest is linked to this FlightLeg.");
  } else if (detail.manifest.items.length === 0) {
    warnings.push("Linked manifest has no items.");
  }

  if (!latestRun) {
    warnings.push("No weight-and-balance run has been recorded.");
    return warnings;
  }

  return warnings.concat(runWarnings(latestRun));
}

function WeightBalanceRuns({
  flightLegId,
  runs,
}: {
  flightLegId: string;
  runs: WeightBalanceRun[];
}) {
  if (runs.length === 0) {
    return <p className="text-sm text-zinc-600">No weight-and-balance runs recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const updateAction = updateWeightBalanceRunAction.bind(null, flightLegId, run.id);
        const calculateAction = markWeightBalanceCalculatedAction.bind(null, flightLegId, run.id);
        const approveAction = approveWeightBalanceRunAction.bind(null, flightLegId, run.id);
        const voidAction = voidWeightBalanceRunAction.bind(null, flightLegId, run.id);
        const warnings = runWarnings(run);
        const canMutate = run.status !== WeightBalanceStatus.APPROVED;

        return (
          <article className="rounded-md border border-zinc-200 bg-white p-3" key={run.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-zinc-900">{run.runLabel}</p>
                  <StatusBadge status={run.status} />
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  Takeoff {run.takeoffWeight?.toString() ?? "not set"} | Landing{" "}
                  {run.landingWeight?.toString() ?? "not set"} | CG{" "}
                  {run.centerOfGravity ?? "not set"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Calculated {toDateTimeLabel(run.calculatedAt)} | Updated{" "}
                  {toDateTimeLabel(run.updatedAt)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Approved {toDateTimeLabel(run.approvedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={calculateAction}>
                  <button
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                    disabled={!canMutate || run.status === WeightBalanceStatus.CALCULATED}
                    type="submit"
                  >
                    Mark Calculated
                  </button>
                </form>
                {run.status === WeightBalanceStatus.CALCULATED ? (
                  <form action={approveAction}>
                    <button
                      className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800"
                      type="submit"
                    >
                      Approve
                    </button>
                  </form>
                ) : null}
                <form action={voidAction}>
                  <button
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                    disabled={!canMutate || run.status === WeightBalanceStatus.VOIDED}
                    type="submit"
                  >
                    Void
                  </button>
                </form>
              </div>
            </div>
            {warnings.length > 0 ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                {warnings.join(" ")}
              </div>
            ) : null}
            {canMutate ? (
              <div className="mt-3">
                <WeightBalanceRunForm action={updateAction} run={run} submitLabel="Save run" />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export default async function WeightBalanceWorkflowPage({ params, searchParams }: PageProps) {
  const [{ flightLegId }, queryParams] = await Promise.all([params, searchParams]);
  const detail = await getWeightBalanceWorkflowData(flightLegId);

  if (!detail) {
    notFound();
  }

  const addAction = addWeightBalanceRunAction.bind(null, flightLegId);
  const latestRun = detail.weightBalanceRuns[0] ?? null;
  const releaseFuel =
    detail.fuelEvents.find((event) => event.eventType === AircraftFuelEventType.RELEASE_ONBOARD) ??
    null;
  const warnings = workflowWarnings(detail, latestRun);

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
            Weight And Balance
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {detail.flightNumber ?? "Unnumbered FlightLeg"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Manual W&B runs for {detail.departureStation.code} to {detail.arrivalStation.code},
            scheduled {toDateTimeLabel(detail.scheduledDeparture)}.
          </p>
        </header>

        {firstSearchParam(queryParams.error) ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {firstSearchParam(queryParams.error)}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-5">
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Latest status</p>
            <div className="mt-2">
              <StatusBadge status={latestRun?.status ?? null} />
            </div>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Runs</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{detail.weightBalanceRuns.length}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Manifest items</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {detail.manifest?.items.length ?? 0}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Release fuel</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">
              {releaseFuel
                ? formatFuelAmount(releaseFuel.fuelOnboardLbs, releaseFuel.fuelOnboardGallons)
                : "Not recorded"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {releaseFuel ? fuelReadyLabel(releaseFuel.fueledReady) : "Fuel readiness missing"}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Warnings</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{warnings.length}</p>
          </article>
        </section>

        {warnings.length > 0 ? (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Warning-first W&B readiness</p>
            <ul className="mt-2 space-y-1">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Add manual W&B run</h2>
          <p className="mt-1 text-sm text-zinc-600">
            This records manual evidence only. Calculated runs can be approved, while automated
            calculations, signatures, and release gating remain deferred.
          </p>
          <div className="mt-4">
            <WeightBalanceRunForm action={addAction} submitLabel="Add W&B run" />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Weight-and-balance runs</h2>
          <div className="mt-4">
            <WeightBalanceRuns flightLegId={flightLegId} runs={detail.weightBalanceRuns} />
          </div>
        </section>
      </div>
    </main>
  );
}
