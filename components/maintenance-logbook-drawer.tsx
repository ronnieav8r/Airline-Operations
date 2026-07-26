import {
  AircraftLogbookEntryStatus,
  AircraftLogbookEntryType,
  AircraftLogbookSignaturePurpose,
  UserRole,
} from "@prisma/client";
import { ArrowLeft, FileText, LockKeyhole, Wrench } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  createCorrectiveActionDraftAction,
  signAircraftLogbookEntryAction,
  uploadAircraftLogbookAttachmentAction,
} from "@/app/aircraft/[aircraftId]/logbook/actions";
import { evaluateAircraftServiceability } from "@/lib/aircraft-serviceability";
import {
  LOGBOOK_DRAWER_LIMIT_STEP,
  MAX_LOGBOOK_DRAWER_LIMIT,
  type MaintenanceLogbookDrawerEntry,
  type getMaintenanceLogbookDrawerData,
} from "@/lib/maintenance-logbook-drawer";
import type { MaintenanceAircraftOption } from "@/lib/maintenance-workbench-queries";

type DrawerData = NonNullable<Awaited<ReturnType<typeof getMaintenanceLogbookDrawerData>>>;

export type MaintenanceLogbookDrawerUrlState = {
  aircraftId: string;
  baseParams: Array<[string, string]>;
  cursorEntryId: string | null;
  entryId: string | null;
  entryType: AircraftLogbookEntryType | null;
  from: string;
  limit: number;
  search: string;
  status: AircraftLogbookEntryStatus | null;
  to: string;
};

