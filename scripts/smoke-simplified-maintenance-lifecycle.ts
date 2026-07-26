import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  AircraftLogbookSignaturePurpose,
  AircraftStatus,
  AircraftType,
  DeferralMethod,
  DeferralStatus,
  DiscrepancyStatus,
  MaintenanceComplianceStatus,
  MaintenanceControlHoldStatus,
  UserRole,
} from "@prisma/client";

import { evaluateAircraftServiceability } from "../lib/aircraft-serviceability";
import { createCorrectiveActionDraft, signAircraftLogbookEntry } from "../lib/aircraft-logbook";
import {
  convertMaintenanceControlHoldToDiscrepancy,
  convertMaintenanceControlHoldToMaintenanceEvent,
  placeMaintenanceControlHold,
  planScheduledMaintenance,
  releaseMaintenanceControlHold,
  releaseMaintenanceOccurrence,
  startScheduledMaintenance,
} from "../lib/maintenance-lifecycle";
import { prisma } from "../lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectReject(run: () => Promise<unknown>, contains: string) {
  try {
    await run();
  } catch (error) {
    assert(error instanceof Error && error.message.includes(contains), `Expected "${contains}", got "${error instanceof Error ? error.message : String(error)}".`);
    return;
  }
  throw new Error(`Expected rejection containing "${contains}".`);
}

function signForm(name: string, purpose: AircraftLogbookSignaturePurpose) {
  const form = new FormData();
  form.set("signerName", name);
  form.set("purpose", purpose);
  form.set("intentText", `Smoke approval for ${purpose}.`);
  return form;
}

async function serviceability(aircraftId: string) {
  const aircraft = await prisma.aircraft.findUniqueOrThrow({
    where: { id: aircraftId },
    include: {
      configurations: true,
      deferrals: { where: { status: DeferralStatus.ACTIVE } },
      discrepancies: { where: { status: { in: [DiscrepancyStatus.OPEN, DiscrepancyStatus.DEFERRED, DiscrepancyStatus.CORRECTED_PENDING_RTS] } } },
      maintenanceComplianceStates: { include: { task: true } },
      maintenanceControlHolds: { where: { status: MaintenanceControlHoldStatus.ACTIVE } },
      maintenanceEvents: true,
    },
  });
  return evaluateAircraftServiceability(aircraft);
}

