import { IdDocumentType } from "@prisma/client";
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
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    customer?: string | string[];
    error?: string | string[];
    passenger?: string | string[];
    q?: string | string[];
    view?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toDateInput(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

function fullName(passenger: { firstName: string; lastName: string; middleName?: string | null }) {
  return [passenger.firstName, passenger.middleName, passenger.lastName].filter(Boolean).join(" ");
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

function CustomerForm({
  action,
  customer,
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
  submitLabel: string;
}) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
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
  };
  submitLabel: string;
}) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
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
                {type.replaceAll("_", " ")}
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
  const query = firstParam(params.q) ?? "";
  const view = firstParam(params.view) === "passengers" ? "passengers" : "customers";
  const selectedCustomerId = firstParam(params.customer);
  const selectedPassengerId = firstParam(params.passenger);
  const error = firstParam(params.error);

  const [customers, passengers, selectedCustomer, selectedPassenger] = await Promise.all([
    prisma.customer.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { customerCode: { contains: query, mode: "insensitive" } },
              { contactName: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        _count: { select: { passengers: true } },
        contactName: true,
        customerCode: true,
        id: true,
        isActive: true,
        name: true,
      },
      take: 100,
    }),
    prisma.passenger.findMany({
      where: query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { idDocumentNumber: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        _count: { select: { customers: true, manifestItems: true } },
        email: true,
        firstName: true,
        id: true,
        idDocumentType: true,
        lastName: true,
        middleName: true,
        phone: true,
      },
      take: 100,
    }),
    selectedCustomerId
      ? prisma.customer.findUnique({
          where: { id: selectedCustomerId },
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
    selectedPassengerId
      ? prisma.passenger.findUnique({
          where: { id: selectedPassengerId },
          select: {
            customers: {
              select: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
            lastName: true,
            middleName: true,
            notes: true,
            phone: true,
          },
        })
      : null,
  ]);

  const unlinkedPassengers =
    selectedCustomer?.passengers.length || selectedCustomer
      ? passengers.filter(
          (passenger) =>
            !selectedCustomer?.passengers.some((link) => link.passenger.id === passenger.id),
        )
      : passengers;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <header className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Customer Directory
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Customers</h1>
              <p className="mt-1 text-sm text-zinc-600">
                Manage booking customers and reusable passenger records for manifests.
              </p>
            </div>
            <form className="flex flex-wrap gap-2">
              <input
                className="w-72 rounded-md border border-zinc-300 px-3 py-2 text-sm"
                defaultValue={query}
                name="q"
                placeholder="Search customers or passengers"
              />
              {view === "passengers" ? <input name="view" type="hidden" value="passengers" /> : null}
              <button className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white" type="submit">
                Search
              </button>
              <Link className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold" href="/customers">
                Reset
              </Link>
            </form>
          </div>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === "customers" ? "bg-zinc-950 text-white" : "border border-zinc-300 bg-white text-zinc-700"}`}
            href="/customers"
          >
            Customers
          </Link>
          <Link
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === "passengers" ? "bg-zinc-950 text-white" : "border border-zinc-300 bg-white text-zinc-700"}`}
            href="/customers?view=passengers"
          >
            Passengers
          </Link>
        </div>

        {view === "customers" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.4fr)]">
            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">New customer</h2>
              <div className="mt-3">
                <CustomerForm action={createCustomerAction} submitLabel="Create customer" />
              </div>
            </section>
            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Customer records</h2>
              <div className="mt-3 divide-y divide-zinc-200">
                {customers.map((customer) => (
                  <Link
                    className="grid gap-2 py-3 text-sm hover:bg-zinc-50 md:grid-cols-[1fr_auto_auto]"
                    href={`/customers?customer=${customer.id}`}
                    key={customer.id}
                  >
                    <span>
                      <span className="font-medium text-zinc-950">{customer.name}</span>
                      <span className="ml-2 text-zinc-500">{customer.customerCode ?? "No code"}</span>
                    </span>
                    <span className="text-zinc-600">{customer.contactName ?? "No contact"}</span>
                    <span className="text-zinc-600">{customer._count.passengers} passenger(s)</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.4fr)]">
            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">New passenger</h2>
              <div className="mt-3">
                <PassengerForm action={createPassengerAction} submitLabel="Create passenger" />
              </div>
            </section>
            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Passenger records</h2>
              <div className="mt-3 divide-y divide-zinc-200">
                {passengers.map((passenger) => (
                  <Link
                    className="grid gap-2 py-3 text-sm hover:bg-zinc-50 md:grid-cols-[1fr_auto_auto]"
                    href={`/customers?view=passengers&passenger=${passenger.id}`}
                    key={passenger.id}
                  >
                    <span className="font-medium text-zinc-950">{fullName(passenger)}</span>
                    <span className="text-zinc-600">{passenger.email ?? passenger.phone ?? "No contact"}</span>
                    <span className="text-zinc-600">{passenger._count.customers} customer link(s)</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}

        {selectedCustomer ? (
          <ContextDrawer closeHref="/customers" eyebrow="Customer" size="wide" title={selectedCustomer.name}>
            <div className="space-y-4">
              <section>
                <h2 className="text-lg font-semibold">Customer details</h2>
                <div className="mt-3">
                  <CustomerForm
                    action={updateCustomerAction.bind(null, selectedCustomer.id)}
                    customer={selectedCustomer}
                    submitLabel="Save customer"
                  />
                </div>
              </section>
              <section className="rounded-md border border-zinc-200 bg-white p-3">
                <h2 className="text-lg font-semibold">Linked passengers</h2>
                <div className="mt-3 space-y-2">
                  {selectedCustomer.passengers.length === 0 ? (
                    <p className="text-sm text-zinc-600">No linked passengers.</p>
                  ) : (
                    selectedCustomer.passengers.map((link) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm"
                        key={link.passenger.id}
                      >
                        <span>
                          <span className="font-medium">{fullName(link.passenger)}</span>
                          <span className="ml-2 text-zinc-500">{link.relationship ?? "Passenger"}</span>
                        </span>
                        <form action={unlinkPassengerFromCustomerAction.bind(null, selectedCustomer.id, link.passenger.id)}>
                          <button className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold" type="submit">
                            Unlink
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                </div>
              </section>
              <section className="rounded-md border border-zinc-200 bg-white p-3">
                <h2 className="text-lg font-semibold">Link existing passenger</h2>
                <form action={linkPassengerToCustomerAction.bind(null, selectedCustomer.id)} className="mt-3 grid gap-3 md:grid-cols-[1fr_12rem_auto]">
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
                <h2 className="text-lg font-semibold">Create passenger for this customer</h2>
                <div className="mt-3">
                  <PassengerForm
                    action={createPassengerAction}
                    customerId={selectedCustomer.id}
                    submitLabel="Create and link passenger"
                  />
                </div>
              </section>
            </div>
          </ContextDrawer>
        ) : null}

        {selectedPassenger ? (
          <ContextDrawer
            closeHref="/customers?view=passengers"
            eyebrow="Passenger"
            size="wide"
            title={fullName(selectedPassenger)}
          >
            <div className="space-y-4">
              <PassengerForm
                action={updatePassengerAction.bind(null, selectedPassenger.id)}
                passenger={selectedPassenger}
                submitLabel="Save passenger"
              />
              <section className="rounded-md border border-zinc-200 bg-white p-3">
                <h2 className="text-lg font-semibold">Customer links</h2>
                <div className="mt-3 space-y-2 text-sm">
                  {selectedPassenger.customers.length === 0 ? (
                    <p className="text-zinc-600">No customer links.</p>
                  ) : (
                    selectedPassenger.customers.map((link) => (
                      <Link
                        className="block rounded-md border border-zinc-200 bg-zinc-50 p-2 font-medium"
                        href={`/customers?customer=${link.customer.id}`}
                        key={link.customer.id}
                      >
                        {link.customer.name}
                      </Link>
                    ))
                  )}
                </div>
              </section>
            </div>
          </ContextDrawer>
        ) : null}
      </div>
    </main>
  );
}