function formatEnum(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function aircraftTypeLabel(value: string): string {
  return value.replaceAll("_", "-");
}

function statusClasses(status: AircraftLogbookEntryStatus): string {
  if (status === AircraftLogbookEntryStatus.SIGNED || status === AircraftLogbookEntryStatus.RELEASED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === AircraftLogbookEntryStatus.VOIDED || status === AircraftLogbookEntryStatus.SUPERSEDED) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (
    status === AircraftLogbookEntryStatus.OPEN ||
    status === AircraftLogbookEntryStatus.DEFERRED ||
    status === AircraftLogbookEntryStatus.READY_FOR_SIGNATURE
  ) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function fieldClassName() {
  return "min-h-9 min-w-0 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-950 outline-none focus:border-zinc-500";
}

function textareaClassName() {
  return "min-h-20 rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-500";
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-semibold text-zinc-600">
      {label}
      {children}
    </label>
  );
}

function drawerHref(
  state: MaintenanceLogbookDrawerUrlState,
  overrides: Partial<{
    aircraftId: string | null;
    cursorEntryId: string | null;
    entryId: string | null;
    entryType: AircraftLogbookEntryType | null;
    from: string | null;
    limit: number | null;
    search: string | null;
    status: AircraftLogbookEntryStatus | null;
    to: string | null;
  }> = {},
): string {
  const params = new URLSearchParams(state.baseParams);
  const aircraftId = overrides.aircraftId === undefined ? state.aircraftId : overrides.aircraftId;
  const cursorEntryId =
    overrides.cursorEntryId === undefined ? state.cursorEntryId : overrides.cursorEntryId;
  const entryId = overrides.entryId === undefined ? state.entryId : overrides.entryId;
  const entryType = overrides.entryType === undefined ? state.entryType : overrides.entryType;
  const from = overrides.from === undefined ? state.from : overrides.from;
  const limit = overrides.limit === undefined ? state.limit : overrides.limit;
  const search = overrides.search === undefined ? state.search : overrides.search;
  const status = overrides.status === undefined ? state.status : overrides.status;
  const to = overrides.to === undefined ? state.to : overrides.to;

  if (aircraftId) params.set("logbookAircraft", aircraftId);
  if (cursorEntryId) params.set("logbookCursor", cursorEntryId);
  if (entryId) params.set("logbookEntry", entryId);
  if (limit) params.set("logbookLimit", String(limit));
  if (search) params.set("logbookDrawerQ", search);
  if (status) params.set("logbookDrawerStatus", status);
  if (entryType) params.set("logbookDrawerType", entryType);
  if (from) params.set("logbookFrom", from);
  if (to) params.set("logbookTo", to);

  return `/maintenance?${params.toString()}`;
}

function HiddenBaseParams({
  params,
}: {
  params: Array<[string, string]>;
}) {
  return params.map(([name, value]) => (
    <input key={`${name}-${value}`} name={name} type="hidden" value={value} />
  ));
}

function relatedLabel(entry: MaintenanceLogbookDrawerEntry): string {
  if (entry.discrepancy) {
    return `${entry.discrepancy.discrepancyNumber} | ${entry.discrepancy.title}`;
  }

  if (entry.deferral) {
    return `${entry.deferral.deferralNumber} | ${formatEnum(entry.deferral.deferralMethod ?? "DEFERRAL")}`;
  }

  if (entry.maintenanceEvent) {
    return `${entry.maintenanceEvent.maintenanceNumber} | ${formatEnum(entry.maintenanceEvent.eventType)}`;
  }

  if (entry.maintenanceProgramTask) {
    return `${entry.maintenanceProgramTask.taskKey} | ${entry.maintenanceProgramTask.title}`;
  }

  if (entry.airworthinessRelease) {
    return `${entry.airworthinessRelease.releaseNumber} | ${formatEnum(entry.airworthinessRelease.status)}`;
  }

  return "No linked maintenance record";
}

function TimelineRow({
  entry,
  href,
  selected,
}: {
  entry: MaintenanceLogbookDrawerEntry;
  href: string;
  selected: boolean;
}) {
  return (
    <Link
      className={`grid gap-1 border-b border-zinc-100 px-3 py-3 transition hover:bg-zinc-50 ${
        selected ? "bg-zinc-100 ring-1 ring-inset ring-zinc-300" : ""
      }`}
      href={href}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-zinc-500">
            {entry.entryNumber} | {formatEnum(entry.entryType)}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-zinc-950">{entry.title}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold ${statusClasses(entry.status)}`}>
          {formatEnum(entry.status)}
        </span>
      </div>
      <p className="truncate text-xs text-zinc-500">{relatedLabel(entry)}</p>
      <p className="text-[0.7rem] font-medium text-zinc-500">{formatDateTime(entry.reportedAt)}</p>
    </Link>
  );
}

function CorrectiveActionForm({
  data,
  returnTo,
}: {
  data: DrawerData;
  returnTo: string;
}) {
  if (data.eligibleDiscrepancies.length === 0) {
    return (
      <p className="mt-2 text-xs text-zinc-600">
        No open or deferred write-up is eligible for a corrective-action draft on this tail.
      </p>
    );
  }

  return (
    <form
      action={createCorrectiveActionDraftAction.bind(null, data.aircraft.id)}
      className="mt-3 grid gap-3"
    >
      <input name="returnTo" type="hidden" value={returnTo} />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Linked write-up">
          <select className={fieldClassName()} name="discrepancyId" required>
            <option value="">Select write-up</option>
            {data.eligibleDiscrepancies.map((item) => (
              <option key={item.id} value={item.id}>
                {item.discrepancyNumber} - {item.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input className={fieldClassName()} name="title" required />
        </Field>
        <Field label="Provider">
          <input className={fieldClassName()} name="providerName" />
        </Field>
        <Field label="Performed by">
          <input className={fieldClassName()} name="performedByName" />
        </Field>
        <Field label="Category">
          <input className={fieldClassName()} name="category" />
        </Field>
        <Field label="Manual reference">
          <input className={fieldClassName()} name="manualReference" />
        </Field>
        <Field label="Task reference">
          <input className={fieldClassName()} name="taskReference" />
        </Field>
        <label className="flex items-end gap-2 pb-2 text-xs font-semibold text-zinc-700">
          <input className="h-4 w-4" name="requiresIndependentInspection" type="checkbox" />
          Independent inspection required
        </label>
      </div>
      <Field label="Work performed">
        <textarea className={textareaClassName()} name="narrative" required />
      </Field>
      <button className="min-h-9 w-fit rounded-md bg-zinc-950 px-3 text-xs font-semibold text-white hover:bg-zinc-800" type="submit">
        Create corrective-action draft
      </button>
    </form>
  );
}

function EntryActions({
  canSign,
  canUpload,
  entry,
  returnTo,
}: {
  canSign: boolean;
  canUpload: boolean;
  entry: MaintenanceLogbookDrawerEntry;
  returnTo: string;
}) {
  const maintenanceSigned = entry.signatures.some(
    (signature) =>
      signature.purpose === AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL,
  );
  const inspectionSigned = entry.signatures.some(
    (signature) =>
      signature.purpose === AircraftLogbookSignaturePurpose.INSPECTION_APPROVAL,
  );
  const inspectionPending =
    entry.requiresIndependentInspection && maintenanceSigned && !inspectionSigned;
  const canAddSignature =
    canSign &&
    ((!entry.lockedAt && !maintenanceSigned) || inspectionPending);

  return (
    <div className="grid gap-3">
      {canUpload && !entry.lockedAt ? (
        <form
          action={uploadAircraftLogbookAttachmentAction.bind(
            null,
            entry.aircraftId,
            entry.id,
          )}
          className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
        >
          <input name="returnTo" type="hidden" value={returnTo} />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Add attachment
          </p>
          <input
            accept="image/*,application/pdf,text/plain"
            className="min-h-9 min-w-0 max-w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
            name="attachment"
            type="file"
          />
          <button className="min-h-9 w-fit rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100" type="submit">
            Upload attachment
          </button>
        </form>
      ) : null}
      {canAddSignature ? (
        <form
          action={signAircraftLogbookEntryAction.bind(
            null,
            entry.aircraftId,
            entry.id,
          )}
          className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
        >
          <input name="returnTo" type="hidden" value={returnTo} />
          <input
            name="purpose"
            type="hidden"
            value={
              inspectionPending
                ? AircraftLogbookSignaturePurpose.INSPECTION_APPROVAL
                : AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL
            }
          />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {inspectionPending
              ? "Independent inspection approval"
              : "Maintenance approval"}
          </p>
          <input
            className={fieldClassName()}
            name="signerName"
            placeholder="Legal signer name"
            required
          />
          <textarea
            className={textareaClassName()}
            defaultValue="I certify this logbook entry is accurate for the work or approval described."
            name="intentText"
            required
          />
          <button className="min-h-9 w-fit rounded-md bg-zinc-950 px-3 text-xs font-semibold text-white hover:bg-zinc-800" type="submit">
            {inspectionPending
              ? "Sign inspection approval"
              : "Sign maintenance approval"}
          </button>
        </form>
      ) : entry.lockedAt ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
          <LockKeyhole className="h-3.5 w-3.5" />
          Locked {formatDateTime(entry.lockedAt)}
        </p>
      ) : null}
    </div>
  );
}

function EntryDetail({
  canSign,
  canUpload,
  entry,
  returnTo,
}: {
  canSign: boolean;
  canUpload: boolean;
  entry: MaintenanceLogbookDrawerEntry;
  returnTo: string;
}) {
  return (
    <article className="grid gap-4 p-4">
      <div className="flex flex-wrap gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(entry.status)}`}>
          {formatEnum(entry.status)}
        </span>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700">
          {formatEnum(entry.entryType)}
        </span>
        {entry.lockedAt ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            Locked
          </span>
        ) : null}
      </div>
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {entry.entryNumber} | {formatDateTime(entry.reportedAt)}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-zinc-950">{entry.title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
          {entry.narrative ?? "No narrative recorded."}
        </p>
      </section>
      <dl className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm sm:grid-cols-2">
        {[
          ["Source", formatEnum(entry.source)],
          ["Category", entry.category ?? "Not recorded"],
          ["Performed by", entry.performedByName ?? "Not recorded"],
          ["Manual / task", [entry.manualReference, entry.taskReference].filter(Boolean).join(" | ") || "Not recorded"],
          ["Related", relatedLabel(entry)],
          ["RTS", formatDateTime(entry.returnToServiceAt)],
        ].map(([label, value]) => (
          <div className="min-w-0" key={label}>
            <dt className="text-xs font-semibold text-zinc-500">{label}</dt>
            <dd className="mt-0.5 break-words text-zinc-900">{value}</dd>
          </div>
        ))}
      </dl>
      {entry.operatingLimitations || entry.requiredProcedures || entry.placardRequired ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
            Limitations / procedures
          </p>
          {entry.placardRequired ? <p className="mt-2 font-semibold">Placard required</p> : null}
          {entry.operatingLimitations ? <p className="mt-2">{entry.operatingLimitations}</p> : null}
          {entry.requiredProcedures ? <p className="mt-2">{entry.requiredProcedures}</p> : null}
        </section>
      ) : null}
      {entry.maintenanceProgramTask || entry.maintenanceComplianceState ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Scheduled maintenance context
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-950">
            {entry.maintenanceProgramTask?.title ?? "Compliance state"}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {entry.maintenanceProgramTask?.sourceReference ??
              entry.maintenanceProgramTask?.taskKey ??
              "No source reference"}
            {entry.maintenanceComplianceState
              ? ` | ${formatEnum(entry.maintenanceComplianceState.status)}`
              : ""}
            {entry.maintenanceComplianceState?.nextDueAt
              ? ` | Next ${formatDateTime(entry.maintenanceComplianceState.nextDueAt)}`
              : ""}
          </p>
        </section>
      ) : null}
      {entry.returnToServiceRecords.length > 0 ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Return to service evidence
          </p>
          <div className="mt-2 grid gap-2">
            {entry.returnToServiceRecords.map((record) => (
              <p className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700" key={record.id}>
                <span className="font-semibold text-zinc-950">{record.rtsNumber}</span>
                {" | "}
                {formatEnum(record.status)}
                {record.signedAt ? ` | signed ${formatDateTime(record.signedAt)}` : ""}
              </p>
            ))}
          </div>
        </section>
      ) : null}
      <section className="rounded-lg border border-zinc-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Attachments
        </p>
        {entry.attachments.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No attachments.</p>
        ) : (
          <div className="mt-2 grid gap-2">
            {entry.attachments.map((attachment) => (
              <a
                className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                href={`/aircraft/${entry.aircraftId}/logbook/attachments/${attachment.id}`}
                key={attachment.id}
                target="_blank"
              >
                <span className="truncate">{attachment.originalFilename ?? "Attachment"}</span>
                <span className="shrink-0 text-zinc-500">
                  {Math.max(1, Math.round(attachment.byteSize / 1024))} KB
                </span>
              </a>
            ))}
          </div>
        )}
      </section>
      <section className="rounded-lg border border-zinc-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Signatures and hash
        </p>
        {entry.signatures.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No signatures.</p>
        ) : (
          <div className="mt-2 grid gap-2">
            {entry.signatures.map((signature) => (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900" key={signature.id}>
                <span className="font-semibold">{signature.signerName}</span>
                {signature.certificateNumber ? ` #${signature.certificateNumber}` : ""}
                {" | "}
                {formatEnum(signature.purpose)} | {formatDateTime(signature.signedAt)}
              </p>
            ))}
          </div>
        )}
        <p className="mt-2 break-all text-xs font-semibold text-zinc-500">
          Hash: {entry.signedContentHash ?? "No signed-content hash"}
        </p>
      </section>
      <section className="rounded-lg border border-zinc-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Recent audit
        </p>
        {entry.auditEvents.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No audit events.</p>
        ) : (
          <div className="mt-2 grid gap-2">
            {entry.auditEvents.map((event) => (
              <p className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700" key={event.id}>
                <span className="font-semibold text-zinc-950">{formatEnum(event.eventType)}</span>
                {" | "}
                {formatDateTime(event.createdAt)} | {event.message}
              </p>
            ))}
          </div>
        )}
      </section>
      <EntryActions
        canSign={canSign}
        canUpload={canUpload}
        entry={entry}
        returnTo={returnTo}
      />
    </article>
  );
}

