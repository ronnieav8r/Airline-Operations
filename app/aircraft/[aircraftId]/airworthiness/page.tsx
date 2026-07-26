import {
  AirworthinessReleaseStatus,
  DeferralMethod,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceEventStatus,
  MaintenanceEventType,
} from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createAirworthinessReleaseAction,
  createDeferralAction,
  createDiscrepancyAction,
  createMaintenanceEventAction,
  signReturnToServiceAction,
  updateAirworthinessReleaseAction,
  updateDeferralAction,
  updateDiscrepancyAction,
  updateMaintenanceEventAction,
  voidDiscrepancyAction,
} from "@/app/aircraft/[aircraftId]/airworthiness/actions";
import {
  editableAirworthinessReleaseStatuses,
  editableDeferralMethods,
  editableDeferralStatuses,
  editableMaintenanceEventStatuses,
  editableMaintenanceEventTypes,
  getAircraftAirworthinessWorkflowData,
  AircraftAirworthinessWorkflowData,
} from "@/lib/airworthiness-workflow-queries";
import { evaluateAircraftServiceability } from "@/lib/aircraft-serviceability";

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
type MaintenanceEvent = AircraftAirworthinessWorkflowData["maintenanceEvents"][number];
type AirworthinessRelease = AircraftAirworthinessWorkflowData["airworthinessReleases"][number];
type ReturnToServiceRecord = AircraftAirworthinessWorkflowData["returnToServiceRecords"][number];

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
  if (status === DiscrepancyStatus.OPEN) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (
    status === DiscrepancyStatus.DEFERRED ||
    status === DiscrepancyStatus.CORRECTED_PENDING_RTS
  ) {
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

function MaintenanceStatusBadge({ status }: { status: MaintenanceEventStatus | null }) {
  const classes =
    status === MaintenanceEventStatus.COMPLETED
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === MaintenanceEventStatus.IN_PROGRESS
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : status === MaintenanceEventStatus.PLANNED
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-zinc-200 bg-zinc-50 text-zinc-500";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}>
      {status ?? "Missing"}
    </span>
  );
}

