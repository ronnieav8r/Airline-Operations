import {
  AircraftType,
  CrewCheckEventType,
  CrewCertificateType,
  CrewComplianceRecordStatus,
  CrewComplianceResult,
  CrewDutyPeriodStatus,
  CrewRecencyEventType,
  CrewRestPeriodStatus,
  CrewTrainingEventType,
  DutyStatus,
  MedicalCertificateClass,
  SeatRole,
  UserRole,
} from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

import {
  cancelCrewDutyPeriodAction,
  cancelCrewRestPeriodAction,
  createCrewCertificateAction,
  createCrewCheckEventAction,
  createCrewDutyPeriodAction,
  createCrewMedicalAction,
  createCrewRecencyEventAction,
  createCrewRestPeriodAction,
  createCrewTrainingEventAction,
  reviewCrewCertificateAction,
  reviewCrewCheckEventAction,
  reviewCrewDutyPeriodAction,
  reviewCrewMedicalAction,
  reviewCrewRecencyEventAction,
  reviewCrewRestPeriodAction,
  reviewCrewTrainingEventAction,
  updateCrewCertificateAction,
  updateCrewCheckEventAction,
  updateCrewDutyPeriodAction,
  updateCrewMedicalAction,
  updateCrewRecencyEventAction,
  updateCrewRestPeriodAction,
  updateCrewTrainingEventAction,
  voidCrewCertificateAction,
  voidCrewCheckEventAction,
  voidCrewMedicalAction,
  voidCrewRecencyEventAction,
  voidCrewTrainingEventAction,
} from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    crewMemberId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

function firstQueryValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatEnum(value: string): string {
  return value.replaceAll("_", " ");
}

