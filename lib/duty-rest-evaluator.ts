import {
  CrewDutyPeriodStatus,
  CrewRestPeriodStatus,
  DutyRestOperationKind,
  OperatingPart,
  Prisma,
  SeatRole,
} from "@prisma/client";

import { ReleaseEvidenceDetail } from "@/lib/release-evidence-detail-queries";

export type DutyRestFindingStatus =
  | "PASS"
  | "WARNING"
  | "MISSING_INPUT"
  | "NOT_APPLICABLE"
  | "DEFERRED";

export type DutyRestEvaluatorFinding = {
  details?: Prisma.JsonObject;
  evidenceRefId?: string;
  evidenceRefType?: string;
  label: string;
  message: string;
  ruleKey: string;
  severity: "INFO" | "WARN";
  status: DutyRestFindingStatus;
};

export type DutyRestEvaluation = {
  findings: DutyRestEvaluatorFinding[];
  message: string;
  ready: boolean;
  ruleKey: string;
};

type CrewAssignment = ReleaseEvidenceDetail["crewAssignments"][number];
type CrewMember = CrewAssignment["crewMember"];
type DutyPeriod = CrewMember["dutyPeriods"][number];
type RestPeriod = CrewMember["restPeriods"][number];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const PILOT_ROLES = new Set<SeatRole>([SeatRole.CPT, SeatRole.FO]);

function durationHours(start: Date, end: Date) {
  return Math.max(0, (end.getTime() - start.getTime()) / HOUR_MS);
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();
}

function crewName(crewMember: CrewMember) {
  return `${crewMember.firstName} ${crewMember.lastName}`;
}

function activeDutyPeriods(periods: DutyPeriod[]) {
  return periods.filter((period) => period.status !== CrewDutyPeriodStatus.CANCELLED);
}

function usableRestPeriods(periods: RestPeriod[]) {
  return periods.filter(
    (period) =>
      period.status !== CrewRestPeriodStatus.CANCELLED &&
      period.status !== CrewRestPeriodStatus.INTERRUPTED &&
      !!period.endsAt,
  );
}

function currentPolicyProfile(detail: ReleaseEvidenceDetail) {
  return detail.operatingAuthority.dutyRestPolicyProfiles[0] ?? null;
}

function ruleMessage(detail: ReleaseEvidenceDetail, ruleKey: string, fallback: string) {
  const rule = currentPolicyProfile(detail)?.ruleSettings.find((item) => item.ruleKey === ruleKey);
  return rule?.warningMessage ?? fallback;
}

function finding(
  input: Omit<DutyRestEvaluatorFinding, "severity"> & {
    severity?: DutyRestEvaluatorFinding["severity"];
  },
): DutyRestEvaluatorFinding {
  return {
    severity: input.status === "PASS" || input.status === "NOT_APPLICABLE" ? "INFO" : "WARN",
    ...input,
  };
}

function evaluatePart91Guardrails(detail: ReleaseEvidenceDetail): DutyRestEvaluatorFinding[] {
  return [
    finding({
      label: "Ordinary Part 91 duty/rest guardrail",
      message:
        "Ordinary Part 91 has no broad Part 135-style duty/rest table in the configured AeroOps policy.",
      ruleKey: "FAA-91-GUARD-001",
      status: "PASS",
    }),
    finding({
      label: "Part 117 applicability guardrail",
      message:
        "Part 117 passenger-carrier rules are not applied to this Part 91/91K/135 AeroOps authority context.",
      ruleKey: "FAA-117-NOTAPPLY-001",
      status: "NOT_APPLICABLE",
      details: {
        operatingPart: detail.operatingAuthority.operatingPart,
      },
    }),
  ];
}

