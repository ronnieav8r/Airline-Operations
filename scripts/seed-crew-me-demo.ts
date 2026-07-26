import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  AircraftFuelEventType,
  AssignmentStatus,
  CrewScheduleEntryStatus,
  CrewSchedulePeriodStatus,
  CrewScheduleRequestStatus,
  CrewScheduleRequestType,
  DutyStatus,
  FlightLegStatus,
  FlightPhaseStatus,
  ManifestStatus,
  PrismaClient,
  ReleaseStatus,
  SeatRole,
  TimeOffRequestStatus,
  TimeOffRequestType,
  WeightBalanceStatus,
} from "@prisma/client";

const DEMO_LABEL = "CREW-ME-DEMO";

function loadLocalDatabaseUrl() {
  if (process.env.DATABASE_URL?.includes("127.0.0.1:5434")) {
    return;
  }

  const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const databaseUrl = envLocal
    .split(/\r?\n/)
    .find((line) => line.startsWith("DATABASE_URL="))
    ?.replace("DATABASE_URL=", "")
    .replace(/^"|"$/g, "");

  if (databaseUrl) {
    process.env.DATABASE_URL = databaseUrl;
  }
}

function assertLocalDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (databaseUrl.includes("127.0.0.1:5434")) {
    return;
  }

  if (process.env.AEROOPS_ALLOW_REMOTE_DEMO === "1") {
    return;
  }

  throw new Error("Refusing to seed crew app demo data unless DATABASE_URL points at local Postgres.");
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function atLocalHour(day: Date, hour: number, minute = 0) {
  const next = new Date(day);
  next.setHours(hour, minute, 0, 0);
  return next;
}

loadLocalDatabaseUrl();
assertLocalDatabase();

const prisma = new PrismaClient();

