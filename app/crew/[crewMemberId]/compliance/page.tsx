import {
  AircraftType,
  CrewCertificateType,
  CrewComplianceRecordStatus,
  MedicalCertificateClass,
  SeatRole,
  UserRole,
} from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

import {
  createCrewCertificateAction,
  createCrewMedicalAction,
  reviewCrewCertificateAction,
  reviewCrewMedicalAction,
  updateCrewCertificateAction,
  updateCrewMedicalAction,
  voidCrewCertificateAction,
  voidCrewMedicalAction,
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

function statusBadgeClasses(status: CrewComplianceRecordStatus): string {
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
      </div>
    </main>
  );
}
