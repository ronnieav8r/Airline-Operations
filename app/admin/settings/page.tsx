import { AuthorityStatus, OperatingPart, OperatorManifestMode, UserRole } from "@prisma/client";

import {
  updateCrewComplianceRuleAction,
  updateOperatorOperatingAuthoritiesAction,
  updateOperatorFuelSettingAction,
  updateOperatorReleaseSettingAction,
} from "@/app/admin/settings/actions";
import { DEFAULT_JET_A_DENSITY_LBS_PER_GALLON } from "@/lib/fuel";
import { DEFAULT_OPERATOR_RELEASE_SETTING } from "@/lib/flight-workflow";
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

function formatEnum(value: string | null): string {
  if (!value) {
    return "Shared";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  await requireRole([UserRole.ADMIN]);
  const params = await searchParams;
  const error = firstParam(params.error);
  const [operators, crewComplianceRules] = await Promise.all([
    prisma.operator.findMany({
      orderBy: { code: "asc" },
      select: {
        code: true,
        operatingAuthorities: {
          select: {
            displayName: true,
            operatingPart: true,
            status: true,
          },
        },
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
        releaseSetting: {
          select: {
            dispatcherEnabled: true,
            manifestMode: true,
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
    }),
    prisma.crewComplianceRule.findMany({
      orderBy: [{ operatingPart: "asc" }, { requirementType: "asc" }, { ruleKey: "asc" }],
      select: {
        active: true,
        applicabilitySummary: true,
        calculationKind: true,
        graceMonthsAfter: true,
        graceMonthsBefore: true,
        id: true,
        intervalMonths: true,
        operatingPart: true,
        regulationPart: true,
        requirementType: true,
        ruleKey: true,
        sourceCitation: true,
        sourceUrl: true,
        title: true,
        warningLeadDays: true,
      },
    }),
  ]);

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
          <p className="rounded-xl border status-surface-stop p-3 text-sm">
            {decodeURIComponent(error)}
          </p>
        ) : null}

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm" id="operating-authorities">
          <div>
            <h2 className="text-lg font-semibold">Operating parts for crew compliance</h2>
            <p className="mt-1 max-w-3xl text-sm text-zinc-600">
              Select which operating parts apply to each operator. Crew compliance warnings use shared
              medical rules plus rules for active operating parts only.
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {operators.map((operator) => {
              const action = updateOperatorOperatingAuthoritiesAction.bind(null, operator.id);
              const activeParts = new Set(
                operator.operatingAuthorities
                  .filter((authority) => authority.status === AuthorityStatus.ACTIVE)
                  .map((authority) => authority.operatingPart),
              );

              return (
                <form action={action} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3" key={operator.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-zinc-950">
                        {operator.name} <span className="font-mono text-sm text-zinc-500">{operator.code}</span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Use this to suppress irrelevant Part 91, 91K, or 135 warning sets.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {Object.values(OperatingPart).map((operatingPart) => (
                        <label
                          className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700"
                          key={operatingPart}
                        >
                          <input
                            className="h-4 w-4"
                            defaultChecked={activeParts.has(operatingPart)}
                            name={operatingPart}
                            type="checkbox"
                          />
                          {formatEnum(operatingPart)}
                        </label>
                      ))}
                      <button
                        className="h-9 rounded-md bg-zinc-950 px-3 text-xs font-semibold text-white hover:bg-zinc-800"
                        type="submit"
                      >
                        Save parts
                      </button>
                    </div>
                  </div>
                </form>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm" id="crew-compliance-rules">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Crew compliance rules</h2>
              <p className="mt-1 max-w-3xl text-sm text-zinc-600">
                These rules drive warning-only crew compliance calculations. They are not legal signoff
                and should be tightened against operator manuals, OpSpecs, and approved training programs.
              </p>
            </div>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
              {crewComplianceRules.length} rules
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {crewComplianceRules.length === 0 ? (
              <p className="rounded-md border status-surface-caution p-3 text-sm">
                No crew compliance rules are seeded yet. Run the crew compliance rule backfill after migrations.
              </p>
            ) : (
              crewComplianceRules.map((rule) => {
                const action = updateCrewComplianceRuleAction.bind(null, rule.id);

                return (
                  <form
                    action={action}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                    key={rule.id}
                  >
                    <div className="grid gap-3 xl:grid-cols-[minmax(18rem,1fr)_repeat(4,minmax(7rem,8rem))_auto] xl:items-end">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-zinc-950">{rule.title}</p>
                          <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-600">
                            {formatEnum(rule.operatingPart)}
                          </span>
                          <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-600">
                            {formatEnum(rule.requirementType)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {rule.ruleKey} | {formatEnum(rule.calculationKind)}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          {rule.applicabilitySummary ?? "No applicability summary."}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {rule.sourceUrl ? (
                            <a className="font-semibold text-sky-700 hover:text-sky-900" href={rule.sourceUrl}>
                              {rule.sourceCitation}
                            </a>
                          ) : (
                            rule.sourceCitation
                          )}
                        </p>
                      </div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Lead days
                        <input
                          className="mt-1 h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-950"
                          defaultValue={rule.warningLeadDays}
                          min={0}
                          name="warningLeadDays"
                          type="number"
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Interval mo.
                        <input
                          className="mt-1 h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-950"
                          defaultValue={rule.intervalMonths ?? ""}
                          min={0}
                          name="intervalMonths"
                          type="number"
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Grace before
                        <input
                          className="mt-1 h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-950"
                          defaultValue={rule.graceMonthsBefore}
                          min={0}
                          name="graceMonthsBefore"
                          type="number"
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Grace after
                        <input
                          className="mt-1 h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-950"
                          defaultValue={rule.graceMonthsAfter}
                          min={0}
                          name="graceMonthsAfter"
                          type="number"
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <label className="flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
                          <input
                            className="h-4 w-4"
                            defaultChecked={rule.active}
                            name="active"
                            type="checkbox"
                          />
                          Active
                        </label>
                        <button
                          className="h-9 rounded-md bg-zinc-950 px-3 text-xs font-semibold text-white hover:bg-zinc-800"
                          type="submit"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </form>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Release workflow</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Controls which items belong to Ops Release versus Preflight. Dispatcher support starts
            as a release-package toggle; dispatcher-assisted fuel and W&B remain future workflow.
          </p>
          <div className="mt-4 grid gap-3">
            {operators.map((operator) => {
              const action = updateOperatorReleaseSettingAction.bind(null, operator.id);
              const dispatcherEnabled =
                operator.releaseSetting?.dispatcherEnabled ??
                DEFAULT_OPERATOR_RELEASE_SETTING.dispatcherEnabled;
              const manifestMode =
                operator.releaseSetting?.manifestMode ??
                DEFAULT_OPERATOR_RELEASE_SETTING.manifestMode;

              return (
                <form
                  action={action}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                  key={operator.id}
                >
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
                    <div>
                      <p className="font-semibold text-zinc-950">
                        {operator.name} <span className="font-mono text-sm text-zinc-500">{operator.code}</span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {operator.isActive ? "Active" : "Inactive"} | Last updated{" "}
                        {operator.releaseSetting?.updatedAt.toLocaleString() ?? "never"}
                        {operator.releaseSetting?.updatedBy?.email
                          ? ` by ${operator.releaseSetting.updatedBy.email}`
                          : ""}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800">
                      <input
                        className="h-4 w-4"
                        defaultChecked={dispatcherEnabled}
                        name="dispatcherEnabled"
                        type="checkbox"
                      />
                      Dispatcher enabled
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Manifest
                      <select
                        className="mt-1 block w-48 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950"
                        defaultValue={manifestMode}
                        name="manifestMode"
                      >
                        <option value={OperatorManifestMode.PREFLIGHT_VERIFY}>Preflight verifies</option>
                        <option value={OperatorManifestMode.OPS_REQUIRED}>Ops release requires</option>
                        <option value={OperatorManifestMode.NOT_REQUIRED}>Not required</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                      type="submit"
                    >
                      Save release setting
                    </button>
                  </div>
                </form>
              );
            })}
          </div>
        </section>

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