async function main() {
  const stamp = Date.now().toString(36);
  const emails = {
    admin: `mx002r-admin-${stamp}@example.test`,
    inactive: `mx002r-inactive-${stamp}@example.test`,
    maint1: `mx002r-maint1-${stamp}@example.test`,
    maint2: `mx002r-maint2-${stamp}@example.test`,
  };
  const createdUserIds: string[] = [];
  let aircraftId: string | null = null;
  let stationId: string | null = null;
  let taskId: string | null = null;

  try {
    const [admin, maint1, maint2, inactive] = await Promise.all([
      prisma.user.create({ data: { email: emails.admin, role: UserRole.ADMIN } }),
      prisma.user.create({ data: { email: emails.maint1, role: UserRole.MAINTENANCE } }),
      prisma.user.create({ data: { email: emails.maint2, role: UserRole.MAINTENANCE } }),
      prisma.user.create({ data: { email: emails.inactive, role: UserRole.MAINTENANCE } }),
    ]);
    createdUserIds.push(admin.id, maint1.id, maint2.id, inactive.id);
    await prisma.maintenanceAuthorityProfile.createMany({
      data: [
        { certificateNumber: `A-${stamp}`, certificateType: "A&P", isActive: true, legalName: "MX One", userId: maint1.id },
        { certificateNumber: `B-${stamp}`, certificateType: "A&P", isActive: true, legalName: "MX Two", userId: maint2.id },
        { certificateNumber: `I-${stamp}`, certificateType: "A&P", isActive: false, legalName: "Inactive MX", userId: inactive.id },
      ],
    });
    const station = await prisma.station.create({
      data: { city: "Smoke", code: `X${stamp.slice(-3).toUpperCase()}`, country: "USA", name: "MX Smoke Station", timezone: "UTC" },
    });
    stationId = station.id;
    const aircraft = await prisma.aircraft.create({
      data: { status: AircraftStatus.AVAILABLE, tailNumber: `N${stamp.slice(-6).toUpperCase()}`, type: AircraftType.CL_65 },
    });
    aircraftId = aircraft.id;
    await prisma.aircraftConfiguration.create({
      data: { aircraftId: aircraft.id, configurationLabel: `SMOKE-${stamp}`, effectiveStart: new Date(), status: "ACTIVE" },
    });

    const discrepancy = await prisma.discrepancy.create({
      data: { aircraftId: aircraft.id, discrepancyNumber: `DISC-${stamp}-1`, reportedById: maint1.id, status: DiscrepancyStatus.OPEN, title: "Smoke open write-up" },
    });
    assert(!(await serviceability(aircraft.id)).ready, "Open write-up must block availability.");
    const deferral = await prisma.deferral.create({
      data: {
        aircraftId: aircraft.id,
        authorizedById: maint1.id,
        deferralMethod: DeferralMethod.MEL,
        deferralNumber: `DEF-${stamp}`,
        discrepancyId: discrepancy.id,
        dueAt: new Date(Date.now() + 86_400_000),
        status: DeferralStatus.ACTIVE,
      },
    });
    await prisma.discrepancy.update({ where: { id: discrepancy.id }, data: { activeDeferralId: deferral.id, status: DiscrepancyStatus.DEFERRED } });
    assert((await serviceability(aircraft.id)).ready, "Valid deferral must restore limited availability.");

    const correctiveForm = new FormData();
    correctiveForm.set("discrepancyId", discrepancy.id);
    correctiveForm.set("title", "Smoke corrective work");
    correctiveForm.set("narrative", "Inspected and repaired per approved data.");
    correctiveForm.set("requiresIndependentInspection", "on");
    const correctiveEntry = await createCorrectiveActionDraft({ actorId: maint1.id, aircraftId: aircraft.id, formData: correctiveForm });
    await signAircraftLogbookEntry({ actorId: maint1.id, actorRole: maint1.role, entryId: correctiveEntry.id, formData: signForm("MX One", AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL) });
    const pending = await prisma.discrepancy.findUniqueOrThrow({ where: { id: discrepancy.id } });
    assert(pending.status === DiscrepancyStatus.DEFERRED, "Maintenance approval must not advance a designated write-up before independent inspection.");
    assert((await serviceability(aircraft.id)).label === "Inspection required", "Designated work must remain blocked for independent inspection.");
    const correctiveEvent = await prisma.maintenanceEvent.findFirstOrThrow({ where: { discrepancyId: discrepancy.id } });
    await expectReject(
      () => releaseMaintenanceOccurrence({ actorId: maint1.id, maintenanceEventId: correctiveEvent.id, note: "Premature release." }),
      "Independent inspection",
    );
    assert((await prisma.discrepancy.findUniqueOrThrow({ where: { id: discrepancy.id } })).status === DiscrepancyStatus.DEFERRED, "Rejected release must not advance the discrepancy.");
    await expectReject(
      () => signAircraftLogbookEntry({ actorId: maint1.id, actorRole: maint1.role, entryId: correctiveEntry.id, formData: signForm("MX One", AircraftLogbookSignaturePurpose.INSPECTION_APPROVAL) }),
      "different",
    );
    await signAircraftLogbookEntry({ actorId: maint2.id, actorRole: maint2.role, entryId: correctiveEntry.id, formData: signForm("MX Two", AircraftLogbookSignaturePurpose.INSPECTION_APPROVAL) });
    assert((await prisma.discrepancy.findUniqueOrThrow({ where: { id: discrepancy.id } })).status === DiscrepancyStatus.CORRECTED_PENDING_RTS, "Independent inspection must advance the write-up to pending MX release.");
    assert((await serviceability(aircraft.id)).label === "MX release required", "Inspected work must remain blocked pending Maintenance Control release.");
    const rtsCountBeforeRejectedRelease = await prisma.returnToServiceRecord.count({
      where: { maintenanceEventId: correctiveEvent.id },
    });
    await prisma.discrepancy.update({
      where: { id: discrepancy.id },
      data: { status: DiscrepancyStatus.OPEN },
    });
    await expectReject(
      () => releaseMaintenanceOccurrence({ actorId: maint1.id, maintenanceEventId: correctiveEvent.id, note: "Invalid state release." }),
      "corrected write-up",
    );
    assert(
      (await prisma.returnToServiceRecord.count({ where: { maintenanceEventId: correctiveEvent.id } })) ===
        rtsCountBeforeRejectedRelease,
      "Failed discrepancy release must roll back RTS evidence.",
    );
    assert(
      (await prisma.maintenanceEvent.findUniqueOrThrow({ where: { id: correctiveEvent.id } }))
        .returnToServiceAt === null,
      "Failed discrepancy release must roll back occurrence release.",
    );
    await prisma.discrepancy.update({
      where: { id: discrepancy.id },
      data: { status: DiscrepancyStatus.CORRECTED_PENDING_RTS },
    });

    const otherBlocker = await prisma.discrepancy.create({
      data: { aircraftId: aircraft.id, discrepancyNumber: `DISC-${stamp}-2`, reportedById: maint1.id, status: DiscrepancyStatus.OPEN, title: "Independent blocker" },
    });
    await releaseMaintenanceOccurrence({ actorId: maint1.id, maintenanceEventId: correctiveEvent.id, note: "Maintenance Control review complete." });
    assert((await prisma.discrepancy.findUniqueOrThrow({ where: { id: discrepancy.id } })).status === DiscrepancyStatus.CLEARED, "Control release must clear corrected write-up.");
    assert(!(await serviceability(aircraft.id)).ready, "Control release must not override another open blocker.");
    await prisma.discrepancy.update({ where: { id: otherBlocker.id }, data: { status: DiscrepancyStatus.CANCELLED, voidReason: "Smoke cleanup", voidedAt: new Date(), voidedById: maint1.id } });

    const task = await prisma.maintenanceProgramTask.create({
      data: {
        category: "INSPECTION",
        createdById: admin.id,
        intervalDays: 30,
        requiredForServiceability: true,
        requiresIndependentInspection: false,
        taskKey: `mx002r.smoke.${stamp}`,
        title: "Smoke scheduled inspection",
      },
    });
    taskId = task.id;
    const planned = await planScheduledMaintenance({ actorId: admin.id, aircraftId: aircraft.id, note: "Plan only", plannedAt: new Date(Date.now() + 3_600_000), stationId: station.id, taskId: task.id });
    assert((await serviceability(aircraft.id)).ready, "Scheduled planning must not block availability.");
    assert((await prisma.aircraftLogbookEntry.count({ where: { maintenanceEventId: planned.id } })) === 0, "Planning must not create a logbook entry.");
    const started = await startScheduledMaintenance({ actorId: maint1.id, maintenanceEventId: planned.id });
    assert((await serviceability(aircraft.id)).label === "Maintenance in progress", "Starting scheduled maintenance must block.");
    await signAircraftLogbookEntry({ actorId: maint1.id, actorRole: maint1.role, entryId: started.entry.id, formData: signForm("MX One", AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL) });
    assert((await prisma.maintenanceComplianceState.findUniqueOrThrow({ where: { aircraftId_taskId: { aircraftId: aircraft.id, taskId: task.id } } })).status === MaintenanceComplianceStatus.CURRENT, "Scheduled approval must advance compliance.");
    assert((await serviceability(aircraft.id)).label === "MX release required", "Signed scheduled work must remain blocked pending control release.");
    await releaseMaintenanceOccurrence({ actorId: maint1.id, maintenanceEventId: planned.id, note: "Scheduled maintenance released." });
    assert((await serviceability(aircraft.id)).ready, "Scheduled work must become available after control release.");
    await prisma.maintenanceComplianceState.update({
      where: { aircraftId_taskId: { aircraftId: aircraft.id, taskId: task.id } },
      data: { status: MaintenanceComplianceStatus.OVERDUE },
    });
    assert(!(await serviceability(aircraft.id)).ready, "Overdue required work must block.");
    await prisma.maintenanceComplianceState.update({
      where: { aircraftId_taskId: { aircraftId: aircraft.id, taskId: task.id } },
      data: { status: MaintenanceComplianceStatus.CURRENT },
    });

    const entryCountBeforeHold = await prisma.aircraftLogbookEntry.count({ where: { aircraftId: aircraft.id } });
    const hold = await placeMaintenanceControlHold({ actorId: maint1.id, aircraftId: aircraft.id, reason: "Operational check", note: "No write-up yet." });
    assert((await serviceability(aircraft.id)).label === "MX hold", "Active MX hold must block.");
    assert((await prisma.aircraftLogbookEntry.count({ where: { aircraftId: aircraft.id } })) === entryCountBeforeHold, "MX hold must not create a logbook entry.");
    await expectReject(() => placeMaintenanceControlHold({ actorId: maint1.id, aircraftId: aircraft.id, reason: "Duplicate" }), "already has");
    await expectReject(
      () =>
        releaseMaintenanceControlHold({
          actorId: maint1.id,
          holdId: hold.id,
          noDefectOrMaintenanceConfirmed: false,
          releaseExplanation: "Attempt without attestation.",
        }),
      "Confirm",
    );
    await expectReject(
      () =>
        releaseMaintenanceControlHold({
          actorId: maint1.id,
          holdId: hold.id,
          noDefectOrMaintenanceConfirmed: true,
          releaseExplanation: "",
        }),
      "required",
    );
    await releaseMaintenanceControlHold({
      actorId: maint1.id,
      holdId: hold.id,
      noDefectOrMaintenanceConfirmed: true,
      releaseExplanation: "No defect found and no maintenance performed.",
    });
    assert((await serviceability(aircraft.id)).ready, "Direct hold release must restore availability when no other blockers exist.");

    const replacementPlanned = await planScheduledMaintenance({
      actorId: admin.id,
      aircraftId: aircraft.id,
      note: "Replacement occurrence",
      plannedAt: new Date(Date.now() + 7_200_000),
      stationId: station.id,
      taskId: task.id,
    });
    const scheduledHold = await placeMaintenanceControlHold({
      actorId: maint1.id,
      aircraftId: aircraft.id,
      reason: "Scheduled work identified",
    });
    await convertMaintenanceControlHoldToMaintenanceEvent({
      actorId: maint1.id,
      holdId: scheduledHold.id,
      maintenanceEventId: replacementPlanned.id,
    });
    assert(
      (await prisma.maintenanceControlHold.findUniqueOrThrow({ where: { id: scheduledHold.id } }))
        .status === MaintenanceControlHoldStatus.CONVERTED,
      "Hold must link to and convert into scheduled maintenance.",
    );
    assert(
      (await prisma.maintenanceEvent.findUniqueOrThrow({ where: { id: replacementPlanned.id } }))
        .status === "IN_PROGRESS",
      "Planned scheduled maintenance must start during hold conversion.",
    );
    assert(
      (await prisma.aircraftLogbookEntry.count({
        where: { maintenanceEventId: replacementPlanned.id },
      })) === 1,
      "Scheduled hold conversion must create the draft logbook entry.",
    );

    const convertedHold = await placeMaintenanceControlHold({ actorId: maint1.id, aircraftId: aircraft.id, reason: "Suspected defect" });
    const converted = await convertMaintenanceControlHoldToDiscrepancy({ actorId: maint1.id, holdId: convertedHold.id, title: "Converted defect" });
    assert((await prisma.maintenanceControlHold.findUniqueOrThrow({ where: { id: convertedHold.id } })).status === MaintenanceControlHoldStatus.CONVERTED, "Hold must close as converted.");
    assert((await serviceability(aircraft.id)).ready === false, "Conversion must not create an availability gap.");
    assert((await prisma.discrepancy.findUniqueOrThrow({ where: { id: converted.discrepancy.id } })).status === DiscrepancyStatus.OPEN, "Converted write-up must be open.");

    await expectReject(() => placeMaintenanceControlHold({ actorId: admin.id, aircraftId: aircraft.id, reason: "Admin hold" }), "Maintenance user");
    await expectReject(
      () => signAircraftLogbookEntry({ actorId: admin.id, actorRole: admin.role, entryId: converted.entry.id, formData: signForm("Admin", AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL) }),
      "maintenance users",
    );
    await expectReject(
      () => signAircraftLogbookEntry({ actorId: inactive.id, actorRole: inactive.role, entryId: converted.entry.id, formData: signForm("Inactive MX", AircraftLogbookSignaturePurpose.MAINTENANCE_APPROVAL) }),
      "active maintenance authority profile",
    );

    const surfaceFiles = [
      "app/maintenance/page.tsx",
      "app/aircraft/[aircraftId]/airworthiness/page.tsx",
      "app/aircraft/[aircraftId]/logbook/page.tsx",
    ];
    const surface = (await Promise.all(surfaceFiles.map((file) => readFile(join(process.cwd(), file), "utf8")))).join("\n");
    assert(!/work[\s-]?package/i.test(surface), "No work-package terminology may remain on maintenance surfaces.");
    assert(!/Create maintenance event/i.test(surface), "No standalone maintenance-event action may remain.");

    console.log("simplified maintenance lifecycle smoke: PASS");
  } finally {
    if (aircraftId) await prisma.aircraft.deleteMany({ where: { id: aircraftId } });
    if (taskId) await prisma.maintenanceProgramTask.deleteMany({ where: { id: taskId } });
    if (stationId) await prisma.station.deleteMany({ where: { id: stationId } });
    if (createdUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