function AirworthinessReleaseStatusBadge({
  status,
}: {
  status: AirworthinessReleaseStatus | null;
}) {
  const classes =
    status === AirworthinessReleaseStatus.RELEASED
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === AirworthinessReleaseStatus.DRAFT
        ? "border-amber-200 bg-amber-50 text-amber-800"
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

function DeferralMethodSelect({ defaultValue }: { defaultValue?: DeferralMethod | null }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Method</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? DeferralMethod.MEL}
        name="deferralMethod"
      >
        {editableDeferralMethods.map((method) => (
          <option key={method} value={method}>
            {method}
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

function OptionalDiscrepancySelect({
  defaultValue,
  discrepancies,
}: {
  defaultValue?: string | null;
  discrepancies: Discrepancy[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Linked discrepancy</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? ""}
        name="discrepancyId"
      >
        <option value="">No linked discrepancy</option>
        {discrepancies.map((discrepancy) => (
          <option key={discrepancy.id} value={discrepancy.id}>
            {discrepancy.discrepancyNumber} | {discrepancy.title}
          </option>
        ))}
      </select>
    </label>
  );
}

function MaintenanceEventTypeSelect({ defaultValue }: { defaultValue?: MaintenanceEventType }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Event type</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? MaintenanceEventType.UNSCHEDULED_MAINTENANCE}
        name="eventType"
      >
        {editableMaintenanceEventTypes.map((eventType) => (
          <option key={eventType} value={eventType}>
            {eventType}
          </option>
        ))}
      </select>
    </label>
  );
}

function MaintenanceEventStatusSelect({
  defaultValue,
}: {
  defaultValue?: MaintenanceEventStatus;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Status</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? MaintenanceEventStatus.PLANNED}
        name="status"
      >
        {editableMaintenanceEventStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </label>
  );
}

function AirworthinessReleaseStatusSelect({
  defaultValue,
}: {
  defaultValue?: AirworthinessReleaseStatus;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Status</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? AirworthinessReleaseStatus.DRAFT}
        name="status"
      >
        {editableAirworthinessReleaseStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
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
        <DeferralMethodSelect defaultValue={deferral?.deferralMethod} />
        <Field defaultValue={deferral?.melItemNumber ?? ""} label="MEL/CDL/NEF item" name="melItemNumber" />
        <Field defaultValue={deferral?.repairInterval ?? ""} label="Repair interval" name="repairInterval" />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field defaultValue={deferral?.category ?? ""} label="Category" name="category" />
        <Field defaultValue={deferral?.authorityType ?? ""} label="Authority" name="authorityType" />
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
        <TextArea defaultValue={deferral?.operatingLimitations} label="Operating limitations" name="operatingLimitations" />
        <TextArea defaultValue={deferral?.requiredProcedures} label="Required procedures" name="requiredProcedures" />
        <label className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700">
          <input defaultChecked={deferral?.placardRequired ?? false} name="placardRequired" type="checkbox" />
          Placard required
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

function MaintenanceEventForm({
  action,
  discrepancies,
  event,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  discrepancies: Discrepancy[];
  event?: MaintenanceEvent;
  submitLabel: string;
}) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field
          defaultValue={event?.maintenanceNumber ?? ""}
          label="Maintenance number"
          name="maintenanceNumber"
        />
        <MaintenanceEventTypeSelect defaultValue={event?.eventType} />
        <MaintenanceEventStatusSelect defaultValue={event?.status} />
        <OptionalDiscrepancySelect
          defaultValue={event?.discrepancyId}
          discrepancies={discrepancies}
        />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field
          defaultValue={toInputDateTime(event?.scheduledAt)}
          label="Scheduled at"
          name="scheduledAt"
          type="datetime-local"
        />
        <Field
          defaultValue={toInputDateTime(event?.startedAt)}
          label="Started at"
          name="startedAt"
          type="datetime-local"
        />
        <Field
          defaultValue={toInputDateTime(event?.completedAt)}
          label="Completed at"
          name="completedAt"
          type="datetime-local"
        />
        <Field
          defaultValue={toInputDateTime(event?.returnToServiceAt)}
          label="Return to service at"
          name="returnToServiceAt"
          type="datetime-local"
        />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Field defaultValue={event?.providerName ?? ""} label="Provider" name="providerName" />
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Completed linked maintenance moves the discrepancy to RTS required. It does not clear the discrepancy.
        </p>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <TextArea defaultValue={event?.description} label="Description" name="description" />
        <TextArea defaultValue={event?.notes} label="Notes" name="notes" />
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

function AirworthinessReleaseForm({
  action,
  release,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  release?: AirworthinessRelease;
  submitLabel: string;
}) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field
          defaultValue={release?.releaseNumber ?? ""}
          label="Release number"
          name="releaseNumber"
        />
        <AirworthinessReleaseStatusSelect defaultValue={release?.status} />
        <Field
          defaultValue={toInputDateTime(release?.releasedAt)}
          label="Released at"
          name="releasedAt"
          type="datetime-local"
        />
        <Field
          defaultValue={toInputDateTime(release?.expiresAt)}
          label="Expires at"
          name="expiresAt"
          type="datetime-local"
        />
      </div>
      <div className="mt-3">
        <TextArea
          defaultValue={release?.releaseNotes}
          label="Release notes"
          name="releaseNotes"
        />
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Marking this record RELEASED will supersede prior current RELEASED
        records for this aircraft. FlightRelease is not changed.
      </p>
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

function ReturnToServiceForm({
  action,
  discrepancy,
  maintenanceEvents,
}: {
  action: (formData: FormData) => Promise<void>;
  discrepancy: Discrepancy;
  maintenanceEvents: MaintenanceEvent[];
}) {
  const linkedEvents = maintenanceEvents.filter((event) => event.discrepancyId === discrepancy.id);
  const latestEvent = linkedEvents[0] ?? null;

  return (
    <form action={action} className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
      <input name="discrepancyId" type="hidden" value={discrepancy.id} />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Maintenance event</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={latestEvent?.id ?? ""}
            name="maintenanceEventId"
          >
            <option value="">No linked event</option>
            {linkedEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.maintenanceNumber} | {event.status}
              </option>
            ))}
          </select>
        </label>
        <Field label="Return to service at" name="returnToServiceAt" type="datetime-local" />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <TextArea defaultValue={discrepancy.correctiveSummary} label="Work summary" name="workSummary" />
        <TextArea label="Approval basis" name="approvalBasis" />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Signer name" name="signerName" required />
        <Field label="Certificate number" name="certificateNumber" />
        <Field label="Certificate type" name="certificateType" />
        <Field label="Authorization basis" name="authorizationBasis" />
      </div>
      <div className="mt-3">
        <TextArea
          defaultValue="I certify this aircraft or item has been approved for return to service."
          label="Signature intent"
          name="intentText"
        />
      </div>
      <div className="mt-3">
        <button
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          type="submit"
        >
          Sign RTS and clear write-up
        </button>
      </div>
    </form>
  );
}

function VoidDiscrepancyForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <TextArea label="Void reason" name="voidReason" />
      <div className="mt-3">
        <button
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-100"
          type="submit"
        >
          Void erroneous write-up
        </button>
      </div>
    </form>
  );
}