function evaluateDutyRestOverlap(
  detail: ReleaseEvidenceDetail,
  pilots: CrewAssignment[],
): DutyRestEvaluatorFinding {
  const overlapsFound: string[] = [];
  const missingCrew: string[] = [];

  for (const assignment of pilots) {
    const dutyPeriods = activeDutyPeriods(assignment.crewMember.dutyPeriods);
    const restPeriods = usableRestPeriods(assignment.crewMember.restPeriods);

    if (dutyPeriods.length === 0 || restPeriods.length === 0) {
      missingCrew.push(crewName(assignment.crewMember));
      continue;
    }

    for (const duty of dutyPeriods) {
      if (!duty.endsAt) {
        continue;
      }

      for (const rest of restPeriods) {
        if (rest.endsAt && overlaps(duty.startsAt, duty.endsAt, rest.startsAt, rest.endsAt)) {
          overlapsFound.push(crewName(assignment.crewMember));
        }
      }
    }
  }

  if (overlapsFound.length > 0) {
    return finding({
      label: "No duty during required rest",
      message: ruleMessage(
        detail,
        "FAA-135-GEN-001",
        "Duty appears to overlap a required rest period.",
      ),
      ruleKey: "FAA-135-GEN-001",
      status: "WARNING",
      details: {
        crewMembers: overlapsFound,
      },
    });
  }

  if (missingCrew.length > 0) {
    return finding({
      label: "No duty during required rest",
      message:
        "Cannot fully compare duty and rest overlap because one or more assigned pilots lack visible duty or rest records.",
      ruleKey: "FAA-135-GEN-001",
      status: "MISSING_INPUT",
      details: {
        crewMembers: missingCrew,
      },
    });
  }

  return finding({
    label: "No duty during required rest",
    message: "No visible assigned-pilot duty/rest overlap was found.",
    ruleKey: "FAA-135-GEN-001",
    status: "PASS",
  });
}

function evaluateTenHourRest(
  detail: ReleaseEvidenceDetail,
  pilots: CrewAssignment[],
): DutyRestEvaluatorFinding {
  const completion = detail.scheduledArrival;
  const windowStart = new Date(completion.getTime() - DAY_MS);
  const missing: string[] = [];

  for (const assignment of pilots) {
    const hasQualifyingRest = usableRestPeriods(assignment.crewMember.restPeriods).some((period) => {
      const periodEnd = period.endsAt;

      if (!periodEnd) {
        return false;
      }

      const overlapStart = new Date(Math.max(period.startsAt.getTime(), windowStart.getTime()));
      const overlapEnd = new Date(Math.min(periodEnd.getTime(), completion.getTime()));

      return durationHours(overlapStart, overlapEnd) >= 10;
    });

    if (!hasQualifyingRest) {
      missing.push(crewName(assignment.crewMember));
    }
  }

  if (missing.length > 0) {
    return finding({
      label: "10 hours rest before planned completion",
      message: ruleMessage(
        detail,
        "FAA-135-UNSCH-004",
        "Missing qualifying 10 consecutive hours of rest in the 24 hours before planned completion.",
      ),
      ruleKey: "FAA-135-UNSCH-004",
      status: "WARNING",
      details: {
        crewMembers: missing,
        completionUtc: completion.toISOString(),
        windowStartUtc: windowStart.toISOString(),
      },
    });
  }

  return finding({
    label: "10 hours rest before planned completion",
    message: "Assigned pilots have visible qualifying rest in the 24 hours before planned completion.",
    ruleKey: "FAA-135-UNSCH-004",
    status: "PASS",
    details: {
      completionUtc: completion.toISOString(),
      windowStartUtc: windowStart.toISOString(),
    },
  });
}

