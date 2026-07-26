import Link from "next/link";

import { TimeOffAssignmentCoverageReview } from "@/lib/time-off-workflow-queries";

function formatAircraftType(value: string): string {
  return value.replaceAll("_", "-");
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function formatRole(role: string): string {
  return role === "CPT" ? "CPT" : role;
}

type TimeOffAssignmentCoverageReviewPanelProps = {
  reviews: TimeOffAssignmentCoverageReview[];
  variant?: "default" | "compact";
};

export function TimeOffAssignmentCoverageReviewPanel({
  reviews,
  variant = "default",
}: TimeOffAssignmentCoverageReviewPanelProps) {
  if (reviews.length === 0) {
    return null;
  }

  return (
    <section
      className={
        variant === "compact"
          ? "mt-3 rounded-md border status-embedded-caution p-2 text-xs"
          : "mt-3 rounded-md border status-embedded-caution p-3 text-sm"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">Affected aircraft coverage</p>
          <p className={variant === "compact" ? "mt-1 text-[0.7rem]" : "mt-1 text-xs"}>
            Approval is still warning-only. Review these aircraft-block assignments before
            relying on this crew member for the same window.
          </p>
        </div>
      </div>

      <div className="mt-2 grid gap-2">
        {reviews.map((review) => (
          <article
            className="rounded-md border border-amber-400/50 bg-zinc-950/30 p-2"
            key={review.assignmentId}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-amber-50">
                  {review.tailNumber} {formatAircraftType(review.aircraftType)}{" "}
                  {formatRole(review.seatRole)}
                </p>
                <p className="mt-0.5 text-[0.7rem]">
                  {formatDateTime(review.startsAt)} -{" "}
                  {review.endsAt ? formatDateTime(review.endsAt) : "open block"}
                </p>
              </div>
              <Link
                className="rounded-md border border-amber-300/60 px-2 py-1 text-[0.7rem] font-semibold text-amber-50 hover:bg-amber-500/20"
                href={`/aircraft?panel=aircraft&selected=${review.aircraftId}`}
              >
                View aircraft
              </Link>
            </div>

            {review.flights.length === 0 ? (
              <p className="mt-2 text-[0.7rem]">
                No FlightLeg coverage currently resolves to this crew member inside the request
                window.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {review.flights.slice(0, 5).map((flight) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-300/30 bg-zinc-900/50 px-2 py-1"
                    key={`${review.assignmentId}-${flight.id}`}
                  >
                    <span>
                      <span className="font-semibold text-amber-50">{flight.flightNumber}</span>{" "}
                      {flight.route}
                    </span>
                    <span className="text-[0.68rem]">
                      {formatDateTime(flight.scheduledDeparture)}
                    </span>
                  </li>
                ))}
                {review.flights.length > 5 ? (
                  <li className="text-[0.7rem]">
                    +{review.flights.length - 5} more affected flight
                    {review.flights.length - 5 === 1 ? "" : "s"} in this window.
                  </li>
                ) : null}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