async function main() {
  const [crewUser, adminUser, firstOfficer, aircraft, stations, authority] = await Promise.all([
    prisma.user.findUnique({
      where: { email: "crew@aeroops.local" },
      select: {
        id: true,
        crewMember: {
          select: {
            id: true,
            employeeNumber: true,
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { email: "admin@aeroops.local" },
      select: { id: true },
    }),
    prisma.crewMember.findUnique({
      where: { employeeNumber: "CM-1002" },
      select: { id: true },
    }),
    prisma.aircraft.findFirst({
      where: { tailNumber: "N215AO" },
      select: { id: true },
    }),
    prisma.station.findMany({
      where: { code: { in: ["TEB", "BOS", "MIA", "DEN"] } },
      select: { code: true, id: true },
    }),
    prisma.operatingAuthority.findFirst({
      where: { revisions: { some: {} } },
      orderBy: { operatingPart: "asc" },
      select: {
        id: true,
        operatorId: true,
        revisions: {
          orderBy: { effectiveStart: "desc" },
          take: 1,
          select: { id: true },
        },
      },
    }),
  ]);

  const crew = crewUser?.crewMember;
  const revision = authority?.revisions[0];
  const stationByCode = Object.fromEntries(stations.map((station) => [station.code, station]));

  if (!crewUser || !crew) {
    throw new Error("crew@aeroops.local must exist and be linked to Jordan Miles.");
  }
  if (!adminUser) {
    throw new Error("admin@aeroops.local must exist before seeding crew app demo data.");
  }
  if (!firstOfficer) {
    throw new Error("Crew member CM-1002 must exist before seeding crew app demo data.");
  }
  if (!aircraft) {
    throw new Error("Aircraft N215AO must exist before seeding crew app demo data.");
  }
  if (!authority || !revision) {
    throw new Error("An operating authority with an authority revision is required.");
  }
  for (const code of ["TEB", "BOS", "MIA", "DEN"]) {
    if (!stationByCode[code]) {
      throw new Error(`Station ${code} must exist before seeding crew app demo data.`);
    }
  }

  const today = startOfToday();
  const periodStart = today;
  const periodEnd = addDays(today, 42);

  await prisma.$transaction(async (tx) => {
    const existingDemoLegs = await tx.flightLeg.findMany({
      where: { notes: { contains: DEMO_LABEL } },
      select: { id: true, legacyFlightId: true, tripOrMissionId: true },
    });
    const flightLegIds = existingDemoLegs.map((leg) => leg.id);
    const flightIds = existingDemoLegs.flatMap((leg) => (leg.legacyFlightId ? [leg.legacyFlightId] : []));
    const tripIds = existingDemoLegs.flatMap((leg) => (leg.tripOrMissionId ? [leg.tripOrMissionId] : []));

    if (flightLegIds.length > 0) {
      const existingOperationalRecords = await tx.operationalControlRecord.findMany({
        where: { flightLegId: { in: flightLegIds } },
        select: { id: true },
      });
      const operationalControlRecordIds = existingOperationalRecords.map((record) => record.id);

      if (operationalControlRecordIds.length > 0) {
        await tx.flightRelease.deleteMany({
          where: { operationalControlRecordId: { in: operationalControlRecordIds } },
        });
      }
      await tx.aircraftFuelEvent.deleteMany({ where: { flightLegId: { in: flightLegIds } } });
      await tx.operationalControlRecord.deleteMany({ where: { flightLegId: { in: flightLegIds } } });
      await tx.flightLeg.deleteMany({ where: { id: { in: flightLegIds } } });
    }
    if (flightIds.length > 0) {
      await tx.flight.deleteMany({ where: { id: { in: flightIds } } });
    }
    if (tripIds.length > 0) {
      await tx.tripOrMission.deleteMany({ where: { id: { in: tripIds } } });
    }

    await tx.crewSchedule.deleteMany({
      where: {
        crewMemberId: crew.id,
        notes: { contains: DEMO_LABEL },
      },
    });
    await tx.timeOffRequest.deleteMany({
      where: {
        crewMemberId: crew.id,
        reason: { contains: DEMO_LABEL },
      },
    });

    const existingPeriod = await tx.crewSchedulePeriod.findUnique({
      where: { periodKey: "crew-me-demo-current" },
      select: { id: true },
    });
    if (existingPeriod) {
      await tx.crewScheduleRequest.deleteMany({ where: { periodId: existingPeriod.id, crewMemberId: crew.id } });
      await tx.crewScheduleEntry.deleteMany({ where: { periodId: existingPeriod.id, crewMemberId: crew.id } });
    }

    await tx.crewMember.update({
      where: { id: crew.id },
      data: {
        dutyStatus: DutyStatus.ON_DUTY,
        hireDate: new Date("2021-04-12T00:00:00.000Z"),
        phone: "201-555-0148",
      },
    });
    await tx.crewMember.update({
      where: { id: firstOfficer.id },
      data: {
        email: "taylor.reed@aeroops.local",
        phone: "201-555-0199",
      },
    });

    await tx.crewQualification.upsert({
      where: {
        crewMemberId_aircraftType_seatRole: {
          aircraftType: "CL_65",
          crewMemberId: crew.id,
          seatRole: SeatRole.CPT,
        },
      },
      create: {
        aircraftType: "CL_65",
        crewMemberId: crew.id,
        expiresAt: addDays(today, 180),
        notes: `${DEMO_LABEL} CL-65 captain qualification.`,
        seatRole: SeatRole.CPT,
      },
      update: {
        expiresAt: addDays(today, 180),
        notes: `${DEMO_LABEL} CL-65 captain qualification.`,
      },
    });

    const period = await tx.crewSchedulePeriod.upsert({
      where: { periodKey: "crew-me-demo-current" },
      create: {
        bidCloseAt: addDays(today, 10),
        bidOpenAt: addDays(today, -2),
        createdById: adminUser.id,
        endsAt: periodEnd,
        name: "Crew App Demo Window",
        notes: `${DEMO_LABEL} schedule period for Jordan Miles crew app review.`,
        periodKey: "crew-me-demo-current",
        startsAt: periodStart,
        status: CrewSchedulePeriodStatus.BID_OPEN,
      },
      update: {
        bidCloseAt: addDays(today, 10),
        bidOpenAt: addDays(today, -2),
        createdById: adminUser.id,
        endsAt: periodEnd,
        name: "Crew App Demo Window",
        notes: `${DEMO_LABEL} schedule period for Jordan Miles crew app review.`,
        startsAt: periodStart,
        status: CrewSchedulePeriodStatus.BID_OPEN,
      },
    });

    const scheduleDays = [
      ...Array.from({ length: 14 }, (_value, day) => ({
        day,
        dutyStatus: DutyStatus.ON_DUTY,
        endHour: day === 0 ? 20 : day % 3 === 0 ? 19 : 18,
        notes:
          day === 0
            ? "Three-leg assigned flying day."
            : day % 3 === 0
              ? "Two-leg assigned flying day with late return."
              : "Two-leg assigned flying day.",
        startHour: day % 4 === 1 ? 6 : 7,
      })),
      { day: 16, dutyStatus: DutyStatus.RESERVE, endHour: 20, notes: "Reserve coverage.", startHour: 12 },
      { day: 18, dutyStatus: DutyStatus.TRAINING, endHour: 15, notes: "Recurrent systems module.", startHour: 9 },
      { day: 21, dutyStatus: DutyStatus.VACATION, endHour: null, notes: "Approved personal vacation block.", startHour: null },
    ];

    for (const item of scheduleDays) {
      const date = addDays(today, item.day);
      await tx.crewSchedule.create({
        data: {
          crewMemberId: crew.id,
          date,
          dutyStatus: item.dutyStatus,
          endsAt: item.endHour === null ? null : atLocalHour(date, item.endHour),
          notes: `${DEMO_LABEL} ${item.notes}`,
          startsAt: item.startHour === null ? null : atLocalHour(date, item.startHour),
          stationId: item.dutyStatus === DutyStatus.VACATION ? null : stationByCode.TEB.id,
        },
      });

      await tx.crewScheduleEntry.create({
        data: {
          createdById: adminUser.id,
          crewMemberId: crew.id,
          date,
          dutyStatus: item.dutyStatus,
          endsAt: item.endHour === null ? null : atLocalHour(date, item.endHour),
          notes: `${DEMO_LABEL} published crew app demo schedule entry.`,
          periodId: period.id,
          publishedAt: new Date(),
          publishedById: adminUser.id,
          startsAt: item.startHour === null ? null : atLocalHour(date, item.startHour),
          stationId: item.dutyStatus === DutyStatus.VACATION ? null : stationByCode.TEB.id,
          status: CrewScheduleEntryStatus.PUBLISHED,
        },
      });
    }

    await tx.timeOffRequest.create({
      data: {
        crewMemberId: crew.id,
        endDate: atLocalHour(addDays(today, 23), 23, 59),
        reason: `${DEMO_LABEL} Family event in Florida.`,
        requestType: TimeOffRequestType.PERSONAL,
        requestedById: crewUser.id,
        startDate: atLocalHour(addDays(today, 21), 0),
        status: TimeOffRequestStatus.PENDING,
      },
    });

    await tx.crewScheduleRequest.create({
      data: {
        crewMemberId: crew.id,
        endDate: addDays(today, 31),
        periodId: period.id,
        preferredDutyStatus: DutyStatus.RESERVE,
        requestNotes: `${DEMO_LABEL} Prefer reserve over assigned flying the final week of the window.`,
        requestType: CrewScheduleRequestType.PREFERRED_WORK_DAYS,
        startDate: addDays(today, 28),
        status: CrewScheduleRequestStatus.SUBMITTED,
        submittedById: crewUser.id,
      },
    });

    const demoPassengers: Array<{ id: string }> = [];

    for (let index = 0; index < 6; index += 1) {
      const firstName = "Demo";
      const lastName = `Passenger ${index + 1}`;
      const existingPassenger = await tx.passenger.findFirst({
        where: {
          firstName,
          lastName,
          notes: { contains: DEMO_LABEL },
        },
        select: { id: true },
      });
      const passengerData = {
        email: `demo.passenger.${index + 1}@aeroops.local`,
        firstName,
        lastName,
        notes: `${DEMO_LABEL} reusable passenger profile ${index + 1}.`,
        phone: `201-555-02${String(index + 1).padStart(2, "0")}`,
      };
      const passenger = existingPassenger
        ? await tx.passenger.update({
            where: { id: existingPassenger.id },
            data: passengerData,
            select: { id: true },
          })
        : await tx.passenger.create({
            data: passengerData,
            select: { id: true },
          });

      demoPassengers.push(passenger);
    }

    const routePairs = [
      [
        { arrival: "BOS", departure: "TEB" },
        { arrival: "TEB", departure: "BOS" },
      ],
      [
        { arrival: "MIA", departure: "TEB" },
        { arrival: "TEB", departure: "MIA" },
      ],
      [
        { arrival: "DEN", departure: "TEB" },
        { arrival: "TEB", departure: "DEN" },
      ],
      [
        { arrival: "MIA", departure: "BOS" },
        { arrival: "BOS", departure: "MIA" },
      ],
    ];
    const flightSpecs = [
      { arrival: "BOS", day: 0, departure: "TEB", flightNumber: "AO214", passengerCount: 3, startHour: 8, startMinute: 10 },
      { arrival: "MIA", day: 0, departure: "BOS", flightNumber: "AO378", passengerCount: 5, startHour: 11, startMinute: 40 },
      { arrival: "DEN", day: 0, departure: "TEB", flightNumber: "AO502", passengerCount: 2, startHour: 15, startMinute: 25 },
      ...Array.from({ length: 13 }, (_value, index) => {
        const day = index + 1;
        const [firstLeg, secondLeg] = routePairs[index % routePairs.length];

        return [
          {
            ...firstLeg,
            day,
            flightNumber: `AO${620 + day * 2}`,
            passengerCount: 2 + (day % 5),
            startHour: day % 4 === 1 ? 7 : 8,
            startMinute: day % 2 === 0 ? 20 : 5,
          },
          {
            ...secondLeg,
            day,
            flightNumber: `AO${621 + day * 2}`,
            passengerCount: 1 + ((day + 2) % 6),
            startHour: day % 3 === 0 ? 14 : 13,
            startMinute: day % 2 === 0 ? 45 : 25,
          },
        ];
      }).flat(),
    ];

    for (const spec of flightSpecs) {
      const day = addDays(today, spec.day);
      const scheduledDeparture = atLocalHour(day, spec.startHour, spec.startMinute);
      const scheduledArrival = new Date(scheduledDeparture);
      scheduledArrival.setHours(scheduledArrival.getHours() + 2, scheduledArrival.getMinutes() + 20, 0, 0);
      const flightIndex = flightSpecs.indexOf(spec);
      const hasFuelReady = flightIndex % 3 !== 1;
      const hasWeightBalance = flightIndex % 4 !== 2;
      const hasOpsRelease = flightIndex % 5 === 0;
      const fuelOnboardLbs = 9600 + (flightIndex % 9) * 550;
      const fuelDensity = "6.700";

      const legacyFlight = await tx.flight.create({
        data: {
          aircraftId: aircraft.id,
          arrivalStationId: stationByCode[spec.arrival].id,
          departureStationId: stationByCode[spec.departure].id,
          flightNumber: spec.flightNumber,
          notes: `${DEMO_LABEL} legacy flight bridge for Jordan Miles crew app.`,
          scheduledArrival,
          scheduledDeparture,
          status: "SCHEDULED",
        },
        select: { id: true },
      });

      const trip = await tx.tripOrMission.create({
        data: {
          customerName: "Crew App Demo Client",
          missionType: "Passenger charter",
          notes: `${DEMO_LABEL} trip for Jordan Miles crew app.`,
          operatorId: authority.operatorId,
          requestedEnd: scheduledArrival,
          requestedStart: scheduledDeparture,
          tripNumber: `CREWME-${spec.flightNumber}`,
        },
        select: { id: true },
      });

      const flightLeg = await tx.flightLeg.create({
        data: {
          arrivalStationId: stationByCode[spec.arrival].id,
          authorityRevisionId: revision.id,
          departureStationId: stationByCode[spec.departure].id,
          flightNumber: spec.flightNumber,
          legacyFlightId: legacyFlight.id,
          notes: `${DEMO_LABEL} assigned to Jordan Miles for crew app demo.`,
          operatingAuthorityId: authority.id,
          operatorId: authority.operatorId,
          scheduledArrival,
          scheduledDeparture,
          status: FlightLegStatus.SCHEDULED,
          tripOrMissionId: trip.id,
        },
        select: { id: true },
      });

      const operationalControlRecord = await tx.operationalControlRecord.create({
        data: {
          authorityRevisionId: revision.id,
          controlNotes: `${DEMO_LABEL} operational control record for crew release snapshot testing.`,
          controllingEntity: "AeroOps Dispatch",
          createdById: adminUser.id,
          flightLegId: flightLeg.id,
          operatingAuthorityId: authority.id,
          operatorId: authority.operatorId,
        },
        select: { id: true },
      });

      if (hasOpsRelease) {
        await tx.flightRelease.create({
          data: {
            operationalControlRecordId: operationalControlRecord.id,
            releasedAt: new Date(scheduledDeparture.getTime() - 90 * 60 * 1000),
            releasedById: adminUser.id,
            releaseNotes: `${DEMO_LABEL} released for crew app demo.`,
            status: ReleaseStatus.RELEASED,
          },
        });
      }

      await tx.aircraftAssignment.create({
        data: {
          aircraftId: aircraft.id,
          assignedAt: scheduledDeparture,
          assignedById: adminUser.id,
          flightLegId: flightLeg.id,
          notes: `${DEMO_LABEL} aircraft assignment.`,
          status: AssignmentStatus.ACTIVE,
        },
      });

      await tx.crewLegAssignment.create({
        data: {
          assignedById: adminUser.id,
          crewMemberId: crew.id,
          flightLegId: flightLeg.id,
          notes: `${DEMO_LABEL} Jordan Miles assigned as captain.`,
          reportTime: new Date(scheduledDeparture.getTime() - 60 * 60 * 1000),
          releaseTime: new Date(scheduledArrival.getTime() + 45 * 60 * 1000),
          seatRole: SeatRole.CPT,
          status: AssignmentStatus.ACTIVE,
        },
      });
      await tx.crewLegAssignment.create({
        data: {
          assignedById: adminUser.id,
          crewMemberId: firstOfficer.id,
          flightLegId: flightLeg.id,
          notes: `${DEMO_LABEL} Taylor Reed assigned as first officer.`,
          reportTime: new Date(scheduledDeparture.getTime() - 60 * 60 * 1000),
          releaseTime: new Date(scheduledArrival.getTime() + 45 * 60 * 1000),
          seatRole: SeatRole.FO,
          status: AssignmentStatus.ACTIVE,
        },
      });

      await tx.flightPreflightRecord.create({
        data: {
          flightLegId: flightLeg.id,
          manifestNotes: `${DEMO_LABEL} crew app preflight demo.`,
          notes: "Preflight remains open for crew review.",
          status: FlightPhaseStatus.NOT_STARTED,
        },
      });

      const manifest = await tx.manifest.create({
        data: {
          flightLegId: flightLeg.id,
          status: flightIndex % 6 === 4 ? ManifestStatus.DRAFT : ManifestStatus.READY,
        },
        select: { id: true },
      });

      await tx.manifestItem.createMany({
        data: Array.from({ length: spec.passengerCount }, (_value, index) => ({
          baggageWeight: 20 + index * 3,
          manifestId: manifest.id,
          notes: `${DEMO_LABEL} crew app passenger ${index + 1}.`,
          passengerId: demoPassengers[index].id,
          seatNumber: `${index + 1}A`,
          weight: 175 + index * 4,
        })),
      });

      if (hasFuelReady) {
        await tx.aircraftFuelEvent.create({
          data: {
            aircraftId: aircraft.id,
            eventType: AircraftFuelEventType.RELEASE_ONBOARD,
            flightLegId: flightLeg.id,
            fuelDensityLbsPerGallon: fuelDensity,
            fueledReady: true,
            fuelOnboardGallons: String(Math.round((fuelOnboardLbs / Number(fuelDensity)) * 100) / 100),
            fuelOnboardLbs: String(fuelOnboardLbs),
            notes: `${DEMO_LABEL} release fuel loaded for crew app demo.`,
            recordedAt: new Date(scheduledDeparture.getTime() - 75 * 60 * 1000),
            recordedById: crewUser.id,
          },
        });
      }

      if (hasWeightBalance) {
        await tx.weightBalanceRun.create({
          data: {
            approvedAt: flightIndex % 2 === 0 ? new Date(scheduledDeparture.getTime() - 50 * 60 * 1000) : null,
            approvedById: flightIndex % 2 === 0 ? adminUser.id : null,
            calculatedAt: new Date(scheduledDeparture.getTime() - 65 * 60 * 1000),
            calculatedById: adminUser.id,
            calculationSnapshot: {
              demoLabel: DEMO_LABEL,
              passengerCount: spec.passengerCount,
              fuelOnboardLbs,
            },
            centerOfGravity: `${19 + (flightIndex % 6) / 10}% MAC`,
            flightLegId: flightLeg.id,
            landingWeight: String(39200 + (flightIndex % 6) * 180),
            manifestId: manifest.id,
            runLabel: "Demo W&B",
            status: flightIndex % 2 === 0 ? WeightBalanceStatus.APPROVED : WeightBalanceStatus.CALCULATED,
            takeoffWeight: String(42100 + (flightIndex % 7) * 220),
          },
        });
      }
    }
  });

  const [scheduleCount, entryCount, flightCount, requestCount, timeOffCount] = await Promise.all([
    prisma.crewSchedule.count({ where: { crewMemberId: crew.id, notes: { contains: DEMO_LABEL } } }),
    prisma.crewScheduleEntry.count({ where: { crewMemberId: crew.id, notes: { contains: DEMO_LABEL } } }),
    prisma.flightLeg.count({ where: { notes: { contains: DEMO_LABEL } } }),
    prisma.crewScheduleRequest.count({ where: { crewMemberId: crew.id, requestNotes: { contains: DEMO_LABEL } } }),
    prisma.timeOffRequest.count({ where: { crewMemberId: crew.id, reason: { contains: DEMO_LABEL } } }),
  ]);

  console.log(
    `Seeded ${DEMO_LABEL} for Jordan Miles: ${scheduleCount} schedule rows, ${entryCount} entries, ${flightCount} flights, ${requestCount} schedule request, ${timeOffCount} time-off request.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