function ReturnToServiceList({ records }: { records: ReturnToServiceRecord[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-zinc-600">No return-to-service records signed yet.</p>;
  }

  return (
    <div className="space-y-2">
      {records.map((record) => (
        <article className="rounded-md border border-zinc-200 bg-white p-3 text-sm" key={record.id}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-zinc-950">{record.rtsNumber}</p>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              {record.status}
            </span>
          </div>
          <p className="mt-1 text-zinc-700">{record.workSummary ?? "No work summary recorded."}</p>
          <p className="mt-1 text-xs text-zinc-500">
            RTS {toDateTimeLabel(record.returnToServiceAt)} | Signed {toDateTimeLabel(record.signedAt)} |{" "}
            {record.authorityProfile?.legalName ?? record.signer?.email ?? "Unknown signer"}
          </p>
        </article>
      ))}
    </div>
  );
}

function ContextCards({ aircraft }: { aircraft: AircraftAirworthinessWorkflowData }) {
  const configuration = aircraft.configurations[0] ?? null;
  const serviceability = evaluateAircraftServiceability(aircraft);
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
        <p className="text-sm font-semibold text-zinc-900">Serviceability</p>
        <p className="mt-2 text-sm text-zinc-700">{serviceability.label}</p>
        <p className="mt-1 text-xs text-zinc-500">{serviceability.message}</p>
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
                <span className="text-zinc-600">{deferral.deferralMethod ?? "No method"}</span>
                {deferral.melItemNumber ? (
                  <span className="text-zinc-600">{deferral.melItemNumber}</span>
                ) : null}
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
          {deferral.operatingLimitations || deferral.requiredProcedures ? (
            <div className="mt-2 grid gap-2 lg:grid-cols-2">
              {deferral.operatingLimitations ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-950">
                  {deferral.operatingLimitations}
                </p>
              ) : null}
              {deferral.requiredProcedures ? (
                <p className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm text-zinc-700">
                  {deferral.requiredProcedures}
                </p>
              ) : null}
            </div>
          ) : null}
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
  maintenanceEvents,
}: {
  aircraftId: string;
  discrepancies: Discrepancy[];
  maintenanceEvents: MaintenanceEvent[];
}) {
  if (discrepancies.length === 0) {
    return <p className="text-sm text-zinc-600">No discrepancies recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {discrepancies.map((discrepancy) => {
        const updateAction = updateDiscrepancyAction.bind(null, aircraftId, discrepancy.id);
        const voidAction = voidDiscrepancyAction.bind(null, aircraftId, discrepancy.id);
        const rtsAction = signReturnToServiceAction.bind(null, aircraftId);

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
                {discrepancy.voidReason ? (
                  <p className="mt-1 text-xs text-zinc-500">Void reason: {discrepancy.voidReason}</p>
                ) : null}
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
            {discrepancy.status === DiscrepancyStatus.CORRECTED_PENDING_RTS ? (
              <div className="mt-3">
                <ReturnToServiceForm
                  action={rtsAction}
                  discrepancy={discrepancy}
                  maintenanceEvents={maintenanceEvents}
                />
              </div>
            ) : null}
            {discrepancy.status !== DiscrepancyStatus.CLEARED &&
            discrepancy.status !== DiscrepancyStatus.CANCELLED ? (
              <div className="mt-3">
                <VoidDiscrepancyForm action={voidAction} />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function MaintenanceEventList({
  aircraftId,
  discrepancies,
  events,
}: {
  aircraftId: string;
  discrepancies: Discrepancy[];
  events: MaintenanceEvent[];
}) {
  if (events.length === 0) {
    return <p className="text-sm text-zinc-600">No maintenance events recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <article className="rounded-md border border-zinc-200 bg-white p-3" key={event.id}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-zinc-950">{event.maintenanceNumber}</p>
                <MaintenanceStatusBadge status={event.status} />
                <span className="text-sm text-zinc-600">{event.eventType}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-600">
                Provider {event.providerName ?? "not set"} | Linked discrepancy{" "}
                {event.discrepancy?.discrepancyNumber ?? "none"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Scheduled {toDateTimeLabel(event.scheduledAt)} | Started{" "}
                {toDateTimeLabel(event.startedAt)} | Completed{" "}
                {toDateTimeLabel(event.completedAt)} | RTS{" "}
                {toDateTimeLabel(event.returnToServiceAt)}
              </p>
            </div>
          </div>
          {event.description ? (
            <p className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm text-zinc-700">
              {event.description}
            </p>
          ) : null}
          <div className="mt-3">
            <MaintenanceEventForm
              action={updateMaintenanceEventAction.bind(null, aircraftId, event.id)}
              discrepancies={discrepancies}
              event={event}
              submitLabel="Save maintenance event"
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function AirworthinessReleaseList({
  aircraftId,
  releases,
}: {
  aircraftId: string;
  releases: AirworthinessRelease[];
}) {
  if (releases.length === 0) {
    return <p className="text-sm text-zinc-600">No airworthiness releases recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {releases.map((release) => (
        <article className="rounded-md border border-zinc-200 bg-white p-3" key={release.id}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-zinc-950">{release.releaseNumber}</p>
                <AirworthinessReleaseStatusBadge status={release.status} />
                {release.flightLegId ? (
                  <span className="text-xs text-zinc-500">FlightLeg snapshot</span>
                ) : (
                  <span className="text-xs text-zinc-500">Aircraft-current scope</span>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Released {toDateTimeLabel(release.releasedAt)} | Expires{" "}
                {toDateTimeLabel(release.expiresAt)} | Updated{" "}
                {toDateTimeLabel(release.updatedAt)}
              </p>
            </div>
          </div>
          {release.releaseNotes ? (
            <p className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm text-zinc-700">
              {release.releaseNotes}
            </p>
          ) : null}
          <div className="mt-3">
            <AirworthinessReleaseForm
              action={updateAirworthinessReleaseAction.bind(null, aircraftId, release.id)}
              release={release}
              submitLabel="Save airworthiness release"
            />
          </div>
        </article>
      ))}
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
  const serviceability = evaluateAircraftServiceability(aircraft);
  const activeDiscrepancies = aircraft.discrepancies.filter(
    (discrepancy) =>
      discrepancy.status === DiscrepancyStatus.OPEN ||
      discrepancy.status === DiscrepancyStatus.DEFERRED,
  );
  const deferrableDiscrepancies = aircraft.discrepancies.filter(
    (discrepancy) =>
      discrepancy.status === DiscrepancyStatus.OPEN ||
      discrepancy.status === DiscrepancyStatus.DEFERRED,
  );
  const rtsRequiredDiscrepancies = aircraft.discrepancies.filter(
    (discrepancy) => discrepancy.status === DiscrepancyStatus.CORRECTED_PENDING_RTS,
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
            <Link
              className="text-sm font-medium text-zinc-700 hover:text-zinc-950"
              href={`/aircraft/${aircraft.id}/logbook`}
            >
              Logbook
            </Link>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Aircraft Airworthiness
          </p>
          <h1 className="mt-1.5 font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
            {aircraft.tailNumber}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Aircraft-level discrepancy, deferral, maintenance event, and
            return-to-service workflow. Historical aircraft release records are
            separate from the computed serviceability state.
          </p>
        </header>

        {firstSearchParam(queryParams.error) ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {firstSearchParam(queryParams.error)}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-4">
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Serviceability</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{serviceability.label}</p>
          </article>
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
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Maintenance events</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {aircraft.maintenanceEvents.length}
            </p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">RTS required</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {rtsRequiredDiscrepancies.length}
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
            <DiscrepancyList
              aircraftId={aircraft.id}
              discrepancies={aircraft.discrepancies}
              maintenanceEvents={aircraft.maintenanceEvents}
            />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create deferral</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Create deferrals from existing OPEN or DEFERRED discrepancies. Hard
            release blocking remains deferred.
          </p>
          <div className="mt-4">
            {deferrableDiscrepancies.length === 0 ? (
              <p className="text-sm text-zinc-600">
                No OPEN or DEFERRED discrepancies are available for deferral.
              </p>
            ) : (
              <DeferralForm
                action={createDeferralAction.bind(null, aircraft.id)}
                discrepancies={deferrableDiscrepancies}
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

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create maintenance event</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Maintenance events may link to a discrepancy. Airworthiness release
            signing and deferral clearing remain deferred.
          </p>
          <div className="mt-4">
            <MaintenanceEventForm
              action={createMaintenanceEventAction.bind(null, aircraft.id)}
              discrepancies={aircraft.discrepancies}
              submitLabel="Create maintenance event"
            />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Maintenance events</h2>
          <div className="mt-4">
            <MaintenanceEventList
              aircraftId={aircraft.id}
              discrepancies={aircraft.discrepancies}
              events={aircraft.maintenanceEvents}
            />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Return to service records</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Signed RTS records clear corrected write-ups and provide the linked logbook evidence.
          </p>
          <div className="mt-4">
            <ReturnToServiceList records={aircraft.returnToServiceRecords} />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create airworthiness release</h2>
          <p className="mt-1 text-sm text-zinc-600">
            This creates aircraft maintenance airworthiness release state only.
            Leave release number blank to auto-generate one. FlightRelease is
            not changed.
          </p>
          <div className="mt-4">
            <AirworthinessReleaseForm
              action={createAirworthinessReleaseAction.bind(null, aircraft.id)}
              submitLabel="Create airworthiness release"
            />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Airworthiness releases</h2>
          <p className="mt-1 text-sm text-zinc-600">
            RELEASED records represent the current aircraft release. Older
            current RELEASED records are automatically marked SUPERSEDED when a
            newer release becomes current.
          </p>
          <div className="mt-4">
            <AirworthinessReleaseList
              aircraftId={aircraft.id}
              releases={aircraft.airworthinessReleases}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
