import {
  CrewLocationSource,
  CrewLogisticsNeedStatus,
  CrewLogisticsNeedType,
  UserRole,
} from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createCrewLocationRecordAction,
  createCrewLogisticsNeedAction,
  updateCrewLocationRecordAction,
  updateCrewLogisticsNeedAction,
} from "@/app/crew/[crewMemberId]/logistics/actions";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    crewMemberId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function toDateTime(value: Date | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
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

function SelectField({
  children,
  defaultValue,
  label,
  name,
  required = false,
}: {
  children: React.ReactNode;
  defaultValue?: string | null;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <select
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
        defaultValue={defaultValue ?? ""}
        name={name}
        required={required}
      >
        {children}
      </select>
    </label>
  );
}

function TextField({
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

async function getLogisticsPageData(crewMemberId: string) {
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 30);

  const [crewMember, stations, aircraft, flightLegs] = await Promise.all([
    prisma.crewMember.findUnique({
      where: { id: crewMemberId },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        locationRecords: {
          orderBy: [{ effectiveAt: "desc" }],
          take: 12,
          select: {
            id: true,
            effectiveAt: true,
            locationText: true,
            notes: true,
            source: true,
            stationId: true,
            station: {
              select: {
                code: true,
                city: true,
              },
            },
          },
        },
        logisticsNeeds: {
          orderBy: [{ neededBy: "asc" }, { createdAt: "desc" }],
          take: 20,
          select: {
            id: true,
            aircraftId: true,
            completedAt: true,
            confirmationNumber: true,
            flightLegId: true,
            fromStationId: true,
            needType: true,
            neededBy: true,
            notes: true,
            providerName: true,
            status: true,
            toStationId: true,
            aircraft: {
              select: {
                id: true,
                tailNumber: true,
              },
            },
            flightLeg: {
              select: {
                flightNumber: true,
                scheduledDeparture: true,
                departureStation: {
                  select: {
                    code: true,
                  },
                },
                arrivalStation: {
                  select: {
                    code: true,
                  },
                },
              },
            },
            fromStation: {
              select: {
                code: true,
              },
            },
            toStation: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    }),
    prisma.station.findMany({
      where: { isActive: true },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, city: true },
    }),
    prisma.aircraft.findMany({
      orderBy: [{ tailNumber: "asc" }],
      select: { id: true, tailNumber: true },
    }),
    prisma.flightLeg.findMany({
      where: {
        scheduledDeparture: {
          gte: now,
          lt: windowEnd,
        },
      },
      orderBy: [{ scheduledDeparture: "asc" }],
      take: 100,
      select: {
        id: true,
        flightNumber: true,
        scheduledDeparture: true,
        departureStation: { select: { code: true } },
        arrivalStation: { select: { code: true } },
      },
    }),
  ]);

  return { aircraft, crewMember, flightLegs, stations };
}

type LogisticsPageData = Awaited<ReturnType<typeof getLogisticsPageData>>;
type CrewMemberData = NonNullable<LogisticsPageData["crewMember"]>;
type LocationRecord = CrewMemberData["locationRecords"][number];
type LogisticsNeed = CrewMemberData["logisticsNeeds"][number];

function StationOptions({
  stations,
}: {
  stations: LogisticsPageData["stations"];
}) {
  return (
    <>
      <option value="">No station</option>
      {stations.map((station) => (
        <option key={station.id} value={station.id}>
          {station.code} - {station.city}
        </option>
      ))}
    </>
  );
}

function LocationForm({
  action,
  location,
  stations,
}: {
  action: (formData: FormData) => void;
  location?: LocationRecord;
  stations: LogisticsPageData["stations"];
}) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <SelectField defaultValue={location?.stationId} label="Station" name="stationId">
          <StationOptions stations={stations} />
        </SelectField>
        <TextField
          defaultValue={location?.locationText}
          label="Free-text location"
          name="locationText"
        />
        <SelectField
          defaultValue={location?.source ?? CrewLocationSource.MANUAL}
          label="Source"
          name="source"
          required
        >
          {Object.values(CrewLocationSource).map((source) => (
            <option key={source} value={source}>
              {formatStatus(source)}
            </option>
          ))}
        </SelectField>
        <TextField
          defaultValue={toInputDateTime(location?.effectiveAt)}
          label="Effective at"
          name="effectiveAt"
          type="datetime-local"
        />
      </div>
      <div className="mt-3">
        <TextAreaField defaultValue={location?.notes} label="Notes" name="notes" />
      </div>
      <button
        className="mt-4 rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
        type="submit"
      >
        {location ? "Save location record" : "Add location record"}
      </button>
    </form>
  );
}

function LogisticsNeedForm({
  action,
  aircraft,
  flightLegs,
  need,
  stations,
}: {
  action: (formData: FormData) => void;
  aircraft: LogisticsPageData["aircraft"];
  flightLegs: LogisticsPageData["flightLegs"];
  need?: LogisticsNeed;
  stations: LogisticsPageData["stations"];
}) {
  return (
    <form action={action} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <SelectField
          defaultValue={need?.needType ?? CrewLogisticsNeedType.POSITIONING}
          label="Need type"
          name="needType"
          required
        >
          {Object.values(CrewLogisticsNeedType).map((needType) => (
            <option key={needType} value={needType}>
              {formatStatus(needType)}
            </option>
          ))}
        </SelectField>
        <SelectField
          defaultValue={need?.status ?? CrewLogisticsNeedStatus.PLANNED}
          label="Status"
          name="status"
          required
        >
          {Object.values(CrewLogisticsNeedStatus).map((status) => (
            <option key={status} value={status}>
              {formatStatus(status)}
            </option>
          ))}
        </SelectField>
        <SelectField defaultValue={need?.fromStationId} label="From station" name="fromStationId">
          <StationOptions stations={stations} />
        </SelectField>
        <SelectField defaultValue={need?.toStationId} label="To station" name="toStationId">
          <StationOptions stations={stations} />
        </SelectField>
        <SelectField defaultValue={need?.aircraftId} label="Aircraft" name="aircraftId">
          <option value="">No aircraft link</option>
          {aircraft.map((item) => (
            <option key={item.id} value={item.id}>
              {item.tailNumber}
            </option>
          ))}
        </SelectField>
        <SelectField defaultValue={need?.flightLegId} label="FlightLeg" name="flightLegId">
          <option value="">No FlightLeg link</option>
          {flightLegs.map((flightLeg) => (
            <option key={flightLeg.id} value={flightLeg.id}>
              {flightLeg.flightNumber ?? "FlightLeg"} | {flightLeg.departureStation.code} -{" "}
              {flightLeg.arrivalStation.code} | {toDateTime(flightLeg.scheduledDeparture)}
            </option>
          ))}
        </SelectField>
        <TextField
          defaultValue={toInputDateTime(need?.neededBy)}
          label="Needed by"
          name="neededBy"
          type="datetime-local"
        />
        <TextField defaultValue={need?.providerName} label="Provider placeholder" name="providerName" />
        <TextField
          defaultValue={need?.confirmationNumber}
          label="Confirmation placeholder"
          name="confirmationNumber"
        />
      </div>
      <div className="mt-3">
        <TextAreaField defaultValue={need?.notes} label="Notes" name="notes" />
      </div>
      <button
        className="mt-4 rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
        type="submit"
      >
        {need ? "Save logistics need" : "Add logistics need"}
      </button>
    </form>
  );
}

export default async function CrewLogisticsPage({ params, searchParams }: PageProps) {
  await requireRole([UserRole.ADMIN, UserRole.OPS]);
  const [{ crewMemberId }, queryParams] = await Promise.all([params, searchParams]);
  const { aircraft, crewMember, flightLegs, stations } = await getLogisticsPageData(crewMemberId);

  if (!crewMember) {
    notFound();
  }

  const error = firstSearchParam(queryParams.error);
  const createLocationAction = createCrewLocationRecordAction.bind(null, crewMemberId);
  const createNeedAction = createCrewLogisticsNeedAction.bind(null, crewMemberId);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link className="text-sm font-semibold text-sky-700 hover:text-sky-900" href={`/crew/${crewMember.id}`}>
                Back to crew detail
              </Link>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Crew Logistics
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                {crewMember.firstName} {crewMember.lastName}
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                #{crewMember.employeeNumber} | location and travel-support planning context.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/crew/scheduling"
              >
                Crew planner
              </Link>
              <Link
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                href="/aircraft"
              >
                Aircraft
              </Link>
            </div>
          </div>
        </header>

        {error ? (
          <section className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {decodeURIComponent(error)}
          </section>
        ) : null}

        <section className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          Logistics records are coordination placeholders only. They do not book travel,
          create expenses, publish schedules, assign aircraft crew, enforce duty/rest, or
          affect release behavior.
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Add location record</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Record where the crew member appears to be or where they reported being.
            </p>
            <div className="mt-4">
              <LocationForm action={createLocationAction} stations={stations} />
            </div>
          </div>

          <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Add logistics need</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Track a positioning, deadhead, ticket, hotel, or ground transport need.
            </p>
            <div className="mt-4">
              <LogisticsNeedForm
                action={createNeedAction}
                aircraft={aircraft}
                flightLegs={flightLegs}
                stations={stations}
              />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Location records</h2>
          {crewMember.locationRecords.length === 0 ? (
            <p className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              No location records yet.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {crewMember.locationRecords.map((location) => {
                const updateAction = updateCrewLocationRecordAction.bind(
                  null,
                  crewMemberId,
                  location.id,
                );

                return (
                  <details className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={location.id}>
                    <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
                      {location.station
                        ? `${location.station.code} - ${location.station.city}`
                        : location.locationText ?? "Location not specified"}{" "}
                      | {formatStatus(location.source)} | {toDateTime(location.effectiveAt)}
                    </summary>
                    <div className="mt-3">
                      <LocationForm action={updateAction} location={location} stations={stations} />
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Logistics needs</h2>
          {crewMember.logisticsNeeds.length === 0 ? (
            <p className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              No logistics needs yet.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {crewMember.logisticsNeeds.map((need) => {
                const updateAction = updateCrewLogisticsNeedAction.bind(
                  null,
                  crewMemberId,
                  need.id,
                );

                return (
                  <details className="rounded-md border border-zinc-200 bg-zinc-50 p-3" key={need.id}>
                    <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
                      {formatStatus(need.needType)} | {formatStatus(need.status)} |{" "}
                      {need.fromStation?.code ?? "Origin TBD"} - {need.toStation?.code ?? "Destination TBD"}
                      {need.neededBy ? ` | needed ${toDateTime(need.neededBy)}` : ""}
                    </summary>
                    <div className="mt-2 text-xs text-zinc-500">
                      {need.aircraft ? `Aircraft ${need.aircraft.tailNumber}` : "No aircraft link"}
                      {need.flightLeg
                        ? ` | ${need.flightLeg.flightNumber ?? "FlightLeg"} ${need.flightLeg.departureStation.code}-${need.flightLeg.arrivalStation.code}`
                        : ""}
                      {need.completedAt ? ` | completed ${toDateTime(need.completedAt)}` : ""}
                    </div>
                    <div className="mt-3">
                      <LogisticsNeedForm
                        action={updateAction}
                        aircraft={aircraft}
                        flightLegs={flightLegs}
                        need={need}
                        stations={stations}
                      />
                    </div>
                    {need.aircraft ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <Link className="text-sky-700 hover:text-sky-900" href={`/aircraft/${need.aircraft.id}`}>
                          Aircraft context
                        </Link>
                        <Link
                          className="text-sky-700 hover:text-sky-900"
                          href={`/aircraft/${need.aircraft.id}/crew`}
                        >
                          Aircraft crew
                        </Link>
                        <Link
                          className="text-sky-700 hover:text-sky-900"
                          href={`/crew/scheduling?aircraft=${need.aircraft.id}&assignment=assigned`}
                        >
                          Planner filter
                        </Link>
                      </div>
                    ) : null}
                  </details>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