function evaluateScheduledBlockEstimate(
  detail: ReleaseEvidenceDetail,
  pilots: CrewAssignment[],
): DutyRestEvaluatorFinding {
  const blockHours = durationHours(detail.scheduledDeparture, detail.scheduledArrival);
  const pilotCount = pilots.length;
  const onePilotLimit = 8;
  const twoPilotLimit = 10;

  if (pilotCount === 0) {
    return finding({
      label: "Rolling 24-hour flight-time estimate",
      message: "Cannot evaluate scheduled-block estimate because no assigned pilot snapshot is visible.",
      ruleKey: "FAA-135-UNSCH-002",
      status: "MISSING_INPUT",
    });
  }

  if (pilotCount === 1) {
    return finding({
      label: "One-pilot scheduled-block estimate",
      message:
        blockHours > onePilotLimit
          ? ruleMessage(
              detail,
              "FAA-135-UNSCH-002",
              "Projected one-pilot Part 135 unscheduled flight time exceeds 8 hours in a rolling 24-hour window.",
            )
          : "Current FlightLeg scheduled block is within the one-pilot 8-hour estimate.",
      ruleKey: "FAA-135-UNSCH-002",
      status: blockHours > onePilotLimit ? "WARNING" : "PASS",
      details: {
        scheduledBlockHours: blockHours,
        limitHours: onePilotLimit,
        limitation:
          "Current FlightLeg block only; outside commercial flying and full rolling ledgers are evaluated separately as missing-input checks.",
      },
    });
  }

  return finding({
    label: "Two-pilot scheduled-block estimate",
    message:
      blockHours > twoPilotLimit
      ? ruleMessage(
          detail,
          "FAA-135-UNSCH-003",
          "Projected two-pilot Part 135 unscheduled flight time exceeds 10 hours in a rolling 24-hour window.",
        )
      : "Current FlightLeg scheduled block is within the two-pilot 10-hour estimate.",
    ruleKey: "FAA-135-UNSCH-003",
    status: blockHours > twoPilotLimit ? "WARNING" : "PASS",
    details: {
      scheduledBlockHours: blockHours,
      limitHours: twoPilotLimit,
      pilotCount,
      limitation:
        "Current FlightLeg block only; outside commercial flying and full rolling ledgers are evaluated separately as missing-input checks.",
    },
  });
}

function quarterStart(date: Date) {
  const quarterMonth = Math.floor(date.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(date.getUTCFullYear(), quarterMonth, 1, 0, 0, 0));
}

function quarterEnd(date: Date) {
  const start = quarterStart(date);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 1, 0, 0, 0));
}

function evaluateQuarterlyRest(
  detail: ReleaseEvidenceDetail,
  pilots: CrewAssignment[],
): DutyRestEvaluatorFinding {
  const start = quarterStart(detail.scheduledDeparture);
  const end = quarterEnd(detail.scheduledDeparture);
  const counts = pilots.map((assignment) => {
    const count = usableRestPeriods(assignment.crewMember.restPeriods).filter((period) => {
      const periodEnd = period.endsAt;

      return (
        periodEnd &&
        period.startsAt.getTime() >= start.getTime() &&
        periodEnd.getTime() <= end.getTime() &&
        durationHours(period.startsAt, periodEnd) >= 24
      );
    }).length;

    return {
      crewMember: crewName(assignment.crewMember),
      count,
    };
  });
  const insufficient = counts.filter((item) => item.count < 13);

  if (counts.length === 0) {
    return finding({
      label: "Quarterly 24-hour rest count",
      message: "Cannot evaluate quarterly rest count because no assigned pilot snapshot is visible.",
      ruleKey: "FAA-135-UNSCH-006",
      status: "MISSING_INPUT",
    });
  }

  if (insufficient.length > 0) {
    return finding({
      label: "Quarterly 24-hour rest count",
      message: ruleMessage(
        detail,
        "FAA-135-UNSCH-006",
        "Fewer than 13 qualifying 24-hour rest periods are visible for the quarter.",
      ),
      ruleKey: "FAA-135-UNSCH-006",
      status: "MISSING_INPUT",
      details: {
        quarterStartUtc: start.toISOString(),
        quarterEndUtc: end.toISOString(),
        counts,
      },
    });
  }

  return finding({
    label: "Quarterly 24-hour rest count",
    message: "Visible rest records show at least 13 qualifying 24-hour rest periods this quarter.",
    ruleKey: "FAA-135-UNSCH-006",
    status: "PASS",
    details: {
      quarterStartUtc: start.toISOString(),
      quarterEndUtc: end.toISOString(),
      counts,
    },
  });
}

