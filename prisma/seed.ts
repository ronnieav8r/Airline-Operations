import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  AircraftStatus,
  AircraftType,
  DutyStatus,
  EmploymentStatus,
  AuthorityStatus,
  FlightStatus,
  IdDocumentType,
  OperatingPart,
  PrismaClient,
  ReleaseStatus,
  SeatRole,
  TimeOffRequestStatus,
  TimeOffRequestType,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addHours(date: Date, hours: number): Date {
  const next = new Date(date);
  next.setUTCHours(next.getUTCHours() + hours);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

async function main() {
  const now = new Date();
  const anchor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0),
  );

  const yesterday = addDays(anchor, -1);
  const today = anchor;
  const tomorrow = addDays(anchor, 1);

  await prisma.flightRelease.deleteMany();
  await prisma.operationalControlRecord.deleteMany();
  await prisma.manualRevision.deleteMany();
  await prisma.manual.deleteMany();
  await prisma.authorityRevision.deleteMany();
  await prisma.operatingAuthority.deleteMany();
  await prisma.operator.deleteMany();
  await prisma.flightPassenger.deleteMany();
  await prisma.passenger.deleteMany();
  await prisma.crewFlightLog.deleteMany();
  await prisma.crewSchedule.deleteMany();
  await prisma.aircraftCrewAssignment.deleteMany();
  await prisma.crewQualification.deleteMany();
  await prisma.timeOffRequest.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.crewMember.deleteMany();
  await prisma.aircraft.deleteMany();
  await prisma.dutyRule.deleteMany();
  await prisma.station.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();

  const [adminUser, opsUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@aeroops.local",
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        email: "ops@aeroops.local",
        role: UserRole.OPS,
      },
    }),
  ]);

  await prisma.userProfile.createMany({
    data: [
      {
        userId: adminUser.id,
        firstName: "Alex",
        lastName: "Bennett",
        phone: "555-0100",
      },
      {
        userId: opsUser.id,
        firstName: "Morgan",
        lastName: "Keller",
        phone: "555-0101",
      },
    ],
  });

  await prisma.station.createMany({
    data: [
      {
        code: "TEB",
        name: "Teterboro Airport",
        city: "Teterboro",
        state: "NJ",
        timezone: "America/New_York",
      },
      {
        code: "HPN",
        name: "Westchester County Airport",
        city: "White Plains",
        state: "NY",
        timezone: "America/New_York",
      },
      {
        code: "BOS",
        name: "Logan International Airport",
        city: "Boston",
        state: "MA",
        timezone: "America/New_York",
      },
    ],
  });

  const stations = await prisma.station.findMany();
  const stationByCode = Object.fromEntries(stations.map((station) => [station.code, station]));

  const [acOne, acTwo] = await Promise.all([
    prisma.aircraft.create({
      data: {
        tailNumber: "N215AO",
        name: "AeroOps One",
        type: AircraftType.CL_65,
        status: AircraftStatus.AVAILABLE,
        homeStationId: stationByCode.TEB.id,
        seats: 50,
      },
    }),
    prisma.aircraft.create({
      data: {
        tailNumber: "N407AO",
        name: "AeroOps Two",
        type: AircraftType.EMB_135_145,
        status: AircraftStatus.RESERVED,
        homeStationId: stationByCode.HPN.id,
        seats: 37,
      },
    }),
  ]);

  const crewMembers = await Promise.all([
    prisma.crewMember.create({
      data: {
        employeeNumber: "CM-1001",
        firstName: "Jordan",
        lastName: "Miles",
        baseStationId: stationByCode.TEB.id,
        employmentStatus: EmploymentStatus.ACTIVE,
        dutyStatus: DutyStatus.ON_DUTY,
        email: "jordan.miles@aeroops.local",
      },
    }),
    prisma.crewMember.create({
      data: {
        employeeNumber: "CM-1002",
        firstName: "Taylor",
        lastName: "Reed",
        baseStationId: stationByCode.TEB.id,
        employmentStatus: EmploymentStatus.ACTIVE,
        dutyStatus: DutyStatus.ON_DUTY,
        email: "taylor.reed@aeroops.local",
      },
    }),
    prisma.crewMember.create({
      data: {
        employeeNumber: "CM-1003",
        firstName: "Sam",
        lastName: "Ortega",
        baseStationId: stationByCode.HPN.id,
        employmentStatus: EmploymentStatus.ACTIVE,
        dutyStatus: DutyStatus.RESERVE,
        email: "sam.ortega@aeroops.local",
      },
    }),
    prisma.crewMember.create({
      data: {
        employeeNumber: "CM-1004",
        firstName: "Riley",
        lastName: "Park",
        baseStationId: stationByCode.BOS.id,
        employmentStatus: EmploymentStatus.ACTIVE,
        dutyStatus: DutyStatus.OFF_DUTY,
        email: "riley.park@aeroops.local",
      },
    }),
    prisma.crewMember.create({
      data: {
        employeeNumber: "CM-1005",
        firstName: "Casey",
        lastName: "Nguyen",
        baseStationId: stationByCode.HPN.id,
        employmentStatus: EmploymentStatus.ON_LEAVE,
        dutyStatus: DutyStatus.VACATION,
        email: "casey.nguyen@aeroops.local",
      },
    }),
  ]);

  const [captainOne, firstOfficerOne, captainTwo, flightAttendantOne, cabinAttendantOne] =
    crewMembers;

  await prisma.crewQualification.createMany({
    data: [
      {
        crewMemberId: captainOne.id,
        aircraftType: AircraftType.CL_65,
        seatRole: SeatRole.CPT,
        issuedAt: addDays(today, -120),
        expiresAt: addDays(today, 240),
      },
      {
        crewMemberId: firstOfficerOne.id,
        aircraftType: AircraftType.CL_65,
        seatRole: SeatRole.FO,
        issuedAt: addDays(today, -400),
        expiresAt: addDays(today, -3),
        notes: "Expired qualification to drive warning behavior.",
      },
      {
        crewMemberId: captainTwo.id,
        aircraftType: AircraftType.EMB_135_145,
        seatRole: SeatRole.CPT,
        issuedAt: addDays(today, -60),
        expiresAt: addDays(today, 300),
      },
      {
        crewMemberId: flightAttendantOne.id,
        aircraftType: AircraftType.CL_65,
        seatRole: SeatRole.FA,
        issuedAt: addDays(today, -40),
        expiresAt: addDays(today, 365),
      },
      {
        crewMemberId: cabinAttendantOne.id,
        aircraftType: AircraftType.EMB_135_145,
        seatRole: SeatRole.CA,
        issuedAt: addDays(today, -200),
        expiresAt: addDays(today, 120),
      },
    ],
  });

  await prisma.aircraftCrewAssignment.createMany({
    data: [
      {
        aircraftId: acOne.id,
        crewMemberId: captainOne.id,
        seatRole: SeatRole.CPT,
        startsAt: addDays(today, -2),
        isActive: true,
        assignedById: opsUser.id,
        notes: "Primary captain block assignment.",
      },
      {
        aircraftId: acOne.id,
        crewMemberId: firstOfficerOne.id,
        seatRole: SeatRole.FO,
        startsAt: addDays(today, -2),
        isActive: true,
        assignedById: opsUser.id,
      },
      {
        aircraftId: acOne.id,
        crewMemberId: flightAttendantOne.id,
        seatRole: SeatRole.FA,
        startsAt: addDays(today, -2),
        isActive: true,
        assignedById: opsUser.id,
      },
      {
        aircraftId: acTwo.id,
        crewMemberId: captainTwo.id,
        seatRole: SeatRole.CPT,
        startsAt: addDays(today, -1),
        isActive: true,
        assignedById: opsUser.id,
      },
      {
        aircraftId: acTwo.id,
        crewMemberId: cabinAttendantOne.id,
        seatRole: SeatRole.CA,
        startsAt: addDays(today, -1),
        isActive: true,
        assignedById: opsUser.id,
        notes: "No FO assigned to this aircraft to trigger coverage warning.",
      },
    ],
  });

  const flights = await Promise.all([
    prisma.flight.create({
      data: {
        flightNumber: "AO101",
        aircraftId: acOne.id,
        departureStationId: stationByCode.TEB.id,
        arrivalStationId: stationByCode.HPN.id,
        scheduledDeparture: addHours(yesterday, -3),
        scheduledArrival: addHours(yesterday, -2),
        actualDeparture: addHours(yesterday, -3),
        actualArrival: addHours(yesterday, -2),
        status: FlightStatus.COMPLETE,
      },
    }),
    prisma.flight.create({
      data: {
        flightNumber: "AO202",
        aircraftId: acTwo.id,
        departureStationId: stationByCode.HPN.id,
        arrivalStationId: stationByCode.BOS.id,
        scheduledDeparture: addHours(today, 2),
        scheduledArrival: addHours(today, 3),
        status: FlightStatus.SCHEDULED,
      },
    }),
    prisma.flight.create({
      data: {
        flightNumber: "AO303",
        aircraftId: acOne.id,
        departureStationId: stationByCode.BOS.id,
        arrivalStationId: stationByCode.TEB.id,
        scheduledDeparture: addHours(today, 6),
        scheduledArrival: addHours(today, 7),
        status: FlightStatus.DELAYED,
      },
    }),
    prisma.flight.create({
      data: {
        flightNumber: "AO404",
        aircraftId: acTwo.id,
        departureStationId: stationByCode.TEB.id,
        arrivalStationId: stationByCode.HPN.id,
        scheduledDeparture: addHours(tomorrow, 1),
        scheduledArrival: addHours(tomorrow, 2),
        status: FlightStatus.SCHEDULED,
      },
    }),
    prisma.flight.create({
      data: {
        flightNumber: "AO505",
        aircraftId: acOne.id,
        departureStationId: stationByCode.HPN.id,
        arrivalStationId: stationByCode.BOS.id,
        scheduledDeparture: addHours(tomorrow, 4),
        scheduledArrival: addHours(tomorrow, 5),
        status: FlightStatus.SCHEDULED,
      },
    }),
  ]);

  const operator = await prisma.operator.upsert({
    where: { code: "AO" },
    update: {
      name: "AeroOps Charter",
      isActive: true,
    },
    create: {
      name: "AeroOps Charter",
      code: "AO",
      isActive: true,
    },
  });

  const [authority91, authority135] = await Promise.all([
    prisma.operatingAuthority.upsert({
      where: {
        operatorId_operatingPart: {
          operatorId: operator.id,
          operatingPart: OperatingPart.PART_91,
        },
      },
      update: {
        status: AuthorityStatus.ACTIVE,
        displayName: "Part 91 - Corporate Operations",
      },
      create: {
        operatorId: operator.id,
        operatingPart: OperatingPart.PART_91,
        displayName: "Part 91 - Corporate Operations",
        status: AuthorityStatus.ACTIVE,
      },
    }),
    prisma.operatingAuthority.upsert({
      where: {
        operatorId_operatingPart: {
          operatorId: operator.id,
          operatingPart: OperatingPart.PART_135,
        },
      },
      update: {
        status: AuthorityStatus.ACTIVE,
        displayName: "Part 135 - Charter Operations",
      },
      create: {
        operatorId: operator.id,
        operatingPart: OperatingPart.PART_135,
        displayName: "Part 135 - Charter Operations",
        status: AuthorityStatus.ACTIVE,
      },
    }),
  ]);

  const [revision91, revision135] = await Promise.all([
    prisma.authorityRevision.upsert({
      where: {
        operatingAuthorityId_revisionLabel: {
          operatingAuthorityId: authority91.id,
          revisionLabel: "P91-2026-Q2",
        },
      },
      update: {
        status: AuthorityStatus.ACTIVE,
        effectiveStart: addMonths(anchor, -6),
        effectiveEnd: null,
      },
      create: {
        operatingAuthorityId: authority91.id,
        revisionLabel: "P91-2026-Q2",
        effectiveStart: addMonths(anchor, -6),
        status: AuthorityStatus.ACTIVE,
        notes: "Initial part-91 operational compliance baseline.",
      },
    }),
    prisma.authorityRevision.upsert({
      where: {
        operatingAuthorityId_revisionLabel: {
          operatingAuthorityId: authority135.id,
          revisionLabel: "P135-2026-Q2",
        },
      },
      update: {
        status: AuthorityStatus.ACTIVE,
        effectiveStart: addMonths(anchor, -6),
        effectiveEnd: null,
      },
      create: {
        operatingAuthorityId: authority135.id,
        revisionLabel: "P135-2026-Q2",
        effectiveStart: addMonths(anchor, -6),
        status: AuthorityStatus.ACTIVE,
        notes: "Initial part-135 operational compliance baseline.",
      },
    }),
  ]);

  const [manual91, manual135] = await Promise.all([
    prisma.manual.upsert({
      where: {
        operatingAuthorityId_name: {
          operatingAuthorityId: authority91.id,
          name: "AeroOps Operations Manual",
        },
      },
      update: {
        documentIdentifier: "AO-MAN-91",
        publishedAt: addMonths(anchor, 1),
      },
      create: {
        operatingAuthorityId: authority91.id,
        name: "AeroOps Operations Manual",
        documentIdentifier: "AO-MAN-91",
        publishedAt: addMonths(anchor, 1),
      },
    }),
    prisma.manual.upsert({
      where: {
        operatingAuthorityId_name: {
          operatingAuthorityId: authority135.id,
          name: "AeroOps Operations Manual",
        },
      },
      update: {
        documentIdentifier: "AO-MAN-135",
        publishedAt: addMonths(anchor, 1),
      },
      create: {
        operatingAuthorityId: authority135.id,
        name: "AeroOps Operations Manual",
        documentIdentifier: "AO-MAN-135",
        publishedAt: addMonths(anchor, 1),
      },
    }),
  ]);

  await Promise.all([
    prisma.manualRevision.upsert({
      where: {
        manualId_revisionLabel: {
          manualId: manual91.id,
          revisionLabel: "1.0",
        },
      },
      update: {
        revisionDate: addMonths(anchor, -6),
        effectiveStart: addMonths(anchor, -6),
        effectiveEnd: null,
        notes: "Baseline manual revision for part 91 startup.",
      },
      create: {
        manualId: manual91.id,
        revisionLabel: "1.0",
        revisionDate: addMonths(anchor, -6),
        effectiveStart: addMonths(anchor, -6),
        effectiveEnd: null,
        notes: "Baseline manual revision for part 91 startup.",
      },
    }),
    prisma.manualRevision.upsert({
      where: {
        manualId_revisionLabel: {
          manualId: manual135.id,
          revisionLabel: "1.0",
        },
      },
      update: {
        revisionDate: addMonths(anchor, -6),
        effectiveStart: addMonths(anchor, -6),
        effectiveEnd: null,
        notes: "Baseline manual revision for part 135 startup.",
      },
      create: {
        manualId: manual135.id,
        revisionLabel: "1.0",
        revisionDate: addMonths(anchor, -6),
        effectiveStart: addMonths(anchor, -6),
        effectiveEnd: null,
        notes: "Baseline manual revision for part 135 startup.",
      },
    }),
  ]);

  const flightControlBlueprints = [
    {
      flightId: flights[0].id,
      authority: authority91,
      revision: revision91,
      controllingEntity: "AeroOps Flight Ops - AO Dispatch",
      controlNotes: "Corporate part 91 release policy path.",
      releaseStatus: ReleaseStatus.RELEASED,
    },
    {
      flightId: flights[1].id,
      authority: authority135,
      revision: revision135,
      controllingEntity: "AeroOps Dispatch - Part 135 Desk",
      controlNotes: "Charter flight under Part 135 authority.",
      releaseStatus: ReleaseStatus.RELEASED,
    },
    {
      flightId: flights[2].id,
      authority: authority91,
      revision: revision91,
      controllingEntity: "AeroOps Dispatch - AO Ops Desk",
      controlNotes: "Part 91 operation with known scheduling risk.",
      releaseStatus: ReleaseStatus.PLANNED,
    },
    {
      flightId: flights[3].id,
      authority: authority135,
      revision: revision135,
      controllingEntity: "AeroOps Dispatch - Part 135 Desk",
      controlNotes: "Future charter slot with planned release.",
      releaseStatus: ReleaseStatus.PLANNED,
    },
    {
      flightId: flights[4].id,
      authority: authority91,
      revision: revision91,
      controllingEntity: "AeroOps Dispatch - AO Ops Desk",
      controlNotes: "Corporate route with planned release.",
      releaseStatus: ReleaseStatus.PLANNED,
    },
  ];

  for (const control of flightControlBlueprints) {
    const controlRecord = await prisma.operationalControlRecord.upsert({
      where: { flightId: control.flightId },
      create: {
        flightId: control.flightId,
        operatorId: operator.id,
        operatingAuthorityId: control.authority.id,
        authorityRevisionId: control.revision.id,
        controllingEntity: control.controllingEntity,
        controlNotes: control.controlNotes,
        createdById: opsUser.id,
      },
      update: {
        operatorId: operator.id,
        operatingAuthorityId: control.authority.id,
        authorityRevisionId: control.revision.id,
        controllingEntity: control.controllingEntity,
        controlNotes: control.controlNotes,
        createdById: opsUser.id,
      },
    });

    await prisma.flightRelease.upsert({
      where: { operationalControlRecordId: controlRecord.id },
      create: {
        operationalControlRecordId: controlRecord.id,
        status: control.releaseStatus,
        releasedById: opsUser.id,
        releasedAt:
          control.releaseStatus === ReleaseStatus.RELEASED ? addHours(anchor, -1) : null,
        releaseNotes: `Auto-seeded ${control.releaseStatus.toLowerCase()} status for ${control.flightId}.`,
      },
      update: {
        status: control.releaseStatus,
        releasedById: opsUser.id,
        releasedAt:
          control.releaseStatus === ReleaseStatus.RELEASED ? addHours(anchor, -1) : null,
        releaseNotes: `Auto-seeded ${control.releaseStatus.toLowerCase()} status for ${control.flightId}.`,
      },
    });
  }

  await prisma.crewSchedule.createMany({
    data: [
      {
        crewMemberId: captainOne.id,
        stationId: stationByCode.TEB.id,
        date: today,
        dutyStatus: DutyStatus.ON_DUTY,
        startsAt: addHours(today, -2),
        endsAt: addHours(today, 8),
      },
      {
        crewMemberId: firstOfficerOne.id,
        stationId: stationByCode.TEB.id,
        date: today,
        dutyStatus: DutyStatus.ON_DUTY,
        startsAt: addHours(today, -2),
        endsAt: addHours(today, 8),
      },
      {
        crewMemberId: captainTwo.id,
        stationId: stationByCode.HPN.id,
        date: today,
        dutyStatus: DutyStatus.RESERVE,
        startsAt: addHours(today, 1),
        endsAt: addHours(today, 9),
      },
    ],
  });

  await prisma.crewFlightLog.createMany({
    data: [
      {
        crewMemberId: captainOne.id,
        flightId: flights[0].id,
        seatRole: SeatRole.CPT,
        reportTime: addHours(yesterday, -4),
        releaseTime: addHours(yesterday, -1),
      },
      {
        crewMemberId: firstOfficerOne.id,
        flightId: flights[0].id,
        seatRole: SeatRole.FO,
        reportTime: addHours(yesterday, -4),
        releaseTime: addHours(yesterday, -1),
      },
    ],
  });

  const passengers = await prisma.passenger.createManyAndReturn({
    data: [
      {
        firstName: "Olivia",
        lastName: "Diaz",
        email: "olivia.diaz@example.com",
        idDocumentType: IdDocumentType.PASSPORT,
        idDocumentNumber: "P1234501",
      },
      {
        firstName: "Noah",
        lastName: "Brooks",
        email: "noah.brooks@example.com",
        idDocumentType: IdDocumentType.DRIVERS_LICENSE,
        idDocumentNumber: "D9988771",
      },
      {
        firstName: "Ava",
        lastName: "Flores",
        idDocumentType: IdDocumentType.STATE_ID,
        idDocumentNumber: "S4422109",
      },
    ],
  });

  await prisma.flightPassenger.createMany({
    data: [
      {
        flightId: flights[1].id,
        passengerId: passengers[0].id,
        seatNumber: "3A",
      },
      {
        flightId: flights[1].id,
        passengerId: passengers[1].id,
        seatNumber: "3C",
      },
      {
        flightId: flights[2].id,
        passengerId: passengers[2].id,
        seatNumber: "1D",
      },
    ],
  });

  await prisma.timeOffRequest.create({
    data: {
      crewMemberId: cabinAttendantOne.id,
      requestType: TimeOffRequestType.VACATION,
      status: TimeOffRequestStatus.PENDING,
      startDate: addDays(today, 7),
      endDate: addDays(today, 11),
      reason: "Family travel",
      requestedById: opsUser.id,
    },
  });

  await prisma.alert.createMany({
    data: [
      {
        type: AlertType.CREW_SHORTAGE,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.ACTIVE,
        title: "FO Coverage Gap",
        message:
          "Aircraft N407AO has no active FO assignment for upcoming departures.",
        aircraftId: acTwo.id,
        flightId: flights[1].id,
        createdById: opsUser.id,
      },
      {
        type: AlertType.GENERAL,
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.ACTIVE,
        title: "Qualification Expired",
        message:
          "CM-1002 has an expired CL_65 FO qualification but remains scheduled.",
        crewMemberId: firstOfficerOne.id,
        createdById: adminUser.id,
      },
    ],
  });

  await prisma.dutyRule.createMany({
    data: [
      {
        name: "FAA Part 135 Daily Duty",
        description: "Maximum duty period threshold for standard operations.",
        maxDutyHours: 14,
        minRestHours: 10,
      },
      {
        name: "Crew Rest Baseline",
        description: "Minimum rest window between duty periods.",
        minRestHours: 10,
        maxConsecutiveDays: 6,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
