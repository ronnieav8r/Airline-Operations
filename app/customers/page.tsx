import {
  IdDocumentType,
  PassengerAviationInterest,
  PassengerConversationPreference,
  PassengerTemperaturePreference,
} from "@prisma/client";
import Link from "next/link";

import {
  createCustomerAction,
  createPassengerAction,
  linkPassengerToCustomerAction,
  unlinkPassengerFromCustomerAction,
  updateCustomerAction,
  updatePassengerAction,
} from "@/app/customers/actions";
import { ContextDrawer } from "@/components/context-drawer";
import { PassengerIdentityDocumentCapture } from "@/components/passenger-identity-document-capture";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    customer?: string | string[];
    error?: string | string[];
    panel?: string | string[];
    passenger?: string | string[];
    q?: string | string[];
    view?: string | string[];
  }>;
};

type WorkspaceView = "customers" | "passengers";
type WorkspacePanel = "new-customer" | "new-passenger" | null;

type WorkspaceState = {
  customer: string | null;
  panel: WorkspacePanel;
  passenger: string | null;
  q: string;
  view: WorkspaceView;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parsePanel(value: string | null): WorkspacePanel {
  if (value === "new-customer" || value === "new-passenger") {
    return value;
  }

  return null;
}

function customersHref(state: WorkspaceState, next: Partial<WorkspaceState> = {}) {
  const merged = { ...state, ...next };
  const params = new URLSearchParams();

  if (merged.q) {
    params.set("q", merged.q);
  }
  if (merged.view === "passengers") {
    params.set("view", "passengers");
  }
  if (merged.panel) {
    params.set("panel", merged.panel);
  }
  if (merged.customer) {
    params.set("customer", merged.customer);
  }
  if (merged.passenger) {
    params.set("passenger", merged.passenger);
  }

  const query = params.toString();
  return query ? `/customers?${query}` : "/customers";
}

function toDateInput(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

function toDate(value: Date | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatEnum(value: string | null | undefined): string {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function servicePreferenceLabel(value: string | null | undefined): string {
  return value && value !== "UNKNOWN" ? formatEnum(value) : "Not set";
}

function fullName(passenger: { firstName: string; lastName: string; middleName?: string | null }) {
  return [passenger.firstName, passenger.middleName, passenger.lastName].filter(Boolean).join(" ");
}

function displayError(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function contactLine(record: {
  contactEmail?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const primary = record.contactName ?? record.email ?? record.contactEmail ?? record.phone ?? record.contactPhone;
  const secondary =
    record.contactName && (record.contactEmail || record.contactPhone)
      ? [record.contactEmail, record.contactPhone].filter(Boolean).join(" | ")
      : null;

  return {
    primary: primary ?? "No contact",
    secondary,
  };
}

function idDocumentStatus(passenger: {
  idDocumentExpiresAt?: Date | null;
  idDocumentNumber?: string | null;
  idDocumentType?: IdDocumentType | null;
  identityDocuments?: Array<{ id: string }>;
}) {
  if (passenger.identityDocuments && passenger.identityDocuments.length > 0) {
    return {
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "ID photo on file",
    };
  }

  if (!passenger.idDocumentType && !passenger.idDocumentNumber) {
    return {
      className: "border-zinc-200 bg-zinc-50 text-zinc-600",
      label: "No ID doc",
    };
  }

  if (passenger.idDocumentExpiresAt && passenger.idDocumentExpiresAt < new Date()) {
    return {
      className: "border-amber-200 bg-amber-50 text-amber-800",
      label: "ID expired",
    };
  }

  return {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: "ID on file",
  };
}

function Field({
  defaultValue,
  label,
  name,
  required = false,
  type = "text",
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
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
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <textarea
        className="mt-1 min-h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? ""}
        name={name}
      />
    </label>
  );
}

function PreferenceSelect({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? "UNKNOWN"}
        name={name}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "UNKNOWN" ? "Not set" : formatEnum(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

type PassengerServiceProfileFormValue = {
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

function ServiceProfileFields({ profile }: { profile?: PassengerServiceProfileFormValue }) {
  return (
    <section className="mt-4 rounded-md border border-zinc-200 bg-white p-3">
      <div>
        <h3 className="text-sm font-semibold text-zinc-950">Service profile</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Reusable passenger preferences for catering, cabin comfort, and crew interaction.
          These notes are preferences only, not operational promises or cockpit-access authorization.
        </p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <TextArea
          defaultValue={profile?.cateringPreferences}
          label="Catering preferences"
          name="cateringPreferences"
        />
        <TextArea
          defaultValue={profile?.cateringAvoidances}
          label="Catering avoidances"
          name="cateringAvoidances"
        />
        <TextArea
          defaultValue={profile?.beveragePreferences}
          label="Beverage preferences"
          name="beveragePreferences"
        />
        <PreferenceSelect
          defaultValue={profile?.temperaturePreference}
          label="Cabin temperature"
          name="temperaturePreference"
          options={Object.values(PassengerTemperaturePreference)}
        />
        <PreferenceSelect
          defaultValue={profile?.conversationPreference}
          label="Conversation style"
          name="conversationPreference"
          options={Object.values(PassengerConversationPreference)}
        />
        <PreferenceSelect
          defaultValue={profile?.aviationInterest}
          label="Aviation interest"
          name="aviationInterest"
          options={Object.values(PassengerAviationInterest)}
        />
        <TextArea
          defaultValue={profile?.cabinComfortNotes}
          label="Cabin comfort notes"
          name="cabinComfortNotes"
        />
        <TextArea
          defaultValue={profile?.flightDeckInteractionNotes}
          label="Cockpit / flight deck notes"
          name="flightDeckInteractionNotes"
        />
        <TextArea
          defaultValue={profile?.serviceNotes}
          label="Service notes"
          name="serviceNotes"
        />
      </div>
    </section>
  );
}

function hasServiceProfile(profile: PassengerServiceProfileFormValue | undefined): profile is NonNullable<PassengerServiceProfileFormValue> {
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

function PassengerServiceProfileSnapshot({ profile }: { profile: PassengerServiceProfileFormValue | undefined }) {
  if (!hasServiceProfile(profile)) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Service profile
        </h3>
        <p className="mt-2 text-sm text-zinc-600">No service profile yet.</p>
      </section>
    );
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
    ["Cabin comfort", profile.cabinComfortNotes],
    ["Cockpit / flight deck", profile.flightDeckInteractionNotes],
    ["Service", profile.serviceNotes],
  ].filter(([, value]) => value);

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-800">
          Service profile
        </h3>
        <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5 text-xs font-semibold text-sky-700">
          Preference notes
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-zinc-800 sm:grid-cols-2">
        {highlights.map(([label, value]) => (
          <p key={label}>
            <span className="font-medium">{label}:</span> {value}
          </p>
        ))}
      </div>
      {notes.length > 0 ? (
        <div className="mt-3 space-y-2 text-sm text-sky-950">
          {notes.map(([label, value]) => (
            <p className="rounded-md border border-sky-200 bg-white p-2" key={label}>
              <span className="font-medium">{label}:</span> {value}
            </p>
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-sky-800">
        These are preference notes only; they are not operational promises or cockpit-access authorization.
      </p>
    </section>
  );
}

function CustomerForm({
  action,
  customer,
  returnTo,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  customer?: {
    contactEmail: string | null;
    contactName: string | null;
    contactPhone: string | null;
    customerCode: string | null;
    isActive: boolean;
    name: string;
    notes: string | null;
  };
  returnTo: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <input name="returnTo" type="hidden" value={returnTo} />
      <div className="grid gap-3 md:grid-cols-2">
        <Field defaultValue={customer?.name} label="Customer name" name="name" required />
        <Field defaultValue={customer?.customerCode} label="Customer code" name="customerCode" />
        <Field defaultValue={customer?.contactName} label="Contact name" name="contactName" />
        <Field defaultValue={customer?.contactEmail} label="Contact email" name="contactEmail" type="email" />
        <Field defaultValue={customer?.contactPhone} label="Contact phone" name="contactPhone" />
        {customer ? (
          <label className="mt-5 flex items-center gap-2 text-sm font-medium text-zinc-700">
            <input defaultChecked={customer.isActive} name="isActive" type="checkbox" />
            Active
          </label>
        ) : null}
      </div>
      <div className="mt-3">
        <TextArea defaultValue={customer?.notes} label="Notes" name="notes" />
      </div>
      <button
        className="mt-3 rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
        type="submit"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function PassengerForm({
  action,
  customerId,
  passenger,
  returnTo,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  customerId?: string;
  passenger?: {
    dateOfBirth: Date | null;
    email: string | null;
    firstName: string;
    idDocumentExpiresAt: Date | null;
    idDocumentNumber: string | null;
    idDocumentType: IdDocumentType | null;
    idIssuingCountry: string | null;
    idIssuingState: string | null;
    lastName: string;
    middleName: string | null;
    notes: string | null;
    phone: string | null;
    serviceProfile: PassengerServiceProfileFormValue;
  };
  returnTo: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <input name="returnTo" type="hidden" value={returnTo} />
      {customerId ? <input name="customerId" type="hidden" value={customerId} /> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <Field defaultValue={passenger?.firstName} label="First name" name="firstName" required />
        <Field defaultValue={passenger?.middleName} label="Middle" name="middleName" />
        <Field defaultValue={passenger?.lastName} label="Last name" name="lastName" required />
        <Field
          defaultValue={toDateInput(passenger?.dateOfBirth)}
          label="Date of birth"
          name="dateOfBirth"
          type="date"
        />
        <Field defaultValue={passenger?.email} label="Email" name="email" type="email" />
        <Field defaultValue={passenger?.phone} label="Phone" name="phone" />
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">ID type</span>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            defaultValue={passenger?.idDocumentType ?? ""}
            name="idDocumentType"
          >
            <option value="">Not set</option>
            {Object.values(IdDocumentType).map((type) => (
              <option key={type} value={type}>
                {formatEnum(type)}
              </option>
            ))}
          </select>
        </label>
        <Field defaultValue={passenger?.idDocumentNumber} label="ID number" name="idDocumentNumber" />
        <Field defaultValue={passenger?.idIssuingCountry} label="Issuing country" name="idIssuingCountry" />
        <Field defaultValue={passenger?.idIssuingState} label="Issuing state" name="idIssuingState" />
        <Field
          defaultValue={toDateInput(passenger?.idDocumentExpiresAt)}
          label="ID expiration"
          name="idDocumentExpiresAt"
          type="date"
        />
        {customerId ? <Field label="Relationship" name="relationship" /> : null}
      </div>
      <div className="mt-3">
        <TextArea defaultValue={passenger?.notes} label="Notes" name="notes" />
      </div>
      <ServiceProfileFields profile={passenger?.serviceProfile} />
      <button
        className="mt-3 rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
        type="submit"
      >
        {submitLabel}
      </button>
    </form>
  );
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const state: WorkspaceState = {
    customer: firstParam(params.customer),
    panel: parsePanel(firstParam(params.panel)),
    passenger: firstParam(params.passenger),
    q: firstParam(params.q) ?? "",
    view: firstParam(params.view) === "passengers" ? "passengers" : "customers",
  };
  const error = firstParam(params.error);
  const closeHref = customersHref(state, { customer: null, panel: null, passenger: null });

  const [customers, passengers, selectedCustomer, selectedPassenger] = await Promise.all([
    prisma.customer.findMany({
      where: state.q
        ? {
            OR: [
              { name: { contains: state.q, mode: "insensitive" } },
              { customerCode: { contains: state.q, mode: "insensitive" } },
              { contactName: { contains: state.q, mode: "insensitive" } },
              { contactEmail: { contains: state.q, mode: "insensitive" } },
              { contactPhone: { contains: state.q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        _count: { select: { passengers: true } },
        contactEmail: true,
        contactName: true,
        contactPhone: true,
        customerCode: true,
        id: true,
        isActive: true,
        name: true,
        notes: true,
      },
      take: 100,
    }),
    prisma.passenger.findMany({
      where: state.q
        ? {
            OR: [
              { firstName: { contains: state.q, mode: "insensitive" } },
              { lastName: { contains: state.q, mode: "insensitive" } },
              { email: { contains: state.q, mode: "insensitive" } },
              { phone: { contains: state.q, mode: "insensitive" } },
              { idDocumentNumber: { contains: state.q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        _count: { select: { customers: true, manifestItems: true } },
        email: true,
        firstName: true,
        id: true,
        idDocumentExpiresAt: true,
        idDocumentNumber: true,
        idDocumentType: true,
        identityDocuments: {
          where: { deletedAt: null },
          select: { id: true },
          take: 1,
        },
        lastName: true,
        middleName: true,
        phone: true,
      },
      take: 100,
    }),
    state.customer
      ? prisma.customer.findUnique({
          where: { id: state.customer },
          select: {
            contactEmail: true,
            contactName: true,
            contactPhone: true,
            customerCode: true,
            id: true,
            isActive: true,
            name: true,
            notes: true,
            passengers: {
              orderBy: { passenger: { lastName: "asc" } },
              select: {
                notes: true,
                passenger: {
                  select: {
                    email: true,
                    firstName: true,
                    id: true,
                    lastName: true,
                    middleName: true,
                    phone: true,
                  },
                },
                relationship: true,
              },
            },
          },
        })
      : null,
    state.passenger
      ? prisma.passenger.findUnique({
          where: { id: state.passenger },
          select: {
            customers: {
              orderBy: { customer: { name: "asc" } },
              select: {
                customer: {
                  select: {
                    customerCode: true,
                    id: true,
                    name: true,
                  },
                },
                relationship: true,
              },
            },
            dateOfBirth: true,
            email: true,
            firstName: true,
            id: true,
            idDocumentExpiresAt: true,
            idDocumentNumber: true,
            idDocumentType: true,
            idIssuingCountry: true,
            idIssuingState: true,
            identityDocuments: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
              select: {
                createdAt: true,
                id: true,
              },
              take: 1,
            },
            lastName: true,
            middleName: true,
            notes: true,
            phone: true,
            serviceProfile: {
              select: {
                aviationInterest: true,
                beveragePreferences: true,
                cabinComfortNotes: true,
                cateringAvoidances: true,
                cateringPreferences: true,
                conversationPreference: true,
                flightDeckInteractionNotes: true,
                serviceNotes: true,
                temperaturePreference: true,
              },
            },
          },
        })
      : null,
  ]);

  const visibleRows = state.view === "passengers" ? passengers.length : customers.length;
  const unlinkedPassengers = selectedCustomer
    ? passengers.filter(
        (passenger) =>
          !selectedCustomer.passengers.some((link) => link.passenger.id === passenger.id),
      )
    : passengers;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <header className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[minmax(14rem,0.7fr)_minmax(30rem,1.5fr)_auto] xl:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Customer Workspace
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Customers</h1>
              <p className="mt-1 text-xs text-zinc-600">
                Search booking accounts and reusable passenger records for manifest work.
              </p>
            </div>

            <form action="/customers" className="grid gap-2 sm:grid-cols-[auto_1fr_auto_auto] sm:items-end">
              <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                <Link
                  className={
                    state.view === "customers"
                      ? "rounded-lg bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold text-white"
                      : "rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-white"
                  }
                  href={customersHref(state, {
                    customer: null,
                    panel: null,
                    passenger: null,
                    view: "customers",
                  })}
                >
                  Customers
                </Link>
                <Link
                  className={
                    state.view === "passengers"
                      ? "rounded-lg bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold text-white"
                      : "rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-white"
                  }
                  href={customersHref(state, {
                    customer: null,
                    panel: null,
                    passenger: null,
                    view: "passengers",
                  })}
                >
                  Passengers
                </Link>
              </div>
              {state.view === "passengers" ? <input name="view" type="hidden" value="passengers" /> : null}
              <label className="min-w-0 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                Search
                <input
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
                  defaultValue={state.q}
                  name="q"
                  placeholder="Name, code, contact, or ID"
                />
              </label>
              <button className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white" type="submit">
                Search
              </button>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                href={customersHref(state, {
                  customer: null,
                  panel: null,
                  passenger: null,
                  q: "",
                })}
              >
                Reset
              </Link>
            </form>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Link
                className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                href={customersHref(state, {
                  customer: null,
                  panel: "new-customer",
                  passenger: null,
                  view: "customers",
                })}
              >
                New customer
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href={customersHref(state, {
                  customer: null,
                  panel: "new-passenger",
                  passenger: null,
                  view: "passengers",
                })}
              >
                New passenger
              </Link>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {displayError(error)}
          </div>
        ) : null}

        <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                {state.view === "passengers" ? "Passenger records" : "Customer records"}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Showing {visibleRows} row{visibleRows === 1 ? "" : "s"}
                {state.q ? ` for "${state.q}"` : ""}.
              </p>
            </div>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
              Drawer-first
            </span>
          </div>

          {state.view === "customers" ? (
            customers.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-medium">No customers found.</p>
                <p className="mt-1">Adjust the search or create a customer from the toolbar.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {customers.map((customer) => {
                  const contact = contactLine(customer);

                  return (
                    <Link
                      className="group block rounded-md px-3 py-3 transition hover:bg-sky-50"
                      href={customersHref(state, {
                        customer: customer.id,
                        panel: null,
                        passenger: null,
                        view: "customers",
                      })}
                      key={customer.id}
                    >
                      <article className="grid gap-3 lg:grid-cols-[minmax(15rem,1.1fr)_minmax(16rem,1fr)_minmax(11rem,0.7fr)_minmax(10rem,0.6fr)] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-zinc-950 group-hover:text-sky-900">
                              {customer.name}
                            </span>
                            <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-600">
                              {customer.customerCode ?? "No code"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">
                            {customer.notes ? "Notes on file" : "No notes"}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-800">{contact.primary}</p>
                          {contact.secondary ? (
                            <p className="mt-1 truncate text-xs text-zinc-500">{contact.secondary}</p>
                          ) : (
                            <p className="mt-1 text-xs text-zinc-500">Contact details incomplete</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              customer.isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-zinc-200 bg-zinc-50 text-zinc-600"
                            }`}
                          >
                            {customer.isActive ? "Active" : "Inactive"}
                          </span>
                          {customer.notes ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              Notes
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                          <span>
                            {customer._count.passengers} linked passenger
                            {customer._count.passengers === 1 ? "" : "s"}
                          </span>
                          <span className="font-semibold text-sky-700 group-hover:text-sky-900">Open</span>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            )
          ) : passengers.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">No passengers found.</p>
              <p className="mt-1">Adjust the search or create a passenger from the toolbar.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {passengers.map((passenger) => {
                const contact = contactLine(passenger);
                const idStatus = idDocumentStatus(passenger);

                return (
                  <Link
                    className="group block rounded-md px-3 py-3 transition hover:bg-sky-50"
                    href={customersHref(state, {
                      customer: null,
                      panel: null,
                      passenger: passenger.id,
                      view: "passengers",
                    })}
                    key={passenger.id}
                  >
                    <article className="grid gap-3 lg:grid-cols-[minmax(15rem,1.1fr)_minmax(16rem,1fr)_minmax(11rem,0.7fr)_minmax(10rem,0.6fr)] lg:items-center">
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-950 group-hover:text-sky-900">
                          {fullName(passenger)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {passenger._count.manifestItems} manifest item
                          {passenger._count.manifestItems === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-800">{contact.primary}</p>
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {passenger.email && passenger.phone
                            ? `${passenger.email} | ${passenger.phone}`
                            : "Contact details incomplete"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${idStatus.className}`}>
                          {idStatus.label}
                        </span>
                        {passenger.idDocumentType ? (
                          <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-600">
                            {formatEnum(passenger.idDocumentType)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                        <span>
                          {passenger._count.customers} customer link
                          {passenger._count.customers === 1 ? "" : "s"}
                        </span>
                        <span className="font-semibold text-sky-700 group-hover:text-sky-900">Open</span>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {state.panel === "new-customer" ? (
          <ContextDrawer closeHref={closeHref} eyebrow="Customer workflow" size="wide" title="New customer">
            <CustomerForm
              action={createCustomerAction}
              returnTo={customersHref(state)}
              submitLabel="Create customer"
            />
          </ContextDrawer>
        ) : null}

        {state.panel === "new-passenger" ? (
          <ContextDrawer closeHref={closeHref} eyebrow="Passenger workflow" size="wide" title="New passenger">
            <PassengerForm
              action={createPassengerAction}
              returnTo={customersHref(state)}
              submitLabel="Create passenger"
            />
          </ContextDrawer>
        ) : null}

        {selectedCustomer ? (
          <ContextDrawer
            closeHref={closeHref}
            eyebrow="Customer workspace"
            size="wide"
            title={selectedCustomer.name}
          >
            <div className="space-y-4">
              <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      selectedCustomer.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-zinc-200 bg-white text-zinc-600"
                    }`}
                  >
                    {selectedCustomer.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    {selectedCustomer.customerCode ?? "No code"}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    {selectedCustomer.passengers.length} linked passenger
                    {selectedCustomer.passengers.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
                  <p>Contact: {selectedCustomer.contactName ?? "Not set"}</p>
                  <p>Email: {selectedCustomer.contactEmail ?? "Not set"}</p>
                  <p>Phone: {selectedCustomer.contactPhone ?? "Not set"}</p>
                  <p>Notes: {selectedCustomer.notes ? "On file" : "None"}</p>
                </div>
                {selectedCustomer.notes ? (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
                    {selectedCustomer.notes}
                  </p>
                ) : null}
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Edit profile
                </h3>
                <div className="mt-2">
                  <CustomerForm
                    action={updateCustomerAction.bind(null, selectedCustomer.id)}
                    customer={selectedCustomer}
                    returnTo={customersHref(state)}
                    submitLabel="Save customer"
                  />
                </div>
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Linked passengers
                </h3>
                <div className="mt-3 space-y-2">
                  {selectedCustomer.passengers.length === 0 ? (
                    <p className="text-sm text-zinc-600">No linked passengers.</p>
                  ) : (
                    selectedCustomer.passengers.map((link) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm"
                        key={link.passenger.id}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-950">{fullName(link.passenger)}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {link.relationship ?? "Passenger"} | {link.passenger.email ?? link.passenger.phone ?? "No contact"}
                          </p>
                        </div>
                        <form action={unlinkPassengerFromCustomerAction.bind(null, selectedCustomer.id, link.passenger.id)}>
                          <input name="returnTo" type="hidden" value={customersHref(state)} />
                          <button className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold" type="submit">
                            Unlink
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Link existing passenger
                </h3>
                <form
                  action={linkPassengerToCustomerAction.bind(null, selectedCustomer.id)}
                  className="mt-3 grid gap-3 md:grid-cols-[1fr_12rem_auto]"
                >
                  <input name="returnTo" type="hidden" value={customersHref(state)} />
                  <select className="rounded-md border border-zinc-300 px-3 py-2 text-sm" name="passengerId" required>
                    <option value="">Select passenger</option>
                    {unlinkedPassengers.map((passenger) => (
                      <option key={passenger.id} value={passenger.id}>
                        {fullName(passenger)}
                      </option>
                    ))}
                  </select>
                  <input className="rounded-md border border-zinc-300 px-3 py-2 text-sm" name="relationship" placeholder="Relationship" />
                  <button className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white" type="submit">
                    Link
                  </button>
                </form>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Create passenger for customer
                </h3>
                <div className="mt-2">
                  <PassengerForm
                    action={createPassengerAction}
                    customerId={selectedCustomer.id}
                    returnTo={customersHref(state)}
                    submitLabel="Create and link passenger"
                  />
                </div>
              </section>
            </div>
          </ContextDrawer>
        ) : null}

        {selectedPassenger ? (
          <ContextDrawer
            closeHref={closeHref}
            eyebrow="Passenger workspace"
            size="wide"
            title={fullName(selectedPassenger)}
          >
            <div className="space-y-4">
              <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${idDocumentStatus(selectedPassenger).className}`}>
                    {idDocumentStatus(selectedPassenger).label}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    {selectedPassenger.customers.length} customer link
                    {selectedPassenger.customers.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
                  <p>Email: {selectedPassenger.email ?? "Not set"}</p>
                  <p>Phone: {selectedPassenger.phone ?? "Not set"}</p>
                  <p>Date of birth: {toDate(selectedPassenger.dateOfBirth)}</p>
                  <p>Notes: {selectedPassenger.notes ? "On file" : "None"}</p>
                </div>
                {selectedPassenger.notes ? (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
                    {selectedPassenger.notes}
                  </p>
                ) : null}
              </section>

              <PassengerServiceProfileSnapshot profile={selectedPassenger.serviceProfile} />

              <section className="rounded-xl border border-zinc-200 bg-white p-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Customer links
                </h3>
                <div className="mt-3 space-y-2 text-sm">
                  {selectedPassenger.customers.length === 0 ? (
                    <p className="text-zinc-600">No customer links.</p>
                  ) : (
                    selectedPassenger.customers.map((link) => (
                      <Link
                        className="block rounded-md border border-zinc-200 bg-zinc-50 p-2 hover:bg-sky-50"
                        href={customersHref(state, {
                          customer: link.customer.id,
                          panel: null,
                          passenger: null,
                          view: "customers",
                        })}
                        key={link.customer.id}
                      >
                        <span className="font-medium text-zinc-950">{link.customer.name}</span>
                        <span className="ml-2 text-xs text-zinc-500">
                          {link.customer.customerCode ?? "No code"} | {link.relationship ?? "Passenger"}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  ID details
                </h3>
                <div className="mt-3 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
                  <p>Type: {formatEnum(selectedPassenger.idDocumentType)}</p>
                  <p>Number: {selectedPassenger.idDocumentNumber ?? "Not set"}</p>
                  <p>Country: {selectedPassenger.idIssuingCountry ?? "Not set"}</p>
                  <p>State: {selectedPassenger.idIssuingState ?? "Not set"}</p>
                  <p>Expiration: {toDate(selectedPassenger.idDocumentExpiresAt)}</p>
                </div>
                <div className="mt-3">
                  <PassengerIdentityDocumentCapture
                    deleteUrl={`/customers/passengers/${selectedPassenger.id}/identity-document`}
                    hasDocument={selectedPassenger.identityDocuments.length > 0}
                    initialMetadata={{
                      idDocumentExpiresAt: toDateInput(selectedPassenger.idDocumentExpiresAt),
                      idDocumentNumber: selectedPassenger.idDocumentNumber ?? "",
                      idDocumentType: selectedPassenger.idDocumentType ?? "",
                      idIssuingCountry: selectedPassenger.idIssuingCountry ?? "",
                      idIssuingState: selectedPassenger.idIssuingState ?? "",
                    }}
                    passengerName={fullName(selectedPassenger)}
                    uploadUrl={`/customers/passengers/${selectedPassenger.id}/identity-document`}
                    viewUrl={`/customers/passengers/${selectedPassenger.id}/identity-document`}
                  />
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Edit passenger
                </h3>
                <div className="mt-2">
                  <PassengerForm
                    action={updatePassengerAction.bind(null, selectedPassenger.id)}
                    passenger={selectedPassenger}
                    returnTo={customersHref(state)}
                    submitLabel="Save passenger"
                  />
                </div>
              </section>
            </div>
          </ContextDrawer>
        ) : null}
      </div>
    </main>
  );
}