function evaluatePart135Unscheduled(detail: ReleaseEvidenceDetail): DutyRestEvaluatorFinding[] {
  const pilots = detail.crewAssignments.filter((assignment) => PILOT_ROLES.has(assignment.seatRole));
  const findings: DutyRestEvaluatorFinding[] = [];

  if (pilots.length === 0) {
    findings.push(
      finding({
        label: "Assigned pilot snapshot",
        message: "No assigned pilot snapshot is visible for duty/rest calculation.",
        ruleKey: "dutyRest.assignedPilot.missing",
        status: "MISSING_INPUT",
      }),
    );
  }

  findings.push(evaluateDutyRestOverlap(detail, pilots));
  findings.push(evaluateTenHourRest(detail, pilots));
  findings.push(evaluateScheduledBlockEstimate(detail, pilots));
  findings.push(evaluateQuarterlyRest(detail, pilots));
  findings.push(
    finding({
      label: "Outside commercial flying ledger",
      message: ruleMessage(
        detail,
        "FAA-135-UNSCH-001",
        "Cannot fully validate Part 135 cumulative flight limits without outside commercial flying data.",
      ),
      ruleKey: "FAA-135-UNSCH-001",
      status: "MISSING_INPUT",
      details: {
        requiredInput: "outside commercial flying ledger",
      },
    }),
  );
  findings.push(
    finding({
      label: "Required transportation classification",
      message:
        "Required non-local transportation cannot be classified yet because transportation event records are deferred.",
      ruleKey: "FAA-135-GEN-002",
      status: "DEFERRED",
      details: {
        deferredInput: "transportation event records",
      },
    }),
  );

  return findings;
}

function evaluateDeferredAuthority(detail: ReleaseEvidenceDetail): DutyRestEvaluatorFinding[] {
  return [
    finding({
      label: `${detail.operatingAuthority.operatingPart} duty/rest calculator`,
      message:
        "This authority class has duty/rest policy settings, but the first calculator only implements ordinary Part 91 guardrails and Part 135 unscheduled/on-demand warnings.",
      ruleKey: "dutyRest.authority.deferred",
      status: "DEFERRED",
      details: {
        operatingPart: detail.operatingAuthority.operatingPart,
      },
    }),
  ];
}

function evaluationMessage(findings: DutyRestEvaluatorFinding[]) {
  const warningCount = findings.filter((item) =>
    ["WARNING", "MISSING_INPUT", "DEFERRED"].includes(item.status),
  ).length;

  if (warningCount === 0) {
    return "Duty/rest warning calculator found no supported warnings for this FlightLeg.";
  }

  return `${warningCount} duty/rest warning or missing-input item(s) need operational review.`;
}

export function evaluateDutyRestForFlightLeg(detail: ReleaseEvidenceDetail): DutyRestEvaluation {
  const profile = currentPolicyProfile(detail);

  if (!profile) {
    const findings = [
      finding({
        label: "Duty/rest policy profile",
        message: "No default duty/rest policy profile is configured for this operating authority.",
        ruleKey: "dutyRest.policyProfile.missing",
        status: "MISSING_INPUT",
      }),
    ];

    return {
      findings,
      message: evaluationMessage(findings),
      ready: false,
      ruleKey: "dutyRest.policyProfile.missing",
    };
  }

  let findings: DutyRestEvaluatorFinding[];

  if (detail.operatingAuthority.operatingPart === OperatingPart.PART_91) {
    findings = evaluatePart91Guardrails(detail);
  } else if (profile.operationKind === DutyRestOperationKind.PART_135_UNSCHEDULED) {
    findings = evaluatePart135Unscheduled(detail);
  } else {
    findings = evaluateDeferredAuthority(detail);
  }

  const ready = findings.every((item) => item.status === "PASS" || item.status === "NOT_APPLICABLE");

  return {
    findings,
    message: evaluationMessage(findings),
    ready,
    ruleKey: ready ? "dutyRest.current.ready" : "dutyRest.warning.exists",
  };
}
