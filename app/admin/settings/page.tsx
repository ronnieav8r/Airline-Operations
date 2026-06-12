import { UserRole } from "@prisma/client";

import { updateOperatorFuelSettingAction } from "@/app/admin/settings/actions";
import { DEFAULT_JET_A_DENSITY_LBS_PER_GALLON } from "@/lib/fuel";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  await requireRole([UserRole.ADMIN]);
  const params = await searchParams;
  const error = firstParam(params.error);
  const operators = await prisma.operator.findMany({
    orderBy: { code: "asc" },
    select: {
      code: true,
      fuelSetting: {
        select: {
          defaultJetAFuelDensityLbsPerGallon: true,
          updatedAt: true,
          updatedBy: {
            select: {
              email: true,
            },
          },
        },
      },
      id: true,
      isActive: true,
      name: true,
    },
  });

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Admin Settings
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Operator Settings</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            MVP settings are intentionally narrow. Jet A density controls approximate gallon
            conversion for fuel events; crews still enter fuel in pounds.
          </p>
        </section>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {decodeURIComponent(error)}
          </p>
        ) : null}

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Fuel conversion</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Default Jet A density starts at {DEFAULT_JET_A_DENSITY_LBS_PER_GALLON} lb/gal.
            Every fuel event stores the density used, so historical approximate gallons remain
            stable if this setting changes.
          </p>
          <div className="mt-4 grid gap-3">
            {operators.map((operator) => {
              const action = updateOperatorFuelSettingAction.bind(null, operator.id);
              const density =
                operator.fuelSetting?.defaultJetAFuelDensityLbsPerGallon.toString() ??
                DEFAULT_JET_A_DENSITY_LBS_PER_GALLON;

              return (
                <form
                  action={action}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                  key={operator.id}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="font-semibold text-zinc-950">
                        {operator.name} <span className="font-mono text-sm text-zinc-500">{operator.code}</span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {operator.isActive ? "Active" : "Inactive"} | Last updated{" "}
                        {operator.fuelSetting?.updatedAt.toLocaleString() ?? "never"}
                        {operator.fuelSetting?.updatedBy?.email
                          ? ` by ${operator.fuelSetting.updatedBy.email}`
                          : ""}
                      </p>
                    </div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Jet A lb/gal
                      <input
                        className="mt-1 w-40 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
                        defaultValue={density}
                        name="defaultJetAFuelDensityLbsPerGallon"
                        step="0.001"
                        type="number"
                      />
                    </label>
                    <button
                      className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                      type="submit"
                    >
                      Save fuel setting
                    </button>
                  </div>
                </form>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
