import {
  AircraftCapabilityStatus,
  AircraftConfigurationStatus,
  AssignmentStatus,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceEventStatus,
  Prisma,
} from "@prisma/client";

import {
  CrewComplianceRuleDefinition,
  getActiveCrewComplianceRuleDefinitions,
} from "@/lib/crew-compliance-rule-defaults";
import { prisma } from "@/lib/prisma";

const releaseEvidenceDetailSelect = {
  id: true,
  flightNumber: true,
  status: true,
  scheduledDeparture: true,
  scheduledArrival: true,
  actualDeparture: true,
  actualArrival: true,
  faaFlightPlanStatus: true,
  departureStation: {
    select: {
      code: true,
      name: true,
      city: true,
    },
  },
  arrivalStation: {
    select: {
      code: true,
      name: true,
      city: true,
    },
  },
  operator: {
    select: {
      id: true,
      name: true,
      code: true,
      releaseSetting: {
        select: {
          dispatcherEnabled: true,
          manifestMode: true,
        },
      },
    },
  },
  operatingAuthority: {
    select: {
      id: true,
      displayName: true,
      operatingPart: true,
      dutyRestPolicyProfiles: {
        where: {
          isDefault: true,
          effectiveTo: null,
        },
        orderBy: {
          effectiveFrom: "desc",
        },
        take: 1,
        select: {
          id: true,
          profileKey: true,
          operationKind: true,
          calculationBasis: true,
          enforcementMode: true,
          outsideCommercialFlyingRequired: true,
          ruleSettings: {
            where: {
              enabled: true,
            },
            orderBy: {
              ruleKey: "asc",
            },
            select: {
              ruleKey: true,
              title: true,
              warningMessage: true,
              severity: true,
              requiresExternalFlying: true,
              calculationNotes: true,
              passCondition: true,
              sourceCitation: true,
            },
          },
        },
      },
    },
  },
  authorityRevision: {
    select: {
      revisionLabel: true,
      effectiveStart: true,
    },
  },
  fuelEvents: {
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
    select: {
      eventType: true,
      fuelDensityLbsPerGallon: true,
      fueledReady: true,
      fuelOnboardGallons: true,
      fuelOnboardLbs: true,
      id: true,
      recordedAt: true,
    },
  },
  aircraftAssignments: {
    where: {
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
    },
    select: {
      status: true,
      assignedAt: true,
      aircraft: {
        select: {
          id: true,
          status: true,
          tailNumber: true,
          type: true,
          seats: true,
          fuelEvents: {
            orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
            select: {
              eventType: true,
              fuelOnboardGallons: true,
              fuelOnboardLbs: true,
              recordedAt: true,
            },
            take: 1,
          },
          configurations: {
            where: {
              status: AircraftConfigurationStatus.ACTIVE,
            },
            orderBy: [{ effectiveStart: "desc" }],
            select: {
              configurationLabel: true,
              passengerSeatCount: true,
              emptyWeight: true,
              emptyWeightCg: true,
              effectiveStart: true,
              effectiveEnd: true,
              status: true,
            },
            take: 1,
          },
          capabilities: {
            where: {
              status: AircraftCapabilityStatus.ACTIVE,
            },
            orderBy: [{ capabilityCode: "asc" }],
            select: {
              capabilityCode: true,
              description: true,
              effectiveEnd: true,
              status: true,
            },
          },
          discrepancies: {
            where: {
              status: {
                in: [
                  DiscrepancyStatus.OPEN,
                  DiscrepancyStatus.DEFERRED,
                  DiscrepancyStatus.CORRECTED_PENDING_RTS,
                ],
              },
            },
            orderBy: [{ reportedAt: "desc" }],
            select: {
              discrepancyNumber: true,
              title: true,
              severity: true,
              status: true,
              reportedAt: true,
            },
          },
          deferrals: {
            where: {
              status: DeferralStatus.ACTIVE,
            },
            orderBy: [{ dueAt: "asc" }],
            select: {
              deferralNumber: true,
              category: true,
              dueAt: true,
              operatingLimitations: true,
              requiredProcedures: true,
              status: true,
              discrepancy: {
                select: {
                  title: true,
                },
              },
            },
          },
          maintenanceEvents: {
            where: {
              status: MaintenanceEventStatus.COMPLETED,
            },
            orderBy: [{ completedAt: "desc" }],
            select: {
              maintenanceNumber: true,
              eventType: true,
              completedAt: true,
              providerName: true,
              returnToServiceAt: true,
              status: true,
            },
            take: 1,
          },
          airworthinessReleases: {
            orderBy: [{ createdAt: "desc" }],
            select: {
              releaseNumber: true,
              releasedAt: true,
              expiresAt: true,
              releaseNotes: true,
              status: true,
              flightLegId: true,
              updatedAt: true,
            },
            take: 5,
          },
        },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
    take: 1,
  },
  crewAssignments: {
    where: {
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
    },
    orderBy: [{ seatRole: "asc" }],
    select: {
      id: true,
      seatRole: true,
      status: true,
      crewMember: {
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          certificates: {
            select: {
              expiresAt: true,
              status: true,
            },
          },
          medicals: {
            select: {
              id: true,
              expiresAt: true,
              issuedAt: true,
              medicalClass: true,
              status: true,
            },
          },
          trainingEvents: {
            orderBy: [{ completedAt: "desc" }],
            take: 8,
            select: {
              id: true,
              completedAt: true,
              expiresAt: true,
              result: true,
              status: true,
              trainingType: true,
            },
          },
          checkEvents: {
            orderBy: [{ completedAt: "desc" }],
            take: 8,
            select: {
              id: true,
              checkType: true,
              completedAt: true,
              expiresAt: true,
              result: true,
              seatRole: true,
              status: true,
            },
          },
          recencyEvents: {
            orderBy: [{ eventAt: "desc" }],
            take: 8,
            select: {
              id: true,
              eventAt: true,
              quantity: true,
              recencyType: true,
              result: true,
              seatRole: true,
              status: true,
            },
          },
          plannedComplianceEvents: {
            where: {
              status: "SCHEDULED",
            },
            orderBy: [{ scheduledFor: "asc" }],
            take: 8,
            select: {
              id: true,
              eventType: true,
              scheduledFor: true,
              status: true,
            },
          },
          dutyPeriods: {
            select: {
              startsAt: true,
              endsAt: true,
              status: true,
            },
          },
          restPeriods: {
            select: {
              startsAt: true,
              endsAt: true,
              status: true,
            },
          },
        },
      },
    },
  },
  operationalControlRecord: {
    select: {
      controllingEntity: true,
      controlNotes: true,
      release: {
        select: {
          id: true,
          status: true,
          releasedAt: true,
          releaseNotes: true,
        },
      },
    },
  },
  manifest: {
    select: {
      status: true,
      lockedAt: true,
      items: {
        select: {
          id: true,
          personName: true,
          seatNumber: true,
          weight: true,
          baggageWeight: true,
          checkedInAt: true,
          boardedAt: true,
          notes: true,
          passenger: {
            select: {
              firstName: true,
              lastName: true,
              idDocumentType: true,
            },
          },
        },
        orderBy: {
          seatNumber: "asc",
        },
      },
    },
  },
  weightBalanceRuns: {
    select: {
      id: true,
      runLabel: true,
      status: true,
      takeoffWeight: true,
      landingWeight: true,
      centerOfGravity: true,
      calculatedAt: true,
      approvedAt: true,
      calculationSnapshot: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  flightLocatingRecord: {
    select: {
      status: true,
      responsibleParty: true,
      plannedRoute: true,
      lastKnownPosition: true,
      activatedAt: true,
      closedAt: true,
      overdueAt: true,
      notes: true,
      positionReports: {
        orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: {
          id: true,
          reportedAt: true,
          positionSummary: true,
          source: true,
        },
      },
    },
  },
  dispatchPackage: {
    select: {
      id: true,
      weatherBriefingId: true,
      notamSnapshotId: true,
      flightPlanReferenceId: true,
      performanceData: true,
      status: true,
      readyAt: true,
      reviewedAt: true,
      voidedAt: true,
      weatherBriefing: {
        select: {
          provider: true,
          briefingAt: true,
          routeSummary: true,
          rawSnapshot: true,
        },
      },
      notamSnapshot: {
        select: {
          capturedAt: true,
          affectedStationCodes: true,
          rawSnapshot: true,
        },
      },
      flightPlanReference: {
        select: {
          provider: true,
          externalReference: true,
          filedAt: true,
          status: true,
          routeText: true,
        },
      },
    },
  },
  preflightRecord: {
    select: {
      status: true,
      manifestVerified: true,
      manifestNotes: true,
      completedAt: true,
      notes: true,
    },
  },
  postflightRecord: {
    select: {
      status: true,
      outTime: true,
      offTime: true,
      onTime: true,
      inTime: true,
      delayNotes: true,
      completedAt: true,
      notes: true,
    },
  },
  readinessSnapshots: {
    orderBy: {
      evaluatedAt: "desc",
    },
    take: 5,
    select: {
      id: true,
      snapshotStatus: true,
      evaluatedAt: true,
      authorityClass: true,
      summary: true,
      findings: {
        select: {
          id: true,
          severity: true,
          status: true,
          ruleKey: true,
          readinessCategory: true,
          summary: true,
        },
        orderBy: [{ readinessCategory: "asc" }, { ruleKey: "asc" }],
      },
    },
  },
  releaseAuditEvents: {
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    select: {
      id: true,
      eventType: true,
      message: true,
      metadata: true,
      createdAt: true,
      snapshotId: true,
      actorRole: true,
      actorUser: {
        select: {
          email: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      snapshot: {
        select: {
          id: true,
          snapshotStatus: true,
          evaluatedAt: true,
        },
      },
    },
  },
  releasePackages: {
    orderBy: {
      capturedAt: "desc",
    },
    take: 5,
    select: {
      id: true,
      packageNumber: true,
      status: true,
      capturedAt: true,
      finalizedAt: true,
      voidedAt: true,
      notes: true,
      evidenceLinks: {
        orderBy: [{ evidenceType: "asc" }, { evidenceLabel: "asc" }],
        select: {
          id: true,
          evidenceType: true,
          evidenceId: true,
          evidenceLabel: true,
          statusLabel: true,
          isRequired: true,
        },
      },
    },
  },
} satisfies Prisma.FlightLegSelect;

type ReleaseEvidenceDetailPayload = Prisma.FlightLegGetPayload<{
  select: typeof releaseEvidenceDetailSelect;
}>;

export type ReleaseEvidenceDetail = ReleaseEvidenceDetailPayload & {
  crewComplianceRules: CrewComplianceRuleDefinition[];
};

export async function getReleaseEvidenceDetail(
  flightLegId: string,
): Promise<ReleaseEvidenceDetail | null> {
  const detail = await prisma.flightLeg.findUnique({
    where: { id: flightLegId },
    select: releaseEvidenceDetailSelect,
  });

  if (!detail) {
    return null;
  }

  const crewComplianceRules = await getActiveCrewComplianceRuleDefinitions(
    prisma,
    detail.operatingAuthority.operatingPart,
  );

  return {
    ...detail,
    crewComplianceRules,
  };
}
