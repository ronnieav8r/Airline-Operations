"use server";

import {
  CrewPlanningDraftChangeStatus,
  CrewPlanningDraftChangeType,
  CrewPlanningDraftStatus,
  CrewScheduleEntryStatus,
  CrewSchedulePeriodStatus,
  DutyStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type DraftWindowInput = {
  periodId?: string | null;
  viewEnd: string;
  viewStart: string;
};

type DraftChangeInput = DraftWindowInput & {
  changeId?: string | null;
  changeType: CrewPlanningDraftChangeType;
  crewMemberId: string;
  date: string;
  dutyStatus?: DutyStatus | null;
  endDate: string;
  selectedForPublish?: boolean;
  sourcePublishedEntryId?: string | null;
  stationId?: string | null;
};

type ReusableTemplateDayInput = {
  dayNumber: number;
  dutyStatus: DutyStatus;
};

type ReusableTemplateInput = {
  days: ReusableTemplateDayInput[];
  name: string;
};

type PublishableDraftChange = {
  changeType: CrewPlanningDraftChangeType;
  crewMemberId: string;
  date: Date;
  dutyStatus: DutyStatus | null;
  endDate: Date;
  id: string;
};

function parseDate(value: string, label: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD.`);
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return date;
}

function inputDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate(),
  ).padStart(2, "0")}`;
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function eachDayInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let day = new Date(start); day <= end; day = addDays(day, 1)) {
    days.push(new Date(day));
  }
  return days;
}

function blocksOverlap(first: Pick<PublishableDraftChange, "date" | "endDate">, second: Pick<PublishableDraftChange, "date" | "endDate">) {
  return first.date <= second.endDate && second.date <= first.endDate;
}