function dateInputValue(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

function dateTimeInputValue(value: Date | null): string {
  return value ? value.toISOString().slice(0, 16) : "";
}

function dateLabel(value: Date | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function statusBadgeClasses(status: string): string {
  if (status === CrewComplianceRecordStatus.ACTIVE) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === CrewComplianceRecordStatus.EXPIRED) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-rose-100 text-rose-800";
}

function SelectField<T extends Record<string, string>>({
  defaultValue,
  enumObject,
  includeBlank = false,
  label,
  name,
}: {
  defaultValue?: string | null;
  enumObject: T;
  includeBlank?: boolean;
  label: string;
  name: string;
}) {
  return (
    <label className="text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
        defaultValue={defaultValue ?? ""}
        name={name}
      >
        {includeBlank ? <option value="">None</option> : null}
        {Object.values(enumObject).map((value) => (
          <option key={value} value={value}>
            {formatEnum(value)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  type = "text",
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
        defaultValue={defaultValue ?? ""}
        name={name}
        type={type}
      />
    </label>
  );
}

function TextAreaField({
  defaultValue,
  label,
  name,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
}) {
  return (
    <label className="text-sm md:col-span-2">
      <span className="font-medium text-zinc-700">{label}</span>
      <textarea
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
        defaultValue={defaultValue ?? ""}
        name={name}
        rows={2}
      />
    </label>
  );
}

function FormButton({ children }: { children: string }) {
  return (
    <button
      className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
      type="submit"
    >
      {children}
    </button>
  );
}

function CertificateForm({
  action,
  certificate,
}: {
  action: (formData: FormData) => void | Promise<void>;
  certificate?: {
    aircraftType: AircraftType | null;
    certificateNumber: string | null;
    certificateType: CrewCertificateType;
    expiresAt: Date | null;
    issuedAt: Date | null;
    issuingAuthority: string | null;
    notes: string | null;
    ratingOrEndorsement: string | null;
    seatRole: SeatRole | null;
    status: CrewComplianceRecordStatus;
  };
}) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <SelectField
        defaultValue={certificate?.certificateType ?? CrewCertificateType.ATP}
        enumObject={CrewCertificateType}
        label="Certificate type"
        name="certificateType"
      />
      <SelectField
        defaultValue={certificate?.status ?? CrewComplianceRecordStatus.ACTIVE}
        enumObject={CrewComplianceRecordStatus}
        label="Status"
        name="status"
      />
      <TextField
        defaultValue={certificate?.certificateNumber}
        label="Certificate number"
        name="certificateNumber"
      />
      <TextField
        defaultValue={certificate?.ratingOrEndorsement}
        label="Rating / endorsement"
        name="ratingOrEndorsement"
      />
      <SelectField
        defaultValue={certificate?.aircraftType}
        enumObject={AircraftType}
        includeBlank
        label="Aircraft type"
        name="aircraftType"
      />
      <SelectField
        defaultValue={certificate?.seatRole}
        enumObject={SeatRole}
        includeBlank
        label="Seat role"
        name="seatRole"
      />
      <TextField
        defaultValue={certificate?.issuingAuthority}
        label="Issuing authority"
        name="issuingAuthority"
      />
      <TextField defaultValue={dateInputValue(certificate?.issuedAt ?? null)} label="Issued" name="issuedAt" type="date" />
      <TextField defaultValue={dateInputValue(certificate?.expiresAt ?? null)} label="Expires" name="expiresAt" type="date" />
      <TextAreaField defaultValue={certificate?.notes} label="Notes" name="notes" />
      <div className="md:col-span-2">
        <FormButton>{certificate ? "Update certificate" : "Create certificate"}</FormButton>
      </div>
    </form>
  );
}

function MedicalForm({
  action,
  medical,
}: {
  action: (formData: FormData) => void | Promise<void>;
  medical?: {
    expiresAt: Date | null;
    issuedAt: Date | null;
    limitations: string | null;
    medicalClass: MedicalCertificateClass;
    notes: string | null;
    status: CrewComplianceRecordStatus;
  };
}) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <SelectField
        defaultValue={medical?.medicalClass ?? MedicalCertificateClass.FIRST_CLASS}
        enumObject={MedicalCertificateClass}
        label="Medical class"
        name="medicalClass"
      />
      <SelectField
        defaultValue={medical?.status ?? CrewComplianceRecordStatus.ACTIVE}
        enumObject={CrewComplianceRecordStatus}
        label="Status"
        name="status"
      />
      <TextField defaultValue={dateInputValue(medical?.issuedAt ?? null)} label="Issued" name="issuedAt" type="date" />
      <TextField defaultValue={dateInputValue(medical?.expiresAt ?? null)} label="Expires" name="expiresAt" type="date" />
      <TextAreaField defaultValue={medical?.limitations} label="Limitations" name="limitations" />
      <TextAreaField defaultValue={medical?.notes} label="Notes" name="notes" />
      <div className="md:col-span-2">
        <FormButton>{medical ? "Update medical" : "Create medical"}</FormButton>
      </div>
    </form>
  );
}

function TrainingForm({
  action,
  training,
}: {
  action: (formData: FormData) => void | Promise<void>;
  training?: {
    aircraftType: AircraftType | null;
    completedAt: Date;
    expiresAt: Date | null;
    instructorName: string | null;
    moduleName: string | null;
    notes: string | null;
    programName: string;
    providerName: string | null;
    result: CrewComplianceResult;
    status: CrewComplianceRecordStatus;
    trainingType: CrewTrainingEventType;
  };
}) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <SelectField
        defaultValue={training?.trainingType ?? CrewTrainingEventType.RECURRENT}
        enumObject={CrewTrainingEventType}
        label="Training type"
        name="trainingType"
      />
      <SelectField
        defaultValue={training?.status ?? CrewComplianceRecordStatus.ACTIVE}
        enumObject={CrewComplianceRecordStatus}
        label="Status"
        name="status"
      />
      <TextField defaultValue={training?.programName} label="Program name" name="programName" />
      <TextField defaultValue={training?.moduleName} label="Module name" name="moduleName" />
      <SelectField
        defaultValue={training?.aircraftType}
        enumObject={AircraftType}
        includeBlank
        label="Aircraft type"
        name="aircraftType"
      />
      <SelectField
        defaultValue={training?.result ?? CrewComplianceResult.SATISFACTORY}
        enumObject={CrewComplianceResult}
        label="Result"
        name="result"
      />
      <TextField defaultValue={dateInputValue(training?.completedAt ?? null)} label="Completed" name="completedAt" type="date" />
      <TextField defaultValue={dateInputValue(training?.expiresAt ?? null)} label="Expires" name="expiresAt" type="date" />
      <TextField defaultValue={training?.instructorName} label="Instructor" name="instructorName" />
      <TextField defaultValue={training?.providerName} label="Provider" name="providerName" />
      <TextAreaField defaultValue={training?.notes} label="Notes" name="notes" />
      <div className="md:col-span-2">
        <FormButton>{training ? "Update training" : "Create training"}</FormButton>
      </div>
    </form>
  );
}

