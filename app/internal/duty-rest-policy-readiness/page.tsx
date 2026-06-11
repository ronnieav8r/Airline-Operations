import {
  DutyRestPolicyAuthorityRow,
  getDutyRestPolicyReadinessReport,
} from "@/lib/duty-rest-policy-readiness";

export const dynamic = "force-dynamic";

function toDateTimeLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function statusClasses(issueCount: number): string {
  if (issueCount === 0) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}

function AuthorityRow({ row }: { row: DutyRestPolicyAuthorityRow }) {
  return (
    <tr className="border-b border-zinc-100 align-top">
      <td className="px-3 py-2.5">
        <p className="font-medium text-zinc-900">{row.authorityName}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {row.operatorCode} | {row.operatingPart}
        </p>
      </td>
      <td className="px-3 py-2.5 text-zinc-700">
        <p>{row.profileName ?? "Missing"}</p>
        <p className="mt-1 font-mono text-xs text-zinc-400">{row.profileKey}</p>
      </td>
      <td className="px-3 py-2.5 text-zinc-700">
        <p>{row.operationKind.replaceAll("_", " ")}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Enforcement: {row.enforcementMode?.replaceAll("_", " ") ?? "Missing"}
        </p>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700">
        {row.enabledRuleCount} / {row.expectedRuleCount}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700">
        {row.warningRuleCount} warn / {row.infoRuleCount} info
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700">
        {row.externalFlyingRuleCount} external / {row.requiresOperatorReviewCount} review
      </td>
      <td className="px-3 py-2.5">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
            row.issueCount,
          )}`}
        >
          {row.issueCount === 0 ? "READY" : "ISSUES"}
        </span>
      </td>
      <td className="min-w-80 px-3 py-2.5 text-zinc-700">
        {row.missingRuleKeys.length === 0 ? (
          <span className="text-zinc-500">No missing default rules.</span>
        ) : (
          <ul className="space-y-1">
            {row.missingRuleKeys.map((ruleKey) => (
              <li key={ruleKey} className="font-mono text-xs">
                {ruleKey}
              </li>
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}

export default async function DutyRestPolicyReadinessPage() {
  const report = await getDutyRestPolicyReadinessReport();

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Internal Diagnostic
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Duty/Rest Policy Readiness
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600">
            Checks whether each operating authority has warning-only duty/rest
            policy settings and report-derived default rule settings. This does
            not enforce schedules, crew assignments, or releases.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Generated {toDateTimeLabel(report.generatedAt)}
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Authorities" value={report.summary.authorities} />
          <SummaryCard label="Policy profiles" value={report.summary.policyProfiles} />
          <SummaryCard label="Policy rules" value={report.summary.policyRules} />
          <SummaryCard label="Total issues" value={report.summary.totalIssues} />
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <SummaryCard label="Missing profiles" value={report.summary.missingProfiles} />
          <SummaryCard label="Authorities with issues" value={report.summary.authoritiesWithIssues} />
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="px-3 py-2 font-medium">Authority</th>
                  <th className="px-3 py-2 font-medium">Profile</th>
                  <th className="px-3 py-2 font-medium">Operation kind</th>
                  <th className="px-3 py-2 font-medium">Rules</th>
                  <th className="px-3 py-2 font-medium">Severity</th>
                  <th className="px-3 py-2 font-medium">Review flags</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Missing defaults</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <AuthorityRow key={row.authorityId} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