function conflictingPublishChangeIds(changes: PublishableDraftChange[]): string[] {
  const publishableChanges = changes
    .filter((change) => change.changeType !== CrewPlanningDraftChangeType.REMOVE && change.dutyStatus)
    .sort((first, second) => first.crewMemberId.localeCompare(second.crewMemberId) || first.date.getTime() - second.date.getTime());
  const conflictingIds = new Set<string>();
  const openByCrew = new Map<string, PublishableDraftChange[]>();

  for (const change of publishableChanges) {
    const openChanges = (openByCrew.get(change.crewMemberId) ?? []).filter((openChange) => openChange.endDate >= change.date);

    for (const openChange of openChanges) {
      if (blocksOverlap(openChange, change)) {
        conflictingIds.add(openChange.id);
        conflictingIds.add(change.id);
      }
    }

    openChanges.push(change);
    openByCrew.set(change.crewMemberId, openChanges);
  }

  return Array.from(conflictingIds);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function currentActorId(): Promise<string | null> {
  const currentUser = await getCurrentUser();
  return currentUser?.id ?? null;
}

async function ensurePlanningDraft(input: DraftWindowInput, userId: string | null) {
  const viewStart = parseDate(input.viewStart, "Window start");
  const viewEnd = parseDate(input.viewEnd, "Window end");
  const existingPeriod = input.periodId
    ? await prisma.crewSchedulePeriod.findUnique({
        where: { id: input.periodId },
        select: { id: true, name: true, periodKey: true },
      })
    : await prisma.crewSchedulePeriod.findFirst({
        where: {
          endsAt: { gt: viewStart },
          startsAt: { lt: viewEnd },
          status: { not: CrewSchedulePeriodStatus.ARCHIVED },
        },
        orderBy: [{ startsAt: "asc" }],
        select: { id: true, name: true, periodKey: true },
      });

  const period =
    existingPeriod ??
    (await prisma.crewSchedulePeriod.create({
      data: {
        createdById: userId,
        endsAt: addDays(viewEnd, -1),
        name: `Planning ${inputDate(viewStart)} to ${inputDate(addDays(viewEnd, -1))}`,
        periodKey: `planning-${inputDate(viewStart)}-${inputDate(addDays(viewEnd, -1))}`,
        startsAt: viewStart,
        status: CrewSchedulePeriodStatus.DRAFTING,
      },
      select: { id: true, name: true, periodKey: true },
    }));

  const activeDraft = await prisma.crewPlanningDraft.findFirst({
    where: {
      periodId: period.id,
      status: CrewPlanningDraftStatus.ACTIVE,
    },
    orderBy: [{ updatedAt: "desc" }],
    select: { id: true, periodId: true },
  });

  if (activeDraft) {
    return activeDraft;
  }

  const draft = await prisma.crewPlanningDraft.create({
    data: {
      createdById: userId,
      draftKey: `${period.periodKey}-canvas-${Date.now()}`,
      name: `${period.name} planning draft`,
      periodId: period.id,
      updatedById: userId,
    },
    select: { id: true, periodId: true },
  });

  return draft;
}

export async function savePlanningDraftAction(input: DraftWindowInput) {
  const actorId = await currentActorId();
  const draft = await ensurePlanningDraft(input, actorId);

  await prisma.crewPlanningDraft.update({
    where: { id: draft.id },
    data: {
      autosavedAt: new Date(),
      updatedById: actorId,
    },
  });

  revalidatePath("/crew/scheduling");
  return { draftId: draft.id, ok: true };
}

export async function upsertPlanningDraftChangeAction(input: DraftChangeInput) {
  const actorId = await currentActorId();
  const draft = await ensurePlanningDraft(input, actorId);
  const date = parseDate(input.date, "Start date");
  const endDate = parseDate(input.endDate, "End date");

  if (endDate < date) {
    throw new Error("End date must be on or after start date.");
  }

  const source = input.sourcePublishedEntryId
    ? await prisma.crewScheduleEntry.findUnique({
        where: { id: input.sourcePublishedEntryId },
        select: { updatedAt: true },
      })
    : null;

  const data = {
    baselineUpdatedAt: source?.updatedAt ?? null,
    changeType: input.changeType,
    crewMemberId: input.crewMemberId,
    date,
    dutyStatus: input.changeType === CrewPlanningDraftChangeType.REMOVE ? null : input.dutyStatus,
    endDate,
    selectedForPublish: input.selectedForPublish ?? true,
    sourcePublishedEntryId: input.sourcePublishedEntryId ?? null,
    stationId: input.stationId ?? null,
    status: CrewPlanningDraftChangeStatus.DRAFT,
    updatedById: actorId,
  };

  const change = input.changeId
    ? await prisma.crewPlanningDraftChange.update({
        where: { id: input.changeId },
        data,
        select: { id: true },
      })
    : await prisma.crewPlanningDraftChange.create({
        data: {
          ...data,
          createdById: actorId,
          draftId: draft.id,
        },
        select: { id: true },
      });

  await prisma.crewPlanningDraft.update({
    where: { id: draft.id },
    data: {
      autosavedAt: new Date(),
      updatedById: actorId,
    },
  });

  revalidatePath("/crew/scheduling");
  return { changeId: change.id, draftId: draft.id, ok: true };
}

export async function setPlanningDraftSelectionAction(input: {
  changeIds?: string[];
  draftId: string;
  selected: boolean;
}) {
  await prisma.crewPlanningDraftChange.updateMany({
    where: {
      draftId: input.draftId,
      id: input.changeIds && input.changeIds.length > 0 ? { in: input.changeIds } : undefined,
      status: { in: [CrewPlanningDraftChangeStatus.DRAFT, CrewPlanningDraftChangeStatus.REVIEW_REQUIRED] },
    },
    data: {
      selectedForPublish: input.selected,
    },
  });

  revalidatePath("/crew/scheduling");
  return { ok: true };
}

export async function cancelSelectedPlanningDraftChangesAction(input: { draftId: string }) {
  const actorId = await currentActorId();

  const result = await prisma.crewPlanningDraftChange.updateMany({
    where: {
      draftId: input.draftId,
      selectedForPublish: true,
      status: { in: [CrewPlanningDraftChangeStatus.DRAFT, CrewPlanningDraftChangeStatus.REVIEW_REQUIRED] },
    },
    data: {
      selectedForPublish: false,
      status: CrewPlanningDraftChangeStatus.CANCELLED,
      updatedById: actorId,
    },
  });

  await prisma.crewPlanningDraft.update({
    where: { id: input.draftId },
    data: {
      autosavedAt: new Date(),
      updatedById: actorId,
    },
  });

  revalidatePath("/crew/scheduling");
  return { cancelled: result.count, ok: true };
}

export async function cancelPlanningDraftChangesAction(input: { changeIds: string[]; draftId: string }) {
  const actorId = await currentActorId();
  const changeIds = input.changeIds.filter(Boolean);

  if (changeIds.length === 0) {
    return { cancelled: 0, ok: true };
  }

  const result = await prisma.crewPlanningDraftChange.updateMany({
    where: {
      draftId: input.draftId,
      id: { in: changeIds },
      status: { in: [CrewPlanningDraftChangeStatus.DRAFT, CrewPlanningDraftChangeStatus.REVIEW_REQUIRED] },
    },
    data: {
      selectedForPublish: false,
      status: CrewPlanningDraftChangeStatus.CANCELLED,
      updatedById: actorId,
    },
  });

  await prisma.crewPlanningDraft.update({
    where: { id: input.draftId },
    data: {
      autosavedAt: new Date(),
      updatedById: actorId,
    },
  });

  revalidatePath("/crew/scheduling");
  return { cancelled: result.count, ok: true };
}

export async function publishPlanningDraftChangesAction(input: {
  draftId: string;
  mode: "all" | "selected";
}) {
  const actorId = await currentActorId();
  const now = new Date();
  let published = 0;
  let reviewRequired = 0;
  let blockedConflicts = 0;
  const publishedIds: string[] = [];
  const reviewRequiredIds: string[] = [];
  const conflictIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    const draft = await tx.crewPlanningDraft.findUnique({
      where: { id: input.draftId },
      select: {
        changes: {
          where: {
            selectedForPublish: input.mode === "selected" ? true : undefined,
            status: { in: [CrewPlanningDraftChangeStatus.DRAFT, CrewPlanningDraftChangeStatus.REVIEW_REQUIRED] },
          },
          orderBy: [{ date: "asc" }],
          select: {
            baselineUpdatedAt: true,
            changeType: true,
            crewMemberId: true,
            date: true,
            dutyStatus: true,
            endDate: true,
            id: true,
            sourcePublishedEntryId: true,
            sourcePublishedEntry: {
              select: {
                generatedCrewScheduleId: true,
                updatedAt: true,
              },
            },
            stationId: true,
          },
        },
        id: true,
        periodId: true,
      },
    });

    if (!draft) {
      throw new Error("Planning draft was not found.");
    }

    const overlapConflictIds = conflictingPublishChangeIds(draft.changes);
    if (overlapConflictIds.length > 0) {
      blockedConflicts = overlapConflictIds.length;
      conflictIds.push(...overlapConflictIds);
      reviewRequiredIds.push(...overlapConflictIds);
      reviewRequired += overlapConflictIds.length;
      await tx.crewPlanningDraftChange.updateMany({
        where: { id: { in: overlapConflictIds } },
        data: {
          selectedForPublish: false,
          status: CrewPlanningDraftChangeStatus.REVIEW_REQUIRED,
          updatedById: actorId,
        },
      });
    }

    for (const change of draft.changes.filter((candidate) => !overlapConflictIds.includes(candidate.id))) {
      if (
        change.sourcePublishedEntryId &&
        change.baselineUpdatedAt &&
        change.sourcePublishedEntry?.updatedAt &&
        change.sourcePublishedEntry.updatedAt.getTime() !== change.baselineUpdatedAt.getTime()
      ) {
        reviewRequired += 1;
        reviewRequiredIds.push(change.id);
        await tx.crewPlanningDraftChange.update({
          where: { id: change.id },
          data: {
            selectedForPublish: false,
            status: CrewPlanningDraftChangeStatus.REVIEW_REQUIRED,
            updatedById: actorId,
          },
        });
        continue;
      }

      if (change.sourcePublishedEntryId) {
        const generatedCrewScheduleId = change.sourcePublishedEntry?.generatedCrewScheduleId ?? null;
        await tx.crewScheduleEntry.update({
          where: { id: change.sourcePublishedEntryId },
          data: {
            generatedCrewScheduleId: null,
            status: CrewScheduleEntryStatus.SUPERSEDED,
          },
        });
        if (generatedCrewScheduleId) {
          await tx.crewSchedule.delete({ where: { id: generatedCrewScheduleId } });
        }
      }

      if (change.changeType !== CrewPlanningDraftChangeType.REMOVE) {
        if (!change.dutyStatus) {
          throw new Error("Draft changes must include a duty status before publishing.");
        }

        for (const day of eachDayInclusive(change.date, change.endDate)) {
          const bridge = await tx.crewSchedule.create({
            data: {
              crewMemberId: change.crewMemberId,
              date: day,
              dutyStatus: change.dutyStatus,
              notes: `Published from planning draft change ${change.id}.`,
              stationId: change.stationId,
            },
            select: { id: true },
          });

          await tx.crewScheduleEntry.upsert({
            where: {
              periodId_crewMemberId_date_dutyStatus: {
                crewMemberId: change.crewMemberId,
                date: day,
                dutyStatus: change.dutyStatus,
                periodId: draft.periodId,
              },
            },
            create: {
              crewMemberId: change.crewMemberId,
              date: day,
              dutyStatus: change.dutyStatus,
              generatedCrewScheduleId: bridge.id,
              periodId: draft.periodId,
              publishedAt: now,
              publishedById: actorId,
              stationId: change.stationId,
              status: CrewScheduleEntryStatus.PUBLISHED,
            },
            update: {
              generatedCrewScheduleId: bridge.id,
              publishedAt: now,
              publishedById: actorId,
              stationId: change.stationId,
              status: CrewScheduleEntryStatus.PUBLISHED,
            },
          });
        }
      }

      await tx.crewPlanningDraftChange.update({
        where: { id: change.id },
        data: {
          publishedAt: now,
          publishedById: actorId,
          selectedForPublish: false,
          status: CrewPlanningDraftChangeStatus.PUBLISHED,
        },
      });
      publishedIds.push(change.id);
      published += 1;
    }

    const openChanges = await tx.crewPlanningDraftChange.count({
      where: {
        draftId: draft.id,
        status: { in: [CrewPlanningDraftChangeStatus.DRAFT, CrewPlanningDraftChangeStatus.REVIEW_REQUIRED] },
      },
    });

    await tx.crewPlanningDraft.update({
      where: { id: draft.id },
      data: {
        autosavedAt: now,
        status: openChanges === 0 ? CrewPlanningDraftStatus.PUBLISHED : CrewPlanningDraftStatus.ACTIVE,
        updatedById: actorId,
      },
    });
  });

  revalidatePath("/crew/scheduling");
  return { blockedConflicts, conflictIds, ok: true, published, publishedIds, reviewRequired, reviewRequiredIds };
}

