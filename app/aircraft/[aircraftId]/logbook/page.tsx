import {
  AircraftLogbookEntryStatus,
  AircraftLogbookSignaturePurpose,
  AirworthinessReleaseStatus,
  DeferralStatus,
  DiscrepancyStatus,
  UserRole,
} from "@prisma/client";
import { FileText, LockKeyhole, PenLine, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  createCorrectiveActionDraftAction,
  signAircraftLogbookEntryAction,
  uploadAircraftLogbookAttachmentAction,
} from "@/app/aircraft/[aircraftId]/logbook/actions";
import {
  getActiveMaintenanceEntryTemplates,
  getAircraftLogbookWorkspaceData,
} from "@/lib/aircraft-logbook";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    aircraftId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    submitted?: string | string[];
  }>;
};

type AircraftLogbookData = NonNullable<Awaited<ReturnType<typeof getAircraftLogbookWorkspaceData>>>;
type LogbookEntry = AircraftLogbookData["logbookEntries"][number];

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: false,
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function statusTone(status: string): string {
  if (
    status === AircraftLogbookEntryStatus.SIGNED ||
    status === AircraftLogbookEntryStatus.RELEASED ||
    status === DiscrepancyStatus.CLEARED ||
    status === DeferralStatus.CLEARED
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (
    status === AircraftLogbookEntryStatus.OPEN ||
    status === AircraftLogbookEntryStatus.DEFERRED ||
    status === DeferralStatus.ACTIVE ||
    status === DiscrepancyStatus.OPEN ||
    status === DiscrepancyStatus.DEFERRED ||
    status === DiscrepancyStatus.CORRECTED_PENDING_RTS
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === AircraftLogbookEntryStatus.VOIDED || status === DeferralStatus.EXPIRED) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function FieldLabel({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-zinc-700">
      {label}
      {children}
    </label>
  );
}

function inputClassName() {
  return "min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-500";
}

function textareaClassName() {
  return "min-h-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-500";
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  tone?: "good" | "neutral" | "warn";
  value: string | number;
}) {
  const toneClasses =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-zinc-200 bg-white text-zinc-950";

  return (
    <div className={`rounded-lg border p-3 ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function CorrectiveActionForm({ aircraft }: { aircraft: AircraftLogbookData }) {
  return (
    <form
      action={createCorrectiveActionDraftAction.bind(null, aircraft.id)}
      className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4 text-zinc-500" />
        <h2 className="text-base font-semibold text-zinc-950">Corrective action draft</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <FieldLabel label="Linked discrepancy">
          <select className={inputClassName()} name="discrepancyId">
            <option value="">No linked discrepancy</option>
            {aircraft.discrepancies.map((discrepancy) => (
              <option key={discrepancy.id} value={discrepancy.id}>
                {discrepancy.discrepancyNumber} - {discrepancy.title}
              </option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="Provider">
          <input className={inputClassName()} name="providerName" placeholder="Maintenance provider" />
        </FieldLabel>
        <FieldLabel label="Title">
          <input className={inputClassName()} name="title" placeholder="Corrective action summary" required />
        </FieldLabel>
        <FieldLabel label="Category">
          <input className={inputClassName()} name="category" placeholder="REPAIR, INSPECTION, MEL" />
        </FieldLabel>
        <FieldLabel label="Manual reference">
          <input className={inputClassName()} name="manualReference" placeholder="AMM 32-..." />
        </FieldLabel>
        <FieldLabel label="Task reference">
          <input className={inputClassName()} name="taskReference" placeholder="Task card or WO" />
        </FieldLabel>
        <FieldLabel label="Performed by">
          <input className={inputClassName()} name="performedByName" placeholder="Technician or shop" />
        </FieldLabel>
        <FieldLabel label="Return to service">
          <input className={inputClassName()} name="returnToServiceAt" type="datetime-local" />
        </FieldLabel>
      </div>
      <FieldLabel label="Work performed">
        <textarea className={textareaClassName()} name="narrative" required />
      </FieldLabel>
      <div className="flex flex-wrap gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-700">
          <input className="h-4 w-4" name="completed" type="checkbox" />
          Mark work completed
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-700">
          <input className="h-4 w-4" name="clearDiscrepancy" type="checkbox" />
          Mark linked discrepancy corrected pending RTS
        </label>
      </div>
      <button
        className="min-h-10 w-full cursor-pointer rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 md:w-fit"
        type="submit"
      >
        Create draft
      </button>
    </form>
  );
}

function SignEntryForm({ aircraftId, entry }: { aircraftId: string; entry: LogbookEntry }) {
  if (entry.lockedAt || entry.status === AircraftLogbookEntryStatus.SIGNED) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
        <LockKeyhole className="h-3.5 w-3.5" />
        Locked {formatDateTime(entry.lockedAt)}
      </div>
    );
  }

  return (
    <details className="rounded-md border border-zinc-200 bg-zinc-50 p-2">
      <summary className="cursor-pointer text-xs font-semibold text-zinc-700">Sign entry</summary>
      <form action={signAircraftLogbookEntryAction.bind(null, aircraftId, entry.id)} className="mt-2 grid gap-2">
        <input className={inputClassName()} name="signerName" placeholder="Legal signer name" required />
        <input className={inputClassName()} name="certificateNumber" placeholder="Certificate number" />
        <input className={inputClassName()} name="certificateType" placeholder="Certificate type" />
        <input className={inputClassName()} name="authorizationBasis" placeholder="Authorization basis" />
        <select className={inputClassName()} name="purpose" defaultValue={AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL}>
          {Object.values(AircraftLogbookSignaturePurpose).map((purpose) => (
            <option key={purpose} value={purpose}>
              {formatStatus(purpose)}
            </option>
          ))}
        </select>
        <textarea
          className={textareaClassName()}
          defaultValue="I certify this logbook entry is accurate for the work or approval described."
          name="intentText"
          required
        />
        <button className="min-h-9 cursor-pointer rounded-md bg-zinc-950 px-3 text-xs font-semibold text-white hover:bg-zinc-800" type="submit">
          Sign and lock
        </button>
      </form>
    </details>
  );
}

function AttachmentForm({ aircraftId, entry }: { aircraftId: string; entry: LogbookEntry }) {
  if (entry.lockedAt) {
    return null;
  }

  return (
    <form action={uploadAircraftLogbookAttachmentAction.bind(null, aircraftId, entry.id)} className="mt-2 flex flex-wrap gap-2">
      <input
        accept="image/*,application/pdf,text/plain"
        className="min-h-9 max-w-full cursor-pointer rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700"
        name="attachment"
        type="file"
      />
      <button className="min-h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100" type="submit">
        Attach
      </button>
    </form>
  );
}

function LogbookEntryCard({ aircraftId, entry }: { aircraftId: string; entry: LogbookEntry }) {
  return (
    <article className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 scroll-mt-4" id={entry.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {entry.entryNumber} | {formatStatus(entry.entryType)}
          </p>
          <h3 className="mt-1 text-base font-semibold text-zinc-950">{entry.title}</h3>
          <p className="mt-1 text-xs text-zinc-500">{formatDateTime(entry.reportedAt)}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(entry.status)}`}>
          {formatStatus(entry.status)}
        </span>
      </div>
      {entry.narrative ? <p className="text-sm leading-6 text-zinc-700">{entry.narrative}</p> : null}
      <div className="grid gap-2 text-xs text-zinc-600 sm:grid-cols-2 lg:grid-cols-3">
        {entry.category ? <p><span className="font-semibold text-zinc-800">Category:</span> {entry.category}</p> : null}
        {entry.severity ? <p><span className="font-semibold text-zinc-800">Severity:</span> {entry.severity}</p> : null}
        {entry.manualReference ? <p><span className="font-semibold text-zinc-800">Manual:</span> {entry.manualReference}</p> : null}
        {entry.taskReference ? <p><span className="font-semibold text-zinc-800">Task:</span> {entry.taskReference}</p> : null}
        {entry.melItemNumber ? <p><span className="font-semibold text-zinc-800">MEL:</span> {entry.melItemNumber}</p> : null}
        {entry.returnToServiceAt ? <p><span className="font-semibold text-zinc-800">RTS:</span> {formatDateTime(entry.returnToServiceAt)}</p> : null}
      </div>
      {entry.operatingLimitations || entry.requiredProcedures ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950">
          {entry.operatingLimitations ? <p><span className="font-semibold">Limitations:</span> {entry.operatingLimitations}</p> : null}
          {entry.requiredProcedures ? <p><span className="font-semibold">Procedures:</span> {entry.requiredProcedures}</p> : null}
        </div>
      ) : null}
      {entry.attachments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {entry.attachments.map((attachment) => (
            <a
              className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              href={`/aircraft/${aircraftId}/logbook/attachments/${attachment.id}`}
              key={attachment.id}
              target="_blank"
            >
              {attachment.originalFilename ?? "Attachment"}
            </a>
          ))}
        </div>
      ) : null}
      {entry.signatures.length > 0 ? (
        <div className="grid gap-1 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
          {entry.signatures.map((signature) => (
            <p key={signature.id}>
              Signed by {signature.signerName} {signature.certificateNumber ? `#${signature.certificateNumber}` : ""} on {formatDateTime(signature.signedAt)}
            </p>
          ))}
        </div>
      ) : null}
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.45fr)]">
        <AttachmentForm aircraftId={aircraftId} entry={entry} />
        <SignEntryForm aircraftId={aircraftId} entry={entry} />
      </div>
    </article>
  );
}