export function MaintenanceLogbookDrawer({
  aircraftOptions,
  closeHref,
  data,
  role,
  urlState,
}: {
  aircraftOptions: MaintenanceAircraftOption[];
  closeHref: string;
  data: DrawerData;
  role: UserRole;
  urlState: MaintenanceLogbookDrawerUrlState;
}) {
  const serviceability = evaluateAircraftServiceability(data.aircraft);
  const selectedEntry = data.selectedEntry;
  const currentHref = drawerHref(urlState);
  const clearSelectionHref = drawerHref(urlState, { entryId: null });
  const loadOlderLimit = Math.min(
    data.limit + LOGBOOK_DRAWER_LIMIT_STEP,
    MAX_LOGBOOK_DRAWER_LIMIT,
  );
  const canLoadOlder = data.hasMore && data.limit < MAX_LOGBOOK_DRAWER_LIMIT;

  return (
    <aside
      aria-label={`${data.aircraft.tailNumber} aircraft logbook`}
      className="fixed inset-y-0 right-0 z-30 flex w-full flex-col border-l border-zinc-200 bg-white shadow-2xl md:w-[80vw] md:max-w-6xl"
    >
      <header className="grid gap-3 border-b border-zinc-200 p-3 sm:p-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Aircraft logbook
            </p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-zinc-950">
                {data.aircraft.tailNumber}
              </h2>
              <span className="text-sm text-zinc-500">
                {aircraftTypeLabel(data.aircraft.type)}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                serviceability.ready
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}>
                {serviceability.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {data.aircraft.homeStation?.code ?? "No base"} | {serviceability.message}
            </p>
          </div>
          <Link
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            href={closeHref}
          >
            Close
          </Link>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <form action="/maintenance" className="flex flex-wrap items-end gap-2" method="get">
            <HiddenBaseParams params={urlState.baseParams} />
            {urlState.search ? <input name="logbookDrawerQ" type="hidden" value={urlState.search} /> : null}
            {urlState.status ? <input name="logbookDrawerStatus" type="hidden" value={urlState.status} /> : null}
            {urlState.entryType ? <input name="logbookDrawerType" type="hidden" value={urlState.entryType} /> : null}
            {urlState.from ? <input name="logbookFrom" type="hidden" value={urlState.from} /> : null}
            {urlState.to ? <input name="logbookTo" type="hidden" value={urlState.to} /> : null}
            <input name="logbookLimit" type="hidden" value={urlState.limit} />
            <Field label="Switch aircraft logbook">
              <select className={fieldClassName()} defaultValue={data.aircraft.id} name="logbookAircraft">
                {aircraftOptions.map((aircraft) => (
                  <option key={aircraft.id} value={aircraft.id}>
                    {aircraft.tailNumber} - {aircraftTypeLabel(aircraft.type)}
                  </option>
                ))}
              </select>
            </Field>
            <button className="min-h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100" type="submit">
              Switch
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Link className="text-xs font-semibold text-zinc-600 hover:text-zinc-950" href={`/aircraft?panel=aircraft&selected=${data.aircraft.id}`}>
              View aircraft details
            </Link>
            <Link className="text-xs font-semibold text-zinc-600 hover:text-zinc-950" href={`/aircraft/${data.aircraft.id}/airworthiness`}>
              View airworthiness
            </Link>
            <a className="text-xs font-semibold text-zinc-600 hover:text-zinc-950" href={`/aircraft/${data.aircraft.id}/logbook/export`} target="_blank">
              Export logbook package
            </a>
          </div>
        </div>
        {role === UserRole.MAINTENANCE ? (
          <details className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-zinc-800 [&::-webkit-details-marker]:hidden">
              <Wrench className="h-4 w-4 text-zinc-500" />
              Create corrective-action draft
            </summary>
            <CorrectiveActionForm data={data} returnTo={currentHref} />
          </details>
        ) : null}
      </header>

      <form
        action="/maintenance"
        className="grid gap-2 border-b border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(10rem,1fr)_10rem_12rem_9rem_9rem_auto]"
        method="get"
      >
        <HiddenBaseParams params={urlState.baseParams} />
        <input name="logbookAircraft" type="hidden" value={data.aircraft.id} />
        <Field label="Search this tail">
          <input className={fieldClassName()} defaultValue={urlState.search} name="logbookDrawerQ" placeholder="Entry, title, reference" />
        </Field>
        <Field label="Entry status">
          <select className={fieldClassName()} defaultValue={urlState.status ?? ""} name="logbookDrawerStatus">
            <option value="">All status</option>
            {Object.values(AircraftLogbookEntryStatus).map((status) => (
              <option key={status} value={status}>{formatEnum(status)}</option>
            ))}
          </select>
        </Field>
        <Field label="Entry type">
          <select className={fieldClassName()} defaultValue={urlState.entryType ?? ""} name="logbookDrawerType">
            <option value="">All entry types</option>
            {Object.values(AircraftLogbookEntryType).map((entryType) => (
              <option key={entryType} value={entryType}>{formatEnum(entryType)}</option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input className={fieldClassName()} defaultValue={urlState.from} name="logbookFrom" type="date" />
        </Field>
        <Field label="Through">
          <input className={fieldClassName()} defaultValue={urlState.to} name="logbookTo" type="date" />
        </Field>
        <button className="min-h-9 self-end rounded-md bg-zinc-950 px-3 text-xs font-semibold text-white hover:bg-zinc-800" type="submit">
          Apply
        </button>
      </form>

      {data.selectedEntryWasInvalid ? (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900">
          The requested entry is not part of this aircraft logbook. Choose an entry from this tail timeline.
        </p>
      ) : null}
      {data.cursorWasInvalid ? (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900">
          The requested history cursor was invalid for this aircraft. Showing the newest matching batch.
        </p>
      ) : null}
      {selectedEntry && !data.selectedEntryInBatch ? (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900">
          Selected entry is outside the current loaded batch or filters; detail remains available without loading unbounded history.
        </p>
      ) : null}

      <div className={`min-h-0 flex-1 ${selectedEntry ? "md:grid md:grid-cols-[minmax(18rem,0.42fr)_minmax(0,1fr)]" : ""}`}>
        <section className={`${selectedEntry ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-zinc-200`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-zinc-900">
                {data.filteredCount} filtered | {data.totalCount} total on {data.aircraft.tailNumber}
              </p>
              <p className="text-[0.7rem] text-zinc-500">
                Newest first | showing {data.visibleFrom}-{data.visibleTo} of {data.filteredCount}
              </p>
            </div>
            <FileText className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {data.totalCount === 0 ? (
              <p className="p-4 text-sm text-zinc-600">
                No logbook entries have been created for this tail.
              </p>
            ) : data.entries.length === 0 ? (
              <p className="p-4 text-sm text-zinc-600">
                No entries match these drawer filters.
              </p>
            ) : (
              data.entries.map((entry) => (
                <TimelineRow
                  entry={entry}
                  href={drawerHref(urlState, { entryId: entry.id })}
                  key={entry.id}
                  selected={selectedEntry?.id === entry.id}
                />
              ))
            )}
          </div>
          {data.hasMore || data.hasNewer ? (
            <div className="border-t border-zinc-200 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {data.hasNewer ? (
                  <Link
                    className="flex min-h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                    href={drawerHref(urlState, { cursorEntryId: null, limit: null })}
                  >
                    Back to newest
                  </Link>
                ) : null}
                {canLoadOlder ? (
                  <Link
                    className="flex min-h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                    href={drawerHref(urlState, { limit: loadOlderLimit })}
                  >
                    Load older
                  </Link>
                ) : data.hasMore && data.nextCursorEntryId ? (
                  <Link
                    className="flex min-h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                    href={drawerHref(urlState, {
                      cursorEntryId: data.nextCursorEntryId,
                      entryId: null,
                    })}
                  >
                    Browse next older batch
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        {selectedEntry ? (
          <section className="min-h-0 overflow-y-auto">
            <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white p-3 md:hidden">
              <Link className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700" href={clearSelectionHref}>
                <ArrowLeft className="h-4 w-4" />
                Back to {data.aircraft.tailNumber} logbook
              </Link>
            </div>
            <EntryDetail
              canSign={role === UserRole.MAINTENANCE}
              canUpload={role === UserRole.MAINTENANCE || role === UserRole.ADMIN}
              entry={selectedEntry}
              returnTo={currentHref}
            />
          </section>
        ) : null}
      </div>
    </aside>
  );
}