export async function createReusableTemplateAction(input: ReusableTemplateInput) {
  const actorId = await currentActorId();
  const name = input.name.trim();
  const days = input.days
    .filter((day) => Number.isInteger(day.dayNumber) && day.dayNumber > 0)
    .sort((first, second) => first.dayNumber - second.dayNumber);

  if (!name) {
    throw new Error("Template name is required.");
  }

  if (days.length === 0) {
    throw new Error("Template must include at least one day.");
  }

  const cycleLengthDays = Math.max(...days.map((day) => day.dayNumber));
  const baseKey = slugify(name) || "reusable-template";
  const patternKey = `${baseKey}-${Date.now()}`;

  const pattern = await prisma.crewRotationPattern.create({
    data: {
      createdById: actorId,
      cycleLengthDays,
      description: `${name} reusable planning template.`,
      days: {
        create: days.map((day) => ({
          dayNumber: day.dayNumber,
          dutyStatus: day.dutyStatus,
        })),
      },
      isActive: true,
      name,
      notes: "Created from the planning board reusable template drawer.",
      patternKey,
    },
    select: {
      cycleLengthDays: true,
      days: {
        orderBy: [{ dayNumber: "asc" }],
        select: {
          dayNumber: true,
          dutyStatus: true,
          endsAtMinutes: true,
          startsAtMinutes: true,
          stationId: true,
          station: {
            select: {
              code: true,
            },
          },
        },
      },
      id: true,
      name: true,
      patternKey: true,
    },
  });

  revalidatePath("/crew/scheduling");
  return {
    cycleLengthDays: pattern.cycleLengthDays,
    days: pattern.days.map((day) => ({
      dayNumber: day.dayNumber,
      dutyStatus: day.dutyStatus,
      endsAtMinutes: day.endsAtMinutes,
      startsAtMinutes: day.startsAtMinutes,
      stationCode: day.station?.code ?? null,
      stationId: day.stationId,
    })),
    id: pattern.id,
    name: pattern.name,
    patternKey: pattern.patternKey,
  };
}