function CheckForm({
  action,
  check,
}: {
  action: (formData: FormData) => void | Promise<void>;
  check?: {
    aircraftType: AircraftType | null;
    checkType: CrewCheckEventType;
    completedAt: Date;
    evaluatorName: string | null;
    expiresAt: Date | null;
    notes: string | null;
    providerName: string | null;
    result: CrewComplianceResult;
    seatRole: SeatRole | null;
    status: CrewComplianceRecordStatus;
  };
}) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <SelectField
        defaultValue={check?.checkType ?? CrewCheckEventType.PROFICIENCY}
        enumObject={CrewCheckEventType}
        label="Check type"
        name="checkType"
      />
      <SelectField
        defaultValue={check?.status ?? CrewComplianceRecordStatus.ACTIVE}
        enumObject={CrewComplianceRecordStatus}
        label="Status"
        name="status"
      />
      <SelectField
        defaultValue={check?.aircraftType}
        enumObject={AircraftType}
        includeBlank
        label="Aircraft type"
        name="aircraftType"
      />
      <SelectField
        defaultValue={check?.seatRole}
        enumObject={SeatRole}
        includeBlank
        label="Seat role"
        name="seatRole"
      />
      <SelectField
        defaultValue={check?.result ?? CrewComplianceResult.SATISFACTORY}
        enumObject={CrewComplianceResult}
        label="Result"
        name="result"
      />
      <TextField defaultValue={dateInputValue(check?.completedAt ?? null)} label="Completed" name="completedAt" type="date" />
      <TextField defaultValue={dateInputValue(check?.expiresAt ?? null)} label="Expires" name="expiresAt" type="date" />
      <TextField defaultValue={check?.evaluatorName} label="Evaluator" name="evaluatorName" />
      <TextField defaultValue={check?.providerName} label="Provider" name="providerName" />
      <TextAreaField defaultValue={check?.notes} label="Notes" name="notes" />
      <div className="md:col-span-2">
        <FormButton>{check ? "Update check" : "Create check"}</FormButton>
      </div>
    </form>
  );
}

function RecencyForm({
  action,
  recency,
}: {
  action: (formData: FormData) => void | Promise<void>;
  recency?: {
    aircraftType: AircraftType | null;
    eventAt: Date;
    notes: string | null;
    quantity: number | null;
    recencyType: CrewRecencyEventType;
    result: CrewComplianceResult;
    seatRole: SeatRole | null;
    status: CrewComplianceRecordStatus;
    windowEnd: Date | null;
    windowStart: Date | null;
  };
}) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <SelectField
        defaultValue={recency?.recencyType ?? CrewRecencyEventType.TAKEOFF_LANDING}
        enumObject={CrewRecencyEventType}
        label="Recency type"
        name="recencyType"
      />
      <SelectField
        defaultValue={recency?.status ?? CrewComplianceRecordStatus.ACTIVE}
        enumObject={CrewComplianceRecordStatus}
        label="Status"
        name="status"
      />
      <SelectField
        defaultValue={recency?.aircraftType}
        enumObject={AircraftType}
        includeBlank
        label="Aircraft type"
        name="aircraftType"
      />
      <SelectField
        defaultValue={recency?.seatRole}
        enumObject={SeatRole}
        includeBlank
        label="Seat role"
        name="seatRole"
      />
      <SelectField
        defaultValue={recency?.result ?? CrewComplianceResult.SATISFACTORY}
        enumObject={CrewComplianceResult}
        label="Result"
        name="result"
      />
      <TextField defaultValue={dateInputValue(recency?.eventAt ?? null)} label="Event date" name="eventAt" type="date" />
      <TextField defaultValue={recency?.quantity?.toString() ?? ""} label="Quantity" name="quantity" type="number" />
      <TextField defaultValue={dateInputValue(recency?.windowStart ?? null)} label="Window start" name="windowStart" type="date" />
      <TextField defaultValue={dateInputValue(recency?.windowEnd ?? null)} label="Window end" name="windowEnd" type="date" />
      <TextAreaField defaultValue={recency?.notes} label="Notes" name="notes" />
      <div className="md:col-span-2">
        <FormButton>{recency ? "Update recency" : "Create recency"}</FormButton>
      </div>
    </form>
  );
}

