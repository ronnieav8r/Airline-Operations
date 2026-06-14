import { TimeOffCoverageCrew, TimeOffCoverageImpact } from "@/lib/time-off-workflow-queries";

function formatAircraftType(value: string): string {
  return value.replaceAll("_", "-");
}

function scheduleModeLabel(mode: TimeOffCoverageImpact["scheduleMode"]): string {
  return mode === "SCHEDULED" ? "Scheduled availability" : "Unscheduled pool estimate";
}

function scheduleModeCopy(mode: TimeOffCoverageImpact["scheduleMode"]): string {
  return mode === "SCHEDULED"
    ? "Available counts use workable schedule rows only."
    : "No same-position schedule rows found; available is the qualified pool estimate.";
}

function CrewList({ crew }: { crew: TimeOffCoverageCrew[] }) {
  if (crew.length === 0) {
    return <p className="text-xs text-zinc-500">None</p>;
  }

  return (
    <ul className="space-y-1">
      {crew.map((crewMember) => (
        <li className="text-xs text-zinc-700" key={crewMember.crewMemberId}>
          <span className="font-semibold text-zinc-900">{crewMember.name}</span>{" "}
          <span className="text-zinc-500">#{crewMember.employeeNumber}</span>
          {crewMember.notes.length > 0 ? (
            <span className="block text-zinc-500">{crewMember.notes.slice(0, 3).join("; ")}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ImpactDetailGroup({
  crew,
  title,
}: {
  crew: TimeOffCoverageCrew[];
  title: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-2">
      <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <CrewList crew={crew} />
    </div>
  );
}

type TimeOffCoverageImpactPanelProps = {
  impacts: TimeOffCoverageImpact[];
  variant?: "default" | "compact";
};

function countBlockClasses(kind: "available" | "requested" | "approved" | "neutral"): string {
  if (kind === "available") {
    return "rounded-md border border-emerald-200 bg-emerald-50 p-1.5";
  }

  if (kind === "requested") {
    return "rounded-md border border-amber-200 bg-amber-50 p-1.5";
  }

  if (kind === "approved") {
    return "rounded-md border border-rose-200 bg-rose-50 p-1.5";
  }

  return "rounded-md border border-zinc-300 bg-white p-1.5";
}

export function TimeOffCoverageImpactPanel({
  impacts,
  variant = "default",
}: TimeOffCoverageImpactPanelProps) {
  if (impacts.length === 0) {
    return (
      <p
        className={
          variant === "compact"
            ? "rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-600"
            : "mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600"
        }
      >
        No position-specific coverage context found for this request.
      </p>
    );
  }

  return (
    <div className={variant === "compact" ? "space-y-2" : "mt-3 space-y-2"}>
      {impacts.map((impact) => {
        const positionLabel = `${formatAircraftType(impact.aircraftType)} ${impact.seatRole}`;
        const requestedOff = impact.pendingOff.length;
        const approvedOff = impact.approvedOff.length;
        const occupied = impact.occupied.length;
        const unavailable = impact.scheduledUnavailable.length;

        return (
          <section
            className={
              variant === "compact"
                ? "rounded-md border border-zinc-200 bg-zinc-50 p-2"
                : "rounded-md border border-zinc-200 bg-zinc-50 p-3"
            }
            key={`${impact.aircraftType}-${impact.seatRole}-${impact.source}`}
          >
            <div
              className={
                variant === "compact"
                  ? "flex flex-col gap-2"
                  : "flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"
              }
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-950">{positionLabel}</p>
                  <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[0.65rem] font-semibold text-zinc-600">
                    {scheduleModeLabel(impact.scheduleMode)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {impact.sourceLabel} | {impact.totalQualified} qualified excluding requester
                </p>
                {variant === "default" ? (
                  <p className="mt-1 text-xs text-zinc-600">{scheduleModeCopy(impact.scheduleMode)}</p>
                ) : null}
              </div>
              <div
                className={
                  variant === "compact"
                    ? "grid grid-cols-5 gap-1.5"
                    : "grid grid-cols-2 gap-2 sm:grid-cols-5 xl:min-w-[32rem]"
                }
              >
                <div className={countBlockClasses("available")}>
                  <p className="truncate text-[0.58rem] font-semibold uppercase tracking-wide text-emerald-800">
                    {variant === "compact" ? "Avail" : "Available"}
                  </p>
                  <p className={variant === "compact" ? "mt-0.5 text-sm font-semibold tabular-nums text-emerald-900" : "mt-1 text-lg font-semibold tabular-nums text-emerald-900"}>
                    {impact.available.length}
                  </p>
                </div>
                <div className={countBlockClasses("requested")}>
                  <p className="truncate text-[0.58rem] font-semibold uppercase tracking-wide text-amber-800">
                    {variant === "compact" ? "Req" : "Requested"}
                  </p>
                  <p className={variant === "compact" ? "mt-0.5 text-sm font-semibold tabular-nums text-amber-900" : "mt-1 text-lg font-semibold tabular-nums text-amber-900"}>
                    {requestedOff}
                  </p>
                </div>
                <div className={countBlockClasses("approved")}>
                  <p className="truncate text-[0.58rem] font-semibold uppercase tracking-wide text-rose-800">
                    {variant === "compact" ? "Appr" : "Approved"}
                  </p>
                  <p className={variant === "compact" ? "mt-0.5 text-sm font-semibold tabular-nums text-rose-900" : "mt-1 text-lg font-semibold tabular-nums text-rose-900"}>
                    {approvedOff}
                  </p>
                </div>
                <div className={countBlockClasses("neutral")}>
                  <p className="truncate text-[0.58rem] font-semibold uppercase tracking-wide text-zinc-500">
                    {variant === "compact" ? "Occ" : "Occupied"}
                  </p>
                  <p className={variant === "compact" ? "mt-0.5 text-sm font-semibold tabular-nums text-zinc-900" : "mt-1 text-lg font-semibold tabular-nums text-zinc-900"}>
                    {occupied}
                  </p>
                </div>
                <div className={countBlockClasses("neutral")}>
                  <p className="truncate text-[0.58rem] font-semibold uppercase tracking-wide text-zinc-500">
                    {variant === "compact" ? "Unav" : "Unavailable"}
                  </p>
                  <p className={variant === "compact" ? "mt-0.5 text-sm font-semibold tabular-nums text-zinc-900" : "mt-1 text-lg font-semibold tabular-nums text-zinc-900"}>
                    {unavailable}
                  </p>
                </div>
              </div>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-sky-700 hover:text-sky-900">
                Same-position detail
              </summary>
              <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                <ImpactDetailGroup crew={impact.available} title="Available" />
                <ImpactDetailGroup crew={impact.pendingOff} title="Requested off" />
                <ImpactDetailGroup crew={impact.approvedOff} title="Approved off" />
                <ImpactDetailGroup crew={impact.scheduledUnavailable} title="Scheduled unavailable" />
                <ImpactDetailGroup crew={impact.occupied} title="Occupied" />
              </div>
            </details>
          </section>
        );
      })}
    </div>
  );
}