export default async function AircraftLogbookPage({ params, searchParams }: PageProps) {
  await requireRole([UserRole.ADMIN, UserRole.OPS, UserRole.DISPATCH, UserRole.MAINTENANCE, UserRole.SAFETY, UserRole.VIEWER]);
  const { aircraftId } = await params;
  const query = await searchParams;
  const [aircraft, templates] = await Promise.all([
    getAircraftLogbookWorkspaceData(aircraftId),
    getActiveMaintenanceEntryTemplates(),
  ]);

  if (!aircraft) {
    notFound();
  }

  const openDiscrepancies = aircraft.discrepancies.filter((item) => item.status === DiscrepancyStatus.OPEN);
  const activeDeferrals = aircraft.deferrals.filter((item) => item.status === DeferralStatus.ACTIVE);
  const currentRelease = aircraft.airworthinessReleases.find((item) => item.status === AirworthinessReleaseStatus.RELEASED);
  const error = firstSearchParam(query.error);
  const submitted = firstSearchParam(query.submitted);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className="text-sm font-semibold text-zinc-600 hover:text-zinc-950" href={`/aircraft/${aircraft.id}/airworthiness`}>
            Back to airworthiness
          </Link>
          <a
            className="inline-flex min-h-10 items-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            href={`/aircraft/${aircraft.id}/logbook/export`}
            target="_blank"
          >
            Export package
          </a>
        </div>

        <header className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Aircraft logbook</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{aircraft.tailNumber}</h1>
              <p className="mt-1 text-sm text-zinc-600">
                {formatStatus(aircraft.type)} | {aircraft.homeStation?.code ?? "No base"} | {formatStatus(aircraft.status)}
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${currentRelease ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              {currentRelease ? `Current release ${currentRelease.releaseNumber}` : "No current release"}
            </span>
          </div>
        </header>

        {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
        {submitted ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Logbook action saved.</p> : null}

        <section className="grid gap-3 md:grid-cols-4">
          <StatCard label="Open write-ups" tone={openDiscrepancies.length ? "warn" : "good"} value={openDiscrepancies.length} />
          <StatCard label="Active MELs" tone={activeDeferrals.length ? "warn" : "good"} value={activeDeferrals.length} />
          <StatCard label="Logbook entries" value={aircraft.logbookEntries.length} />
          <StatCard label="Last maintenance" value={aircraft.maintenanceEvents[0]?.maintenanceNumber ?? "None"} />
        </section>

        <CorrectiveActionForm aircraft={aircraft} />

        <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-500" />
            <h2 className="text-base font-semibold text-zinc-950">Common entry templates</h2>
          </div>
          {templates.length === 0 ? (
            <p className="text-sm text-zinc-600">No active templates have been seeded yet.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {templates.slice(0, 8).map((template) => (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={template.id}>
                  <p className="text-sm font-semibold text-zinc-950">{template.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatStatus(template.entryType)} | v{template.version}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">{template.starterNarrative}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3">
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-zinc-500" />
            <h2 className="text-lg font-semibold text-zinc-950">Regulatory logbook timeline</h2>
          </div>
          {aircraft.logbookEntries.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
              No regulatory logbook entries have been created for this tail yet.
            </p>
          ) : (
            aircraft.logbookEntries.map((entry) => (
              <LogbookEntryCard aircraftId={aircraft.id} entry={entry} key={entry.id} />
            ))
          )}
        </section>
      </div>
    </main>
  );
}