function DutyPeriodForm({
  action,
  dutyPeriod,
}: {
  action: (formData: FormData) => void | Promise<void>;
  dutyPeriod?: {
    dutyStatus: DutyStatus | null;
    endsAt: Date | null;
    notes: string | null;
    source: string | null;
    startsAt: Date;
    status: CrewDutyPeriodStatus;
  };
}) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <SelectField
        defaultValue={dutyPeriod?.status ?? CrewDutyPeriodStatus.PLANNED}
        enumObject={CrewDutyPeriodStatus}
        label="Status"
        name="status"
      />
      <SelectField
        defaultValue={dutyPeriod?.dutyStatus}
        enumObject={DutyStatus}
        includeBlank
        label="Duty status"
        name="dutyStatus"
      />
      <TextField defaultValue={dateTimeInputValue(dutyPeriod?.startsAt ?? null)} label="Starts" name="startsAt" type="datetime-local" />
      <TextField defaultValue={dateTimeInputValue(dutyPeriod?.endsAt ?? null)} label="Ends" name="endsAt" type="datetime-local" />
      <TextField defaultValue={dutyPeriod?.source} label="Source" name="source" />
      <TextAreaField defaultValue={dutyPeriod?.notes} label="Notes" name="notes" />
      <div className="md:col-span-2">
        <FormButton>{dutyPeriod ? "Update duty period" : "Create duty period"}</FormButton>
      </div>
    </form>
  );
}

function RestPeriodForm({
  action,
  restPeriod,
}: {
  action: (formData: FormData) => void | Promise<void>;
  restPeriod?: {
    endsAt: Date | null;
    notes: string | null;
    source: string | null;
    startsAt: Date;
    status: CrewRestPeriodStatus;
  };
}) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <SelectField
        defaultValue={restPeriod?.status ?? CrewRestPeriodStatus.PLANNED}
        enumObject={CrewRestPeriodStatus}
        label="Status"
        name="status"
      />
      <TextField defaultValue={dateTimeInputValue(restPeriod?.startsAt ?? null)} label="Starts" name="startsAt" type="datetime-local" />
      <TextField defaultValue={dateTimeInputValue(restPeriod?.endsAt ?? null)} label="Ends" name="endsAt" type="datetime-local" />
      <TextField defaultValue={restPeriod?.source} label="Source" name="source" />
      <TextAreaField defaultValue={restPeriod?.notes} label="Notes" name="notes" />
      <div className="md:col-span-2">
        <FormButton>{restPeriod ? "Update rest period" : "Create rest period"}</FormButton>
      </div>
    </form>
  );
}

