import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  AircraftStatus,
  AircraftType,
  DutyStatus,
  EmploymentStatus,
  FlightStatus,
  IdDocumentType,
  PrismaClient,
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

async function main() {
  const now = new Date();
  const anchor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0),
  );

  const yesterday = addDays(anchor, -1);
  const today = anchor;
  const tomorrow = addDays(anchor, 1);

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
