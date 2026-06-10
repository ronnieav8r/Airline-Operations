import {
  AircraftType,
  CrewCertificateType,
  CrewCheckEventType,
  CrewComplianceResult,
  CrewComplianceRecordStatus,
  CrewDutyPeriodStatus,
  CrewRecencyEventType,
  CrewRestPeriodStatus,
  CrewTrainingEventType,
  DutyStatus,
  MedicalCertificateClass,
  PrismaClient,
  SeatRole,
} from "@prisma/client";

const DEMO_NOTE = "Seeded demo crew compliance foundation.";

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

export async function seedCrewComplianceDemo(prisma: PrismaClient, anchor = new Date()) {
  const crewMembers = await prisma.crewMember.findMany({
    orderBy: { employeeNumber: "asc" },
    take: 5,
  });

  if (crewMembers.length === 0) {
    return {
      crewCertificates: 0,
      crewMedicals: 0,
      crewTrainingEvents: 0,
      crewCheckEvents: 0,
      crewRecencyEvents: 0,
      crewDutyPeriods: 0,
      crewRestPeriods: 0,
    };
  }

  const opsUser = await prisma.user.findUnique({
    where: { email: "ops@aeroops.local" },
    select: { id: true },
  });

  await prisma.crewRestPeriod.deleteMany({ where: { notes: DEMO_NOTE } });
  await prisma.crewDutyPeriod.deleteMany({ where: { notes: DEMO_NOTE } });
  await prisma.crewRecencyEvent.deleteMany({ where: { notes: DEMO_NOTE } });
  await prisma.crewCheckEvent.deleteMany({ where: { notes: DEMO_NOTE } });
  await prisma.crewTrainingEvent.deleteMany({ where: { notes: DEMO_NOTE } });
  await prisma.crewMedical.deleteMany({ where: { notes: DEMO_NOTE } });
  await prisma.crewCertificate.deleteMany({ where: { notes: DEMO_NOTE } });

  const createdById = opsUser?.id ?? null;
  const verifiedById = opsUser?.id ?? null;
  const verifiedAt = anchor;
  const [captainOne, firstOfficerOne, captainTwo, flightAttendantOne, cabinAttendantOne] =
    crewMembers;

  await prisma.crewCertificate.createMany({
    data: [
      {
        crewMemberId: captainOne.id,
        certificateType: CrewCertificateType.ATP,
        certificateNumber: "ATP-DEMO-1001",
        ratingOrEndorsement: "CL-65 type rating",
        aircraftType: AircraftType.CL_65,
        seatRole: SeatRole.CPT,
        issuingAuthority: "FAA",
        issuedAt: addMonths(anchor, -24),
        expiresAt: null,
        status: CrewComplianceRecordStatus.ACTIVE,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: firstOfficerOne.id,
        certificateType: CrewCertificateType.COMMERCIAL,
        certificateNumber: "COMM-DEMO-1002",
        ratingOrEndorsement: "CL-65 SIC privileges",
        aircraftType: AircraftType.CL_65,
        seatRole: SeatRole.FO,
        issuingAuthority: "FAA",
        issuedAt: addMonths(anchor, -30),
        expiresAt: null,
        status: CrewComplianceRecordStatus.ACTIVE,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: captainTwo.id,
        certificateType: CrewCertificateType.ATP,
        certificateNumber: "ATP-DEMO-1003",
        ratingOrEndorsement: "EMB-145 type rating",
        aircraftType: AircraftType.EMB_135_145,
        seatRole: SeatRole.CPT,
        issuingAuthority: "FAA",
        issuedAt: addMonths(anchor, -18),
        expiresAt: null,
        status: CrewComplianceRecordStatus.ACTIVE,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: flightAttendantOne.id,
        certificateType: CrewCertificateType.OTHER,
        certificateNumber: "FA-DEMO-1004",
        ratingOrEndorsement: "Cabin safety qualification",
        aircraftType: AircraftType.CL_65,
        seatRole: SeatRole.FA,
        issuingAuthority: "AeroOps Training",
        issuedAt: addMonths(anchor, -8),
        expiresAt: addMonths(anchor, 4),
        status: CrewComplianceRecordStatus.ACTIVE,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: cabinAttendantOne.id,
        certificateType: CrewCertificateType.OTHER,
        certificateNumber: "CA-DEMO-1005",
        ratingOrEndorsement: "Cabin attendant qualification",
        aircraftType: AircraftType.EMB_135_145,
        seatRole: SeatRole.CA,
        issuingAuthority: "AeroOps Training",
        issuedAt: addMonths(anchor, -16),
        expiresAt: addDays(anchor, -10),
        status: CrewComplianceRecordStatus.EXPIRED,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
    ],
  });

  await prisma.crewMedical.createMany({
    data: [
      {
        crewMemberId: captainOne.id,
        medicalClass: MedicalCertificateClass.FIRST_CLASS,
        issuedAt: addMonths(anchor, -2),
        expiresAt: addMonths(anchor, 4),
        status: CrewComplianceRecordStatus.ACTIVE,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: firstOfficerOne.id,
        medicalClass: MedicalCertificateClass.FIRST_CLASS,
        issuedAt: addMonths(anchor, -12),
        expiresAt: addDays(anchor, -5),
        limitations: "Expired demo record to drive warning-only checks.",
        status: CrewComplianceRecordStatus.EXPIRED,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: captainTwo.id,
        medicalClass: MedicalCertificateClass.FIRST_CLASS,
        issuedAt: addMonths(anchor, -1),
        expiresAt: addMonths(anchor, 5),
        status: CrewComplianceRecordStatus.ACTIVE,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
    ],
  });

  await prisma.crewTrainingEvent.createMany({
    data: [
      {
        crewMemberId: captainOne.id,
        trainingType: CrewTrainingEventType.RECURRENT,
        programName: "CL-65 recurrent training",
        aircraftType: AircraftType.CL_65,
        completedAt: addMonths(anchor, -3),
        expiresAt: addMonths(anchor, 9),
        result: CrewComplianceResult.SATISFACTORY,
        instructorName: "Demo Instructor",
        providerName: "AeroOps Training",
        status: CrewComplianceRecordStatus.ACTIVE,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: firstOfficerOne.id,
        trainingType: CrewTrainingEventType.RECURRENT,
        programName: "CL-65 recurrent training",
        aircraftType: AircraftType.CL_65,
        completedAt: addMonths(anchor, -15),
        expiresAt: addMonths(anchor, -3),
        result: CrewComplianceResult.SATISFACTORY,
        instructorName: "Demo Instructor",
        providerName: "AeroOps Training",
        status: CrewComplianceRecordStatus.EXPIRED,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: captainTwo.id,
        trainingType: CrewTrainingEventType.RECURRENT,
        programName: "EMB-145 recurrent training",
        aircraftType: AircraftType.EMB_135_145,
        completedAt: addMonths(anchor, -2),
        expiresAt: addMonths(anchor, 10),
        result: CrewComplianceResult.SATISFACTORY,
        instructorName: "Demo Instructor",
        providerName: "AeroOps Training",
        status: CrewComplianceRecordStatus.ACTIVE,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
    ],
  });

  await prisma.crewCheckEvent.createMany({
    data: [
      {
        crewMemberId: captainOne.id,
        checkType: CrewCheckEventType.PROFICIENCY,
        aircraftType: AircraftType.CL_65,
        seatRole: SeatRole.CPT,
        completedAt: addMonths(anchor, -2),
        expiresAt: addMonths(anchor, 10),
        result: CrewComplianceResult.SATISFACTORY,
        evaluatorName: "Demo Check Airman",
        status: CrewComplianceRecordStatus.ACTIVE,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: firstOfficerOne.id,
        checkType: CrewCheckEventType.INSTRUMENT_CHECK,
        aircraftType: AircraftType.CL_65,
        seatRole: SeatRole.FO,
        completedAt: addMonths(anchor, -14),
        expiresAt: addMonths(anchor, -2),
        result: CrewComplianceResult.SATISFACTORY,
        evaluatorName: "Demo Check Airman",
        status: CrewComplianceRecordStatus.EXPIRED,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: captainTwo.id,
        checkType: CrewCheckEventType.LINE_CHECK,
        aircraftType: AircraftType.EMB_135_145,
        seatRole: SeatRole.CPT,
        completedAt: addMonths(anchor, -1),
        expiresAt: addMonths(anchor, 11),
        result: CrewComplianceResult.SATISFACTORY,
        evaluatorName: "Demo Check Airman",
        status: CrewComplianceRecordStatus.ACTIVE,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
    ],
  });

  await prisma.crewRecencyEvent.createMany({
    data: [
      {
        crewMemberId: captainOne.id,
        recencyType: CrewRecencyEventType.TAKEOFF_LANDING,
        aircraftType: AircraftType.CL_65,
        seatRole: SeatRole.CPT,
        eventAt: addDays(anchor, -20),
        quantity: 3,
        windowStart: addDays(anchor, -90),
        windowEnd: anchor,
        result: CrewComplianceResult.SATISFACTORY,
        status: CrewComplianceRecordStatus.ACTIVE,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: firstOfficerOne.id,
        recencyType: CrewRecencyEventType.INSTRUMENT_APPROACH,
        aircraftType: AircraftType.CL_65,
        seatRole: SeatRole.FO,
        eventAt: addDays(anchor, -110),
        quantity: 1,
        windowStart: addDays(anchor, -180),
        windowEnd: anchor,
        result: CrewComplianceResult.INCOMPLETE,
        status: CrewComplianceRecordStatus.EXPIRED,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: captainTwo.id,
        recencyType: CrewRecencyEventType.TAKEOFF_LANDING,
        aircraftType: AircraftType.EMB_135_145,
        seatRole: SeatRole.CPT,
        eventAt: addDays(anchor, -14),
        quantity: 4,
        windowStart: addDays(anchor, -90),
        windowEnd: anchor,
        result: CrewComplianceResult.SATISFACTORY,
        status: CrewComplianceRecordStatus.ACTIVE,
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
    ],
  });

  await prisma.crewDutyPeriod.createMany({
    data: [
      {
        crewMemberId: captainOne.id,
        startsAt: addHours(anchor, -2),
        endsAt: addHours(anchor, 8),
        status: CrewDutyPeriodStatus.ACTIVE,
        dutyStatus: DutyStatus.ON_DUTY,
        source: "Demo schedule",
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: firstOfficerOne.id,
        startsAt: addHours(anchor, -2),
        endsAt: addHours(anchor, 8),
        status: CrewDutyPeriodStatus.ACTIVE,
        dutyStatus: DutyStatus.ON_DUTY,
        source: "Demo schedule",
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: captainTwo.id,
        startsAt: addHours(anchor, 1),
        endsAt: addHours(anchor, 9),
        status: CrewDutyPeriodStatus.PLANNED,
        dutyStatus: DutyStatus.RESERVE,
        source: "Demo schedule",
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
    ],
  });

  await prisma.crewRestPeriod.createMany({
    data: [
      {
        crewMemberId: captainOne.id,
        startsAt: addHours(anchor, -16),
        endsAt: addHours(anchor, -4),
        status: CrewRestPeriodStatus.COMPLETED,
        source: "Demo rest record",
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: firstOfficerOne.id,
        startsAt: addHours(anchor, -10),
        endsAt: addHours(anchor, -3),
        status: CrewRestPeriodStatus.COMPLETED,
        source: "Demo rest record with short-rest warning potential",
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
      {
        crewMemberId: captainTwo.id,
        startsAt: addHours(anchor, -18),
        endsAt: addHours(anchor, -6),
        status: CrewRestPeriodStatus.COMPLETED,
        source: "Demo rest record",
        createdById,
        verifiedById,
        verifiedAt,
        notes: DEMO_NOTE,
      },
    ],
  });

  const [
    crewCertificates,
    crewMedicals,
    crewTrainingEvents,
    crewCheckEvents,
    crewRecencyEvents,
    crewDutyPeriods,
    crewRestPeriods,
  ] = await Promise.all([
    prisma.crewCertificate.count({ where: { notes: DEMO_NOTE } }),
    prisma.crewMedical.count({ where: { notes: DEMO_NOTE } }),
    prisma.crewTrainingEvent.count({ where: { notes: DEMO_NOTE } }),
    prisma.crewCheckEvent.count({ where: { notes: DEMO_NOTE } }),
    prisma.crewRecencyEvent.count({ where: { notes: DEMO_NOTE } }),
    prisma.crewDutyPeriod.count({ where: { notes: DEMO_NOTE } }),
    prisma.crewRestPeriod.count({ where: { notes: DEMO_NOTE } }),
  ]);

  return {
    crewCertificates,
    crewMedicals,
    crewTrainingEvents,
    crewCheckEvents,
    crewRecencyEvents,
    crewDutyPeriods,
    crewRestPeriods,
  };
}