async function getCrewCompliancePageData(crewMemberId: string) {
  return prisma.crewMember.findUnique({
    where: { id: crewMemberId },
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      baseStation: {
        select: {
          code: true,
        },
      },
      certificates: {
        orderBy: [{ status: "asc" }, { expiresAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          aircraftType: true,
          certificateNumber: true,
          certificateType: true,
          expiresAt: true,
          issuedAt: true,
          issuingAuthority: true,
          notes: true,
          ratingOrEndorsement: true,
          seatRole: true,
          status: true,
          verifiedAt: true,
        },
      },
      medicals: {
        orderBy: [{ status: "asc" }, { expiresAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          expiresAt: true,
          issuedAt: true,
          limitations: true,
          medicalClass: true,
          notes: true,
          status: true,
          verifiedAt: true,
        },
      },
      trainingEvents: {
        orderBy: [{ status: "asc" }, { completedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          aircraftType: true,
          completedAt: true,
          expiresAt: true,
          instructorName: true,
          moduleName: true,
          notes: true,
          programName: true,
          providerName: true,
          result: true,
          status: true,
          trainingType: true,
          verifiedAt: true,
        },
      },
      checkEvents: {
        orderBy: [{ status: "asc" }, { completedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          aircraftType: true,
          checkType: true,
          completedAt: true,
          evaluatorName: true,
          expiresAt: true,
          notes: true,
          providerName: true,
          result: true,
          seatRole: true,
          status: true,
          verifiedAt: true,
        },
      },
      recencyEvents: {
        orderBy: [{ status: "asc" }, { eventAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          aircraftType: true,
          eventAt: true,
          notes: true,
          quantity: true,
          recencyType: true,
          result: true,
          seatRole: true,
          status: true,
          verifiedAt: true,
          windowEnd: true,
          windowStart: true,
        },
      },
      dutyPeriods: {
        orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          dutyStatus: true,
          endsAt: true,
          notes: true,
          source: true,
          startsAt: true,
          status: true,
          verifiedAt: true,
        },
      },
      restPeriods: {
        orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          endsAt: true,
          notes: true,
          source: true,
          startsAt: true,
          status: true,
          verifiedAt: true,
        },
      },
    },
  });
}

export default async function CrewCompliancePage({ params, searchParams }: PageProps) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);
  const { crewMemberId } = await params;
  const query = await searchParams;
  const crewMember = await getCrewCompliancePageData(crewMemberId);

  if (!crewMember) {
    notFound();
  }

  const message = firstQueryValue(query.message);
  const error = firstQueryValue(query.error);
  const crewName = `${crewMember.firstName} ${crewMember.lastName}`;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link className="text-sm font-medium text-sky-700 hover:text-sky-900" href={`/crew/${crewMember.id}`}>
              Back to crew member
            </Link>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Crew Compliance
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{crewName}</h1>
            <p className="mt-2 text-sm text-zinc-600">
              {crewMember.employeeNumber} | Base {crewMember.baseStation?.code ?? "Unassigned"}
            </p>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Admin-managed evidence only. These records feed warning surfaces but do not hard-block release or
            assignment workflows.
          </div>
        </div>

        {message ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create Certificate / Rating</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Add certificate, rating, endorsement, or aircraft/seat-role evidence.
          </p>
          <div className="mt-4">
            <CertificateForm action={createCrewCertificateAction.bind(null, crewMember.id)} />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create Medical Record</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Add medical certificate class, issue/expiry dates, limitations, and notes.
          </p>
          <div className="mt-4">
            <MedicalForm action={createCrewMedicalAction.bind(null, crewMember.id)} />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create Training Record</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Add training program, module, completion, result, and expiration evidence.
          </p>
          <div className="mt-4">
            <TrainingForm action={createCrewTrainingEventAction.bind(null, crewMember.id)} />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create Check Record</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Add proficiency, competency, line, route, instrument, or checkride evidence.
          </p>
          <div className="mt-4">
            <CheckForm action={createCrewCheckEventAction.bind(null, crewMember.id)} />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create Recency Record</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Add landings, approaches, route exposure, flight-time, or other recency evidence.
          </p>
          <div className="mt-4">
            <RecencyForm action={createCrewRecencyEventAction.bind(null, crewMember.id)} />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create Duty Period</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Add planned or actual duty evidence for warning-only duty/rest review.
          </p>
          <div className="mt-4">
            <DutyPeriodForm action={createCrewDutyPeriodAction.bind(null, crewMember.id)} />
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Create Rest Period</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Add rest evidence for warning-only duty/rest review.
          </p>
          <div className="mt-4">
            <RestPeriodForm action={createCrewRestPeriodAction.bind(null, crewMember.id)} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Certificate / Rating Records</h2>
          {crewMember.certificates.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
              No certificate records yet.
            </p>
          ) : (
            crewMember.certificates.map((certificate) => (
              <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm" key={certificate.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(certificate.status)}`}>
                      {formatEnum(certificate.status)}
                    </span>
                    <h3 className="mt-2 font-semibold">
                      {formatEnum(certificate.certificateType)}
                      {certificate.ratingOrEndorsement ? ` - ${certificate.ratingOrEndorsement}` : ""}
                    </h3>
                    <p className="text-sm text-zinc-600">
                      Issued {dateLabel(certificate.issuedAt)} | expires {dateLabel(certificate.expiresAt)} |
                      reviewed {dateLabel(certificate.verifiedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={reviewCrewCertificateAction.bind(null, crewMember.id, certificate.id)}>
                      <button className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold" type="submit">
                        Mark reviewed
                      </button>
                    </form>
                    <form action={voidCrewCertificateAction.bind(null, crewMember.id, certificate.id)}>
                      <button className="rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700" type="submit">
                        Void
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <CertificateForm
                    action={updateCrewCertificateAction.bind(null, crewMember.id, certificate.id)}
                    certificate={certificate}
                  />
                </div>
              </article>
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Medical Records</h2>
          {crewMember.medicals.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
              No medical records yet.
            </p>
          ) : (
            crewMember.medicals.map((medical) => (
              <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm" key={medical.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(medical.status)}`}>
                      {formatEnum(medical.status)}
                    </span>
                    <h3 className="mt-2 font-semibold">{formatEnum(medical.medicalClass)}</h3>
                    <p className="text-sm text-zinc-600">
                      Issued {dateLabel(medical.issuedAt)} | expires {dateLabel(medical.expiresAt)} |
                      reviewed {dateLabel(medical.verifiedAt)}
                    </p>
                    {medical.limitations ? <p className="mt-1 text-sm text-zinc-600">{medical.limitations}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={reviewCrewMedicalAction.bind(null, crewMember.id, medical.id)}>
                      <button className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold" type="submit">
                        Mark reviewed
                      </button>
                    </form>
                    <form action={voidCrewMedicalAction.bind(null, crewMember.id, medical.id)}>
                      <button className="rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700" type="submit">
                        Void
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <MedicalForm action={updateCrewMedicalAction.bind(null, crewMember.id, medical.id)} medical={medical} />
                </div>
              </article>
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Training Records</h2>
          {crewMember.trainingEvents.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
              No training records yet.
            </p>
          ) : (
            crewMember.trainingEvents.map((training) => (
              <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm" key={training.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(training.status)}`}>
                      {formatEnum(training.status)}
                    </span>
                    <h3 className="mt-2 font-semibold">{training.programName}</h3>
                    <p className="text-sm text-zinc-600">
                      {formatEnum(training.trainingType)} | {formatEnum(training.result)} | completed{" "}
                      {dateLabel(training.completedAt)} | expires {dateLabel(training.expiresAt)} | reviewed{" "}
                      {dateLabel(training.verifiedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={reviewCrewTrainingEventAction.bind(null, crewMember.id, training.id)}>
                      <button className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold" type="submit">
                        Mark reviewed
                      </button>
                    </form>
                    <form action={voidCrewTrainingEventAction.bind(null, crewMember.id, training.id)}>
                      <button className="rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700" type="submit">
                        Void
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <TrainingForm
                    action={updateCrewTrainingEventAction.bind(null, crewMember.id, training.id)}
                    training={training}
                  />
                </div>
              </article>
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Check Records</h2>
          {crewMember.checkEvents.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
              No check records yet.
            </p>
          ) : (
            crewMember.checkEvents.map((check) => (
              <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm" key={check.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(check.status)}`}>
                      {formatEnum(check.status)}
                    </span>
                    <h3 className="mt-2 font-semibold">{formatEnum(check.checkType)}</h3>
                    <p className="text-sm text-zinc-600">
                      {formatEnum(check.result)} | completed {dateLabel(check.completedAt)} | expires{" "}
                      {dateLabel(check.expiresAt)} | reviewed {dateLabel(check.verifiedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={reviewCrewCheckEventAction.bind(null, crewMember.id, check.id)}>
                      <button className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold" type="submit">
                        Mark reviewed
                      </button>
                    </form>
                    <form action={voidCrewCheckEventAction.bind(null, crewMember.id, check.id)}>
                      <button className="rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700" type="submit">
                        Void
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <CheckForm action={updateCrewCheckEventAction.bind(null, crewMember.id, check.id)} check={check} />
                </div>
              </article>
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recency Records</h2>
          {crewMember.recencyEvents.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
              No recency records yet.
            </p>
          ) : (
            crewMember.recencyEvents.map((recency) => (
              <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm" key={recency.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(recency.status)}`}>
                      {formatEnum(recency.status)}
                    </span>
                    <h3 className="mt-2 font-semibold">{formatEnum(recency.recencyType)}</h3>
                    <p className="text-sm text-zinc-600">
                      {formatEnum(recency.result)} | event {dateLabel(recency.eventAt)} | quantity{" "}
                      {recency.quantity ?? "not set"} | reviewed {dateLabel(recency.verifiedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={reviewCrewRecencyEventAction.bind(null, crewMember.id, recency.id)}>
                      <button className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold" type="submit">
                        Mark reviewed
                      </button>
                    </form>
                    <form action={voidCrewRecencyEventAction.bind(null, crewMember.id, recency.id)}>
                      <button className="rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700" type="submit">
                        Void
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <RecencyForm
                    action={updateCrewRecencyEventAction.bind(null, crewMember.id, recency.id)}
                    recency={recency}
                  />
                </div>
              </article>
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Duty Periods</h2>
          {crewMember.dutyPeriods.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
              No duty periods yet.
            </p>
          ) : (
            crewMember.dutyPeriods.map((dutyPeriod) => (
              <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm" key={dutyPeriod.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(dutyPeriod.status)}`}>
                      {formatEnum(dutyPeriod.status)}
                    </span>
                    <h3 className="mt-2 font-semibold">
                      {dutyPeriod.dutyStatus ? formatEnum(dutyPeriod.dutyStatus) : "Duty period"}
                    </h3>
                    <p className="text-sm text-zinc-600">
                      {dateLabel(dutyPeriod.startsAt)} to {dateLabel(dutyPeriod.endsAt)} | reviewed{" "}
                      {dateLabel(dutyPeriod.verifiedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={reviewCrewDutyPeriodAction.bind(null, crewMember.id, dutyPeriod.id)}>
                      <button className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold" type="submit">
                        Mark reviewed
                      </button>
                    </form>
                    <form action={cancelCrewDutyPeriodAction.bind(null, crewMember.id, dutyPeriod.id)}>
                      <button className="rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700" type="submit">
                        Cancel
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <DutyPeriodForm
                    action={updateCrewDutyPeriodAction.bind(null, crewMember.id, dutyPeriod.id)}
                    dutyPeriod={dutyPeriod}
                  />
                </div>
              </article>
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Rest Periods</h2>
          {crewMember.restPeriods.length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
              No rest periods yet.
            </p>
          ) : (
            crewMember.restPeriods.map((restPeriod) => (
              <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm" key={restPeriod.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(restPeriod.status)}`}>
                      {formatEnum(restPeriod.status)}
                    </span>
                    <h3 className="mt-2 font-semibold">Rest period</h3>
                    <p className="text-sm text-zinc-600">
                      {dateLabel(restPeriod.startsAt)} to {dateLabel(restPeriod.endsAt)} | reviewed{" "}
                      {dateLabel(restPeriod.verifiedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={reviewCrewRestPeriodAction.bind(null, crewMember.id, restPeriod.id)}>
                      <button className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-semibold" type="submit">
                        Mark reviewed
                      </button>
                    </form>
                    <form action={cancelCrewRestPeriodAction.bind(null, crewMember.id, restPeriod.id)}>
                      <button className="rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700" type="submit">
                        Cancel
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <RestPeriodForm
                    action={updateCrewRestPeriodAction.bind(null, crewMember.id, restPeriod.id)}
                    restPeriod={restPeriod}
                  />
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
