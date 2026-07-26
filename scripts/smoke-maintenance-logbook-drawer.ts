import {
  AircraftConfigurationStatus,
  AircraftLogbookEntrySource,
  AircraftLogbookEntryStatus,
  AircraftLogbookEntryType,
  AircraftStatus,
  AircraftType,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceComplianceStatus,
  MaintenanceControlHoldStatus,
  MaintenanceEventStatus,
  MaintenanceEventType,
  MaintenanceProgramTaskCategory,
  UserRole,
} from "@prisma/client";

import {
  DEFAULT_LOGBOOK_DRAWER_LIMIT,
  MAX_LOGBOOK_DRAWER_LIMIT,
  getMaintenanceLogbookDrawerData,
  normalizeLogbookDrawerLimit,
  parseLogbookDrawerDate,
} from "../lib/maintenance-logbook-drawer";
import { prisma } from "../lib/prisma";
import {
  safeSameAppReturnDestination,
  withSameAppReturnMessage,
} from "../lib/same-app-return";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const noFilters = {
  entryType: null,
  from: null,
  search: "",
  status: null,
  to: null,
};

async function main() {
  assert(normalizeLogbookDrawerLimit(null) === DEFAULT_LOGBOOK_DRAWER_LIMIT, "Missing limit should use the default.");
  assert(normalizeLogbookDrawerLimit("-1") === DEFAULT_LOGBOOK_DRAWER_LIMIT, "Invalid limit should use the default.");
  assert(normalizeLogbookDrawerLimit("999999") === MAX_LOGBOOK_DRAWER_LIMIT, "Hostile limit should be capped.");
  assert(parseLogbookDrawerDate("2026-02-30") === null, "Invalid calendar date should be ignored.");
  assert(parseLogbookDrawerDate("2026-07-26")?.toISOString() === "2026-07-26T00:00:00.000Z", "Valid from date should normalize.");
  assert(
    safeSameAppReturnDestination("//evil.example/path", "/maintenance") === "/maintenance",
    "Protocol-relative return destination must be rejected.",
  );
  assert(
    safeSameAppReturnDestination("https://evil.example/path", "/maintenance") === "/maintenance",
    "External return destination must be rejected.",
  );
  const safeReturn = "/maintenance?view=logbook&logbookAircraft=tail-1&logbookLimit=100";
  assert(
    safeSameAppReturnDestination(safeReturn, "/maintenance") === safeReturn,
    "Same-app drawer return destination should be retained.",
  );
  assert(
    withSameAppReturnMessage(safeReturn, "submitted", "signed").includes("logbookAircraft=tail-1"),
    "Action result should preserve drawer state.",
  );

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  const aircraft = await prisma.aircraft.create({
    data: {
      status: AircraftStatus.AVAILABLE,
      tailNumber: `MX4${suffix}`.slice(0, 20),
      type: AircraftType.CL_65,
    },
  });
  const actor = await prisma.user.create({
    data: {
      email: `mx4-${suffix.toLowerCase()}@example.test`,
      role: UserRole.MAINTENANCE,
    },
  });
  const taskIds: string[] = [];

  try {
    const base = Date.UTC(2026, 6, 1, 12);
    const created = [];

    for (let index = 0; index < 6; index += 1) {
      created.push(
        await prisma.aircraftLogbookEntry.create({
          data: {
            aircraftId: aircraft.id,
            category: index === 3 ? "TARGET FILTER" : "GENERAL",
            entryNumber: `MX4-${index + 1}`,
            entryType:
              index === 3
                ? AircraftLogbookEntryType.INSPECTION_ENTRY
                : AircraftLogbookEntryType.MAINTENANCE_ENTRY,
            narrative: index === 3 ? "Bounded query target narrative." : `Narrative ${index + 1}`,
            reportedAt: new Date(base + index * 86_400_000),
            source: AircraftLogbookEntrySource.MAINTENANCE,
            status:
              index === 3
                ? AircraftLogbookEntryStatus.READY_FOR_SIGNATURE
                : AircraftLogbookEntryStatus.DRAFT,
            title: index === 3 ? "Target inspection" : `Maintenance entry ${index + 1}`,
          },
        }),
      );
    }

    const currentDiscrepancy = await prisma.discrepancy.create({
      data: {
        aircraftId: aircraft.id,
        discrepancyNumber: "MX4-CURRENT",
        status: DiscrepancyStatus.OPEN,
        title: "Current serviceability write-up",
      },
    });
    const historicalDiscrepancy = await prisma.discrepancy.create({
      data: {
        aircraftId: aircraft.id,
        clearedAt: new Date(base),
        discrepancyNumber: "MX4-HISTORICAL",
        status: DiscrepancyStatus.CLEARED,
        title: "Historical cleared write-up",
      },
    });
    const activeDeferral = await prisma.deferral.create({
      data: {
        aircraftId: aircraft.id,
        deferralNumber: "MX4-ACTIVE",
        discrepancyId: currentDiscrepancy.id,
        status: DeferralStatus.ACTIVE,
      },
    });
    const clearedDeferral = await prisma.deferral.create({
      data: {
        aircraftId: aircraft.id,
        clearedAt: new Date(base),
        deferralNumber: "MX4-CLEARED",
        discrepancyId: historicalDiscrepancy.id,
        status: DeferralStatus.CLEARED,
      },
    });
    const activeHold = await prisma.maintenanceControlHold.create({
      data: {
        aircraftId: aircraft.id,
        placedById: actor.id,
        reason: "Current test hold",
        status: MaintenanceControlHoldStatus.ACTIVE,
      },
    });
    const releasedHold = await prisma.maintenanceControlHold.create({
      data: {
        aircraftId: aircraft.id,
        placedById: actor.id,
        reason: "Historical test hold",
        releasedAt: new Date(base),
        status: MaintenanceControlHoldStatus.RELEASED,
      },
    });
    const inProgressEvent = await prisma.maintenanceEvent.create({
      data: {
        aircraftId: aircraft.id,
        eventType: MaintenanceEventType.UNSCHEDULED_MAINTENANCE,
        maintenanceNumber: "MX4-IN-PROGRESS",
        status: MaintenanceEventStatus.IN_PROGRESS,
      },
    });
    const completedPendingRtsEvent = await prisma.maintenanceEvent.create({
      data: {
        aircraftId: aircraft.id,
        completedAt: new Date(base),
        eventType: MaintenanceEventType.REPAIR,
        maintenanceNumber: "MX4-PENDING-RTS",
        status: MaintenanceEventStatus.COMPLETED,
      },
    });
    const historicalEvent = await prisma.maintenanceEvent.create({
      data: {
        aircraftId: aircraft.id,
        completedAt: new Date(base),
        eventType: MaintenanceEventType.REPAIR,
        maintenanceNumber: "MX4-HISTORICAL",
        returnToServiceAt: new Date(base),
        status: MaintenanceEventStatus.COMPLETED,
      },
    });
    const activeConfiguration = await prisma.aircraftConfiguration.create({
      data: {
        aircraftId: aircraft.id,
        configurationLabel: "Current configuration",
        status: AircraftConfigurationStatus.ACTIVE,
      },
    });
    const historicalConfiguration = await prisma.aircraftConfiguration.create({
      data: {
        aircraftId: aircraft.id,
        configurationLabel: "Historical configuration",
        effectiveEnd: new Date(base),
        status: AircraftConfigurationStatus.SUPERSEDED,
      },
    });

    const requiredOverdueTask = await prisma.maintenanceProgramTask.create({
      data: {
        category: MaintenanceProgramTaskCategory.OTHER,
        requiredForServiceability: true,
        taskKey: `MX4-REQ-OVERDUE-${suffix}`,
        title: "Required overdue task",
      },
    });
    const requiredCurrentTask = await prisma.maintenanceProgramTask.create({
      data: {
        category: MaintenanceProgramTaskCategory.OTHER,
        requiredForServiceability: true,
        taskKey: `MX4-REQ-CURRENT-${suffix}`,
        title: "Required current task",
      },
    });
    const optionalOverdueTask = await prisma.maintenanceProgramTask.create({
      data: {
        category: MaintenanceProgramTaskCategory.OTHER,
        requiredForServiceability: false,
        taskKey: `MX4-OPT-OVERDUE-${suffix}`,
        title: "Optional overdue task",
      },
    });
    taskIds.push(requiredOverdueTask.id, requiredCurrentTask.id, optionalOverdueTask.id);
    const requiredOverdueState = await prisma.maintenanceComplianceState.create({
      data: {
        aircraftId: aircraft.id,
        status: MaintenanceComplianceStatus.OVERDUE,
        taskId: requiredOverdueTask.id,
      },
    });
    const requiredCurrentState = await prisma.maintenanceComplianceState.create({
      data: {
        aircraftId: aircraft.id,
        status: MaintenanceComplianceStatus.CURRENT,
        taskId: requiredCurrentTask.id,
      },
    });
    const optionalOverdueState = await prisma.maintenanceComplianceState.create({
      data: {
        aircraftId: aircraft.id,
        status: MaintenanceComplianceStatus.OVERDUE,
        taskId: optionalOverdueTask.id,
      },
    });

    const first = await getMaintenanceLogbookDrawerData({
      aircraftId: aircraft.id,
      cursorEntryId: null,
      filters: noFilters,
      limit: 2,
      selectedEntryId: created[0].id,
    });
    assert(first, "Drawer aircraft should resolve.");
    assert(first.filteredCount === 6 && first.totalCount === 6, "Drawer should report filtered and tail totals.");
    assert(first.entries.length === 2 && first.hasMore, "Drawer should return a bounded limit+1 batch.");
    assert(first.entries[0].id === created[5].id && first.entries[1].id === created[4].id, "Timeline should be canonical newest-first.");
    assert(first.selectedEntry?.id === created[0].id, "Selected entry outside the batch should resolve separately.");
    assert(!first.selectedEntryInBatch, "Outside selected entry must not be marked as part of the visible batch.");
    assert(!("attachments" in first.entries[0]), "Timeline entries must use the bounded summary select.");
    assert(
      Boolean(first.selectedEntry && "attachments" in first.selectedEntry),
      "Selected entry must use the separate full-detail select.",
    );
    assert(first.visibleFrom === 1 && first.visibleTo === 2, "First visible range should be exact.");
    assert(
      first.aircraft.discrepancies.some((item) => item.id === currentDiscrepancy.id) &&
        !first.aircraft.discrepancies.some((item) => item.id === historicalDiscrepancy.id),
      "Serviceability context should include current discrepancies and omit historical discrepancies.",
    );
    assert(
      first.aircraft.deferrals.some((item) => item.id === activeDeferral.id) &&
        !first.aircraft.deferrals.some((item) => item.id === clearedDeferral.id),
      "Serviceability context should include only active deferrals.",
    );
    assert(
      first.aircraft.maintenanceControlHolds.some((item) => item.id === activeHold.id) &&
        !first.aircraft.maintenanceControlHolds.some((item) => item.id === releasedHold.id),
      "Serviceability context should include only active Maintenance Control holds.",
    );
    assert(
      first.aircraft.maintenanceEvents.some((item) => item.id === inProgressEvent.id) &&
        first.aircraft.maintenanceEvents.some((item) => item.id === completedPendingRtsEvent.id) &&
        !first.aircraft.maintenanceEvents.some((item) => item.id === historicalEvent.id),
      "Serviceability context should include in-progress and pending-RTS events only.",
    );
    assert(
      first.aircraft.configurations.some((item) => item.id === activeConfiguration.id) &&
        !first.aircraft.configurations.some((item) => item.id === historicalConfiguration.id),
      "Serviceability context should include only the active configuration.",
    );
    assert(
      first.aircraft.maintenanceComplianceStates.some((item) => item.id === requiredOverdueState.id) &&
        !first.aircraft.maintenanceComplianceStates.some((item) => item.id === requiredCurrentState.id) &&
        !first.aircraft.maintenanceComplianceStates.some((item) => item.id === optionalOverdueState.id),
      "Serviceability context should include only required overdue compliance states.",
    );

    const selectedInBatch = await getMaintenanceLogbookDrawerData({
      aircraftId: aircraft.id,
      cursorEntryId: null,
      filters: noFilters,
      limit: 2,
      selectedEntryId: created[5].id,
    });
    assert(selectedInBatch?.selectedEntryInBatch, "Visible selected entry should be marked as part of the batch.");
    assert(
      Boolean(selectedInBatch?.selectedEntry && "attachments" in selectedInBatch.selectedEntry),
      "Visible selected entry must still resolve through the separate full-detail query.",
    );

    const second = await getMaintenanceLogbookDrawerData({
      aircraftId: aircraft.id,
      cursorEntryId: first.nextCursorEntryId,
      filters: noFilters,
      limit: 2,
      selectedEntryId: null,
    });
    assert(second, "Older cursor batch should resolve.");
    assert(second.entries[0].id === created[3].id && second.entries[1].id === created[2].id, "Cursor batch should continue without overlap.");
    assert(second.visibleFrom === 3 && second.visibleTo === 4, "Cursor visible range should be exact.");
    assert(second.hasNewer, "Older batch should expose a path back to newest.");

    const filtered = await getMaintenanceLogbookDrawerData({
      aircraftId: aircraft.id,
      cursorEntryId: null,
      filters: {
        entryType: AircraftLogbookEntryType.INSPECTION_ENTRY,
        from: parseLogbookDrawerDate("2026-07-04"),
        search: "target narrative",
        status: AircraftLogbookEntryStatus.READY_FOR_SIGNATURE,
        to: parseLogbookDrawerDate("2026-07-04", true),
      },
      limit: 50,
      selectedEntryId: null,
    });
    assert(filtered?.filteredCount === 1 && filtered.entries[0].id === created[3].id, "Drawer filters should apply independently and deterministically.");

    const invalid = await getMaintenanceLogbookDrawerData({
      aircraftId: aircraft.id,
      cursorEntryId: "invalid-cursor",
      filters: noFilters,
      limit: 2,
      selectedEntryId: "invalid-entry",
    });
    assert(invalid?.cursorWasInvalid && invalid.selectedEntryWasInvalid, "Invalid cursor and entry should fail safely.");

    console.log("Maintenance logbook drawer smoke passed.");
  } finally {
    await prisma.aircraft.delete({ where: { id: aircraft.id } });
    if (taskIds.length > 0) {
      await prisma.maintenanceProgramTask.deleteMany({ where: { id: { in: taskIds } } });
    }
    await prisma.user.delete({ where: { id: actor.id } });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
