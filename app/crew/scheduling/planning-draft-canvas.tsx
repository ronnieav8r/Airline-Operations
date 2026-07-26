"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type MutableRefObject,
  type PointerEvent,
} from "react";

import {
  cancelPlanningDraftChangesAction,
  cancelSelectedPlanningDraftChangesAction,
  createReusableTemplateAction,
  publishPlanningDraftChangesAction,
  savePlanningDraftAction,
  setPlanningDraftSelectionAction,
  upsertPlanningDraftChangeAction,
} from "@/app/crew/scheduling/planning-actions";

type DraftChangeType = "ADD" | "UPDATE" | "SWAP" | "REMOVE";
type DraftChangeStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "REVIEW_REQUIRED";
type DutyStatus =
  | "ON_DUTY"
  | "RESERVE"
  | "OFF_DUTY"
  | "VACATION"
  | "SICK"
  | "PERSONAL"
  | "TRAINING"
  | "DEADHEADING";

type PlanningDay = {
  dayKey: string;
  dayNumber: number;
  label: string;
  weekday: string;
};

type PlanningRun = {
  endDayKey: string;
  label: string;
  length: number;
  startDayKey: string;
  startIndex: number;
  statusKey: string;
  style: {
    backgroundColor: string;
    borderColor: string;
    color: string;
  };
};

type PatternDay = {
  dayNumber: number;
  dutyStatus: DutyStatus;
  endsAtMinutes?: number | null;
  startsAtMinutes?: number | null;
  stationCode?: string | null;
  stationId?: string | null;
};

type PlanningDraftChange = {
  changeType: DraftChangeType;
  crewMemberId: string;
  date: string;
  dutyStatus: DutyStatus | null;
  endDate: string;
  id: string;
  isLocal?: boolean;
  mergedIds?: string[];
  selectedForPublish: boolean;
  sourcePublishedEntryId: string | null;
  status: DraftChangeStatus;
  templateCycleLengthDays?: number;
  templateDays?: PatternDay[];
  templateGroupId?: string;
  templateName?: string;
};

type PlanningCrewRow = {
  baseStationCode: string;
  crewMemberId: string;
  name: string;
  publishedScheduledMonths: Array<{
    monthKey: string;
    published: number;
  }>;
  publishedRuns: PlanningRun[];
};

type PlanningGroup = {
  aircraftType: string;
  crew: PlanningCrewRow[];
  label: string;
  seatRole: string;
};

type RotationPattern = {
  cycleLengthDays: number;
  days: PatternDay[];
  id: string;
  name: string;
  patternKey: string;
};

type PlanningTemplate = {
  cycleLengthDays: number;
  days: PatternDay[];
  key: string;
  label: string;
  patternId: string | null;
};

type QuickBlock = {
  defaultLengthDays: number;
  dutyStatus: DutyStatus;
  key: string;
  label: string;
};

type QuickBlockButtonStyle = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

type PlanningDraftCanvasProps = {
  activeDraft: {
    autosavedAt: string | null;
    changes: PlanningDraftChange[];
    id: string;
    name: string;
  } | null;
  countMonths: Array<{
    end: string;
    key: string;
    label: string;
    start: string;
  }>;
  currentPeriodId: string | null;
  navigation: {
    nextHref: string;
    previousHref: string | null;
    todayHref: string;
  };
  todayKey: string;
  days: PlanningDay[];
  groups: PlanningGroup[];
  isBoardFocused?: boolean;
  rotationPatterns: RotationPattern[];
  viewEnd: string;
  viewStart: string;
};

type DraftMenuState = {
  crewMemberId: string;
  endDate: string;
  startDate: string;
  x: number;
  y: number;
} | null;

type DraftContextMenuState = {
  changeIds: string[];
  label: string;
  x: number;
  y: number;
} | null;

type PlacementState = {
  crewMemberId: string;
  startDate: string;
  template: PlanningTemplate;
  x: number;
  y: number;
} | null;

type TemplatePreview = {
  crewMemberId: string;
  cycles: number;
  startDate: string;
  template: PlanningTemplate;
} | null;

type QuickBlockPreview = {
  crewMemberId: string;
  dutyStatus: DutyStatus;
  endDate: string;
  startDate: string;
} | null;

type ResizeState = {
  date: string;
  edge: "start" | "end";
  endDate: string;
  id: string;
  mergedIds?: string[];
} | null;

type ResizePreview = {
  crewMemberId: string;
  dayKey: string;
} | null;

type ToolPickerTab = "quick" | "templates";

const dutyLabels: Record<DutyStatus, string> = {
  DEADHEADING: "Deadhead",
  OFF_DUTY: "Off",
  ON_DUTY: "Reserve",
  PERSONAL: "Personal",
  RESERVE: "Reserve",
  SICK: "Unavailable",
  TRAINING: "Training",
  VACATION: "Vacation",
};

const quickBlocks: QuickBlock[] = [
  { defaultLengthDays: 1, dutyStatus: "ON_DUTY", key: "reserve", label: "Reserve" },
  { defaultLengthDays: 1, dutyStatus: "OFF_DUTY", key: "off", label: "Off" },
  { defaultLengthDays: 1, dutyStatus: "VACATION", key: "vacation", label: "Vacation" },
  { defaultLengthDays: 1, dutyStatus: "SICK", key: "sick", label: "Sick" },
  { defaultLengthDays: 1, dutyStatus: "PERSONAL", key: "personal", label: "Personal" },
  { defaultLengthDays: 1, dutyStatus: "TRAINING", key: "training", label: "Training" },
  { defaultLengthDays: 1, dutyStatus: "SICK", key: "unavailable", label: "Unavailable" },
];

const quickBlockShortLabels: Record<string, string> = {
  off: "Off",
  personal: "Pers",
  reserve: "Res",
  sick: "Sick",
  training: "Train",
  unavailable: "Unav",
  vacation: "Vac",
};

const draftContextStatusOptions: Array<{ dutyStatus: DutyStatus; label: string }> = [
  { dutyStatus: "ON_DUTY", label: "Reserve" },
  { dutyStatus: "OFF_DUTY", label: "Off" },
  { dutyStatus: "VACATION", label: "Vacation" },
  { dutyStatus: "SICK", label: "Unavailable" },
  { dutyStatus: "PERSONAL", label: "Personal" },
  { dutyStatus: "TRAINING", label: "Training" },
];

const prototypeMonthlyScheduledDayLimit = 18;

const quickBlockButtonStyles: Record<string, { selected: QuickBlockButtonStyle; idle: QuickBlockButtonStyle }> = {
  off: {
    idle: { backgroundColor: "#f4f4f5", borderColor: "#71717a", color: "#18181b" },
    selected: { backgroundColor: "#d4d4d8", borderColor: "#3f3f46", color: "#18181b" },
  },
  personal: {
    idle: { backgroundColor: "#ede9fe", borderColor: "#7c3aed", color: "#2e1065" },
    selected: { backgroundColor: "#c4b5fd", borderColor: "#6d28d9", color: "#1e1b4b" },
  },
  reserve: {
    idle: { backgroundColor: "#d1fae5", borderColor: "#059669", color: "#064e3b" },
    selected: { backgroundColor: "#059669", borderColor: "#047857", color: "#ffffff" },
  },
  scheduled: {
    idle: { backgroundColor: "#d1fae5", borderColor: "#059669", color: "#064e3b" },
    selected: { backgroundColor: "#059669", borderColor: "#047857", color: "#ffffff" },
  },
  sick: {
    idle: { backgroundColor: "#fee2e2", borderColor: "#991b1b", color: "#450a0a" },
    selected: { backgroundColor: "#fca5a5", borderColor: "#7f1d1d", color: "#450a0a" },
  },
  training: {
    idle: { backgroundColor: "#ffedd5", borderColor: "#b45309", color: "#451a03" },
    selected: { backgroundColor: "#fdba74", borderColor: "#92400e", color: "#431407" },
  },
  unavailable: {
    idle: { backgroundColor: "#fee2e2", borderColor: "#991b1b", color: "#450a0a" },
    selected: { backgroundColor: "#fca5a5", borderColor: "#7f1d1d", color: "#450a0a" },
  },
  vacation: {
    idle: { backgroundColor: "#ffe4e6", borderColor: "#be123c", color: "#4c0519" },
    selected: { backgroundColor: "#fda4af", borderColor: "#9f1239", color: "#4c0519" },
  },
};

function dayIndex(days: PlanningDay[], dayKey: string): number {
  return days.findIndex((day) => day.dayKey === dayKey);
}

function dayKeyFromIndex(days: PlanningDay[], index: number): string | null {
  return days[Math.max(0, Math.min(days.length - 1, index))]?.dayKey ?? null;
}

function dateInRange(dayKey: string, start: string, end: string): boolean {
  return dayKey >= start && dayKey < end;
}

function statusStyle(dutyStatus: DutyStatus | null) {
  const styles: Record<DutyStatus, { backgroundColor: string; borderColor: string; color: string }> = {
    DEADHEADING: { backgroundColor: "rgba(14, 116, 144, 0.58)", borderColor: "#155e75", color: "#06202a" },
    OFF_DUTY: { backgroundColor: "rgba(82, 82, 91, 0.42)", borderColor: "#52525b", color: "#18181b" },
    ON_DUTY: { backgroundColor: "#059669", borderColor: "#047857", color: "#ffffff" },
    PERSONAL: { backgroundColor: "rgba(124, 58, 237, 0.42)", borderColor: "#7c3aed", color: "#2e1065" },
    RESERVE: { backgroundColor: "#059669", borderColor: "#047857", color: "#ffffff" },
    SICK: { backgroundColor: "rgba(153, 27, 27, 0.42)", borderColor: "#991b1b", color: "#450a0a" },
    TRAINING: { backgroundColor: "rgba(180, 83, 9, 0.46)", borderColor: "#b45309", color: "#451a03" },
    VACATION: { backgroundColor: "rgba(190, 18, 60, 0.42)", borderColor: "#be123c", color: "#4c0519" },
  };

  return dutyStatus ? styles[dutyStatus] : { backgroundColor: "rgba(251, 191, 36, 0.35)", borderColor: "#d97706", color: "#451a03" };
}

function draftLabel(change: PlanningDraftChange): string {
  if (change.changeType === "REMOVE") {
    return "Remove";
  }

  return change.dutyStatus ? dutyLabels[change.dutyStatus] : "Draft";
}

function draftActivityMergeKey(change: PlanningDraftChange): string {
  if (change.changeType === "REMOVE") {
    return "REMOVE";
  }

  if (change.dutyStatus === "ON_DUTY" || change.dutyStatus === "RESERVE") {
    return "RESERVE";
  }

  return change.dutyStatus ?? "DRAFT";
}

function templateShortLabel(template: Pick<PlanningTemplate, "label">): string {
  const rotation = template.label.match(/(\d+)\s*on\s*\/\s*(\d+)\s*off/i);
  if (rotation) {
    return `${rotation[1]}/${rotation[2]}`;
  }

  return template.label.length > 16 ? `${template.label.slice(0, 14).trim()}...` : template.label;
}

function templateDetailLabel(template: PlanningTemplate): string {
  const statusCounts = template.days.reduce(
    (counts, day) => ({
      off: counts.off + (day.dutyStatus === "OFF_DUTY" ? 1 : 0),
      scheduled: counts.scheduled + (day.dutyStatus === "ON_DUTY" || day.dutyStatus === "RESERVE" ? 1 : 0),
    }),
    { off: 0, scheduled: 0 },
  );

  if (statusCounts.scheduled > 0 || statusCounts.off > 0) {
    return `${statusCounts.scheduled} reserve + ${statusCounts.off} off | ${template.cycleLengthDays}-day cycle`;
  }

  return `${template.cycleLengthDays}-day cycle`;
}

function getChangeSpan(days: PlanningDay[], change: Pick<PlanningDraftChange, "date" | "endDate">) {
  const startIndex = Math.max(0, dayIndex(days, change.date));
  const endIndex = Math.max(startIndex, dayIndex(days, change.endDate));

  return {
    length: endIndex - startIndex + 1,
    startIndex,
  };
}

function rangesTouchOrOverlap(days: PlanningDay[], first: Pick<PlanningDraftChange, "date" | "endDate">, second: Pick<PlanningDraftChange, "date" | "endDate">): boolean {
  const firstStart = dayIndex(days, first.date);
  const firstEnd = dayIndex(days, first.endDate);
  const secondStart = dayIndex(days, second.date);
  const secondEnd = dayIndex(days, second.endDate);

  if (firstStart < 0 || firstEnd < 0 || secondStart < 0 || secondEnd < 0) {
    return false;
  }

  return firstStart <= secondEnd + 1 && secondStart <= firstEnd + 1;
}

function rangesOverlap(days: PlanningDay[], first: Pick<PlanningDraftChange, "date" | "endDate">, second: Pick<PlanningDraftChange, "date" | "endDate">): boolean {
  const firstStart = dayIndex(days, first.date);
  const firstEnd = dayIndex(days, first.endDate);
  const secondStart = dayIndex(days, second.date);
  const secondEnd = dayIndex(days, second.endDate);

  if (firstStart < 0 || firstEnd < 0 || secondStart < 0 || secondEnd < 0) {
    return false;
  }

  return firstStart <= secondEnd && secondStart <= firstEnd;
}

function subtractDateRange(
  days: PlanningDay[],
  source: Pick<PlanningDraftChange, "date" | "endDate">,
  blocker: Pick<PlanningDraftChange, "date" | "endDate">,
): Array<{ date: string; endDate: string }> {
  const sourceStart = dayIndex(days, source.date);
  const sourceEnd = dayIndex(days, source.endDate);
  const blockerStart = dayIndex(days, blocker.date);
  const blockerEnd = dayIndex(days, blocker.endDate);

  if (sourceStart < 0 || sourceEnd < 0 || blockerStart < 0 || blockerEnd < 0 || blockerEnd < sourceStart || blockerStart > sourceEnd) {
    return [{ date: source.date, endDate: source.endDate }];
  }

  const pieces: Array<{ date: string; endDate: string }> = [];
  const beforeEnd = blockerStart - 1;
  const afterStart = blockerEnd + 1;

  if (sourceStart <= beforeEnd) {
    pieces.push({
      date: dayKeyFromIndex(days, sourceStart) ?? source.date,
      endDate: dayKeyFromIndex(days, beforeEnd) ?? source.endDate,
    });
  }

  if (afterStart <= sourceEnd) {
    pieces.push({
      date: dayKeyFromIndex(days, afterStart) ?? source.date,
      endDate: dayKeyFromIndex(days, sourceEnd) ?? source.endDate,
    });
  }

  return pieces;
}

function visibleDateRange(
  days: PlanningDay[],
  source: Pick<PlanningDraftChange, "date" | "endDate">,
): { date: string; endDate: string } | null {
  const firstDay = days[0]?.dayKey;
  const lastDay = days[days.length - 1]?.dayKey;

  if (!firstDay || !lastDay || source.endDate < firstDay || source.date > lastDay) {
    return null;
  }

  return {
    date: source.date < firstDay ? firstDay : source.date,
    endDate: source.endDate > lastDay ? lastDay : source.endDate,
  };
}

function isOpenDraftStatus(status: DraftChangeStatus): boolean {
  return status === "DRAFT" || status === "REVIEW_REQUIRED";
}

function coalescedDraftBlocks(days: PlanningDay[], rowChanges: PlanningDraftChange[]): PlanningDraftChange[] {
  const sorted = [...rowChanges].sort((first, second) => {
    const firstIndex = dayIndex(days, first.date);
    const secondIndex = dayIndex(days, second.date);
    return firstIndex - secondIndex || first.id.localeCompare(second.id);
  });
  const blocks: PlanningDraftChange[] = [];

  for (const change of sorted) {
    const previous = blocks[blocks.length - 1];
    const canMerge =
      previous &&
      previous.changeType === "ADD" &&
      change.changeType === "ADD" &&
      isOpenDraftStatus(previous.status) &&
      isOpenDraftStatus(change.status) &&
      draftActivityMergeKey(previous) === draftActivityMergeKey(change) &&
      rangesTouchOrOverlap(days, previous, change);

    if (!canMerge) {
      blocks.push({ ...change, mergedIds: [change.id] });
      continue;
    }

    const previousStartIndex = dayIndex(days, previous.date);
    const previousEndIndex = dayIndex(days, previous.endDate);
    const changeStartIndex = dayIndex(days, change.date);
    const changeEndIndex = dayIndex(days, change.endDate);

    blocks[blocks.length - 1] = {
      ...previous,
      date: dayKeyFromIndex(days, Math.min(previousStartIndex, changeStartIndex)) ?? previous.date,
      endDate: dayKeyFromIndex(days, Math.max(previousEndIndex, changeEndIndex)) ?? previous.endDate,
      mergedIds: [...(previous.mergedIds ?? [previous.id]), change.id],
      selectedForPublish: previous.selectedForPublish && change.selectedForPublish,
    };
  }

  return blocks;
}

function visibleDraftBlocks(days: PlanningDay[], rowChanges: PlanningDraftChange[]): PlanningDraftChange[] {
  const sorted = [...rowChanges].sort((first, second) => {
    const firstIndex = dayIndex(days, first.date);
    const secondIndex = dayIndex(days, second.date);
    return firstIndex - secondIndex || first.id.localeCompare(second.id);
  });
  const occupied: Array<Pick<PlanningDraftChange, "date" | "endDate">> = [];
  const visible: PlanningDraftChange[] = [];

  for (const change of sorted) {
    const visibleRange = visibleDateRange(days, change);

    if (!visibleRange) {
      continue;
    }

    let openRanges: Array<{ date: string; endDate: string }> = [visibleRange];

    for (const blocker of occupied) {
      openRanges = openRanges.flatMap((range) => subtractDateRange(days, range, blocker));
    }

    for (const range of openRanges) {
      occupied.push(range);
      visible.push({
        ...change,
        date: range.date,
        endDate: range.endDate,
        mergedIds: [change.id],
      });
    }
  }

  return coalescedDraftBlocks(days, visible);
}

function resizedSimpleDraftChange(
  days: PlanningDay[],
  change: PlanningDraftChange,
  dayKey: string,
  edge: "start" | "end",
): PlanningDraftChange {
  const startIndex = dayIndex(days, change.date);
  const endIndex = dayIndex(days, change.endDate);
  const proposedIndex = dayIndex(days, dayKey);
  const nextStartIndex = edge === "start" ? Math.min(proposedIndex, endIndex) : startIndex;
  const nextEndIndex = edge === "end" ? Math.max(proposedIndex, startIndex) : endIndex;

  return {
    ...change,
    date: dayKeyFromIndex(days, nextStartIndex) ?? change.date,
    endDate: dayKeyFromIndex(days, nextEndIndex) ?? change.endDate,
  };
}

function previewDraftBlocks(
  days: PlanningDay[],
  rowChanges: PlanningDraftChange[],
  resizingChange: Exclude<ResizeState, null> | null,
  resizePreview: ResizePreview,
): PlanningDraftChange[] {
  if (!resizingChange || !resizePreview) {
    return visibleDraftBlocks(days, rowChanges);
  }

  const baseChange = rowChanges.find((change) => change.id === resizingChange.id);

  if (!baseChange || baseChange.templateGroupId) {
    return visibleDraftBlocks(days, rowChanges);
  }

  const activeIds = new Set(resizingChange.mergedIds ?? [resizingChange.id]);
  const activeChange = resizedSimpleDraftChange(
    days,
    {
      ...baseChange,
      date: resizingChange.date,
      endDate: resizingChange.endDate,
    },
    resizePreview.dayKey,
    resizingChange.edge,
  );
  const visible: PlanningDraftChange[] = [{ ...activeChange, mergedIds: Array.from(activeIds) }];

  for (const change of rowChanges) {
    if (activeIds.has(change.id)) {
      continue;
    }

    const ranges = subtractDateRange(days, change, activeChange);
    for (const range of ranges) {
      visible.push({
        ...change,
        date: range.date,
        endDate: range.endDate,
        mergedIds: [change.id],
      });
    }
  }

  return coalescedDraftBlocks(days, visible);
}

function templateStatusForOffset(template: PlanningTemplate, offset: number): DutyStatus {
  const dayNumber = (offset % template.cycleLengthDays) + 1;
  return template.days.find((day) => day.dayNumber === dayNumber)?.dutyStatus ?? "OFF_DUTY";
}

function makeLocalChangeId(counter: MutableRefObject<number>) {
  counter.current += 1;
  return `local-${counter.current}`;
}

function contiguousTemplateChanges({
  counter,
  crewMemberId,
  cycles,
  days,
  groupId,
  startDate,
  template,
}: {
  counter: MutableRefObject<number>;
  crewMemberId: string;
  cycles: number;
  days: PlanningDay[];
  groupId: string;
  startDate: string;
  template: PlanningTemplate;
}): PlanningDraftChange[] {
  const startIndex = dayIndex(days, startDate);
  const totalDays = template.cycleLengthDays * cycles;
  const changes: PlanningDraftChange[] = [];
  let currentStatus: DutyStatus | null = null;
  let currentStart: string | null = null;
  let currentEnd: string | null = null;

  for (let offset = 0; offset < totalDays; offset += 1) {
    const dayKey = dayKeyFromIndex(days, startIndex + offset);
    if (!dayKey) {
      break;
    }

    const status = templateStatusForOffset(template, offset);

    if (currentStatus === null) {
      currentStatus = status;
      currentStart = dayKey;
      currentEnd = dayKey;
      continue;
    }

    if (status === currentStatus) {
      currentEnd = dayKey;
      continue;
    }

    changes.push({
      changeType: "ADD",
      crewMemberId,
      date: currentStart ?? dayKey,
      dutyStatus: currentStatus,
      endDate: currentEnd ?? dayKey,
      id: makeLocalChangeId(counter),
      isLocal: true,
      selectedForPublish: true,
      sourcePublishedEntryId: null,
      status: "DRAFT",
      templateCycleLengthDays: template.cycleLengthDays,
      templateDays: template.days,
      templateGroupId: groupId,
      templateName: template.label,
    });
    currentStatus = status;
    currentStart = dayKey;
    currentEnd = dayKey;
  }

  if (currentStatus && currentStart && currentEnd) {
    changes.push({
      changeType: "ADD",
      crewMemberId,
      date: currentStart,
      dutyStatus: currentStatus,
      endDate: currentEnd,
      id: makeLocalChangeId(counter),
      isLocal: true,
      selectedForPublish: true,
      sourcePublishedEntryId: null,
      status: "DRAFT",
      templateCycleLengthDays: template.cycleLengthDays,
      templateDays: template.days,
      templateGroupId: groupId,
      templateName: template.label,
    });
  }

  return changes;
}

function countDraftScheduledDays(changes: PlanningDraftChange[], crewMemberId: string, monthStart: string, monthEnd: string): number {
  const days = new Set<string>();

  for (const change of changes) {
    if (
      change.crewMemberId !== crewMemberId ||
      change.status !== "DRAFT" ||
      change.changeType === "REMOVE" ||
      (change.dutyStatus !== "ON_DUTY" && change.dutyStatus !== "RESERVE")
    ) {
      continue;
    }

    const start = new Date(`${change.date}T00:00:00`);
    const end = new Date(`${change.endDate}T00:00:00`);
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      if (dateInRange(key, monthStart, monthEnd)) {
        days.add(key);
      }
    }
  }

  return days.size;
}

function monthCountTone(draftScheduledDays: number) {
  if (draftScheduledDays > prototypeMonthlyScheduledDayLimit) {
    return "border-rose-300 bg-rose-50 text-rose-800";
  }

  if (draftScheduledDays === prototypeMonthlyScheduledDayLimit) {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function monthLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function monthSegments(days: PlanningDay[]) {
  const segments: Array<{ label: string; length: number; startIndex: number }> = [];

  for (const [index, day] of days.entries()) {
    const label = monthLabel(day.dayKey);
    const current = segments.at(-1);

    if (current?.label === label) {
      current.length += 1;
    } else {
      segments.push({ label, length: 1, startIndex: index });
    }
  }

  return segments;
}

export function PlanningDraftCanvas({
  activeDraft,
  countMonths,
  currentPeriodId,
  days,
  groups,
  isBoardFocused = false,
  navigation,
  rotationPatterns,
  todayKey,
  viewEnd,
  viewStart,
}: PlanningDraftCanvasProps) {
  const [draftId, setDraftId] = useState(activeDraft?.id ?? "");
  const [changes, setChanges] = useState<PlanningDraftChange[]>(activeDraft?.changes ?? []);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<DraftMenuState>(null);
  const [draftContextMenu, setDraftContextMenu] = useState<DraftContextMenuState>(null);
  const [dragStart, setDragStart] = useState<{ crewMemberId: string; dayKey: string } | null>(null);
  const [quickBlockPreview, setQuickBlockPreview] = useState<QuickBlockPreview>(null);
  const [resizingChange, setResizingChange] = useState<ResizeState>(null);
  const [resizePreview, setResizePreview] = useState<ResizePreview>(null);
  const [activeQuickBlock, setActiveQuickBlock] = useState<QuickBlock | null>(quickBlocks[0] ?? null);
  const [activeTemplate, setActiveTemplate] = useState<PlanningTemplate | null>(null);
  const [templatePreview, setTemplatePreview] = useState<TemplatePreview>(null);
  const [draggingTemplateKey, setDraggingTemplateKey] = useState<string | null>(null);
  const [placement, setPlacement] = useState<PlacementState>(null);
  const [placementCycles, setPlacementCycles] = useState("1");
  const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState(false);
  const [toolPickerOpen, setToolPickerOpen] = useState<ToolPickerTab | null>(null);
  const [customTemplates, setCustomTemplates] = useState<PlanningTemplate[]>([]);
  const [templateName, setTemplateName] = useState("7 on / 7 off");
  const [templateOnDays, setTemplateOnDays] = useState("7");
  const [templateOffDays, setTemplateOffDays] = useState("7");
  const [message, setMessage] = useState(activeDraft?.autosavedAt ? `Loaded draft from ${new Date(activeDraft.autosavedAt).toLocaleTimeString()}` : "No draft changes yet.");
  const [isPending, startTransition] = useTransition();
  const localIdCounter = useRef(0);
  const suppressNextCellPointerUp = useRef(false);

  const selectableStatuses = new Set<DraftChangeStatus>(["DRAFT", "REVIEW_REQUIRED"]);
  const selectedCount = changes.filter((change) => change.selectedForPublish && selectableStatuses.has(change.status)).length;
  const removableSelectedCount = changes.filter(
    (change) => change.selectedForPublish && (change.status === "DRAFT" || change.status === "REVIEW_REQUIRED"),
  ).length;
  const publishableCount = changes.filter((change) => selectableStatuses.has(change.status)).length;
  const draftCount = changes.filter((change) => change.status === "DRAFT").length;
  const reviewCount = changes.filter((change) => change.status === "REVIEW_REQUIRED").length;
  const columnWidthPx = 56;
  const crewColumnWidthPx = 360;
  const columnWidth = `${columnWidthPx}px`;
  const crewColumnWidth = `${crewColumnWidthPx}px`;
  const gridTemplateColumns = `${crewColumnWidth} repeat(${days.length}, ${columnWidth})`;
  const boardContentWidth = `${crewColumnWidthPx + days.length * columnWidthPx}px`;
  const monthHeaderSegments = monthSegments(days);

  const rotationTemplates = useMemo(
    () =>
      rotationPatterns
        .filter((pattern) => pattern.days.length > 0)
        .map((pattern) => ({
          cycleLengthDays: pattern.cycleLengthDays,
          days: pattern.days,
          key: pattern.id,
          label: pattern.name,
          patternId: pattern.id,
        })),
    [rotationPatterns],
  );

  const allTemplates = useMemo(
    () => [...rotationTemplates, ...customTemplates],
    [customTemplates, rotationTemplates],
  );

  useEffect(() => {
    const storedMessage = window.sessionStorage.getItem("aeroops-scheduling-planning-message");
    if (storedMessage) {
      window.sessionStorage.removeItem("aeroops-scheduling-planning-message");
      const timer = window.setTimeout(() => setMessage(storedMessage), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  function markDirtyIds(changeIds: string[]) {
    setDirtyIds((current) => {
      const next = new Set(current);
      for (const changeId of changeIds) {
        next.add(changeId);
      }
      return next;
    });
  }

  function trimOverlapsForActiveChanges(current: PlanningDraftChange[], activeChanges: PlanningDraftChange[], activeIds: Set<string>) {
    const dirtyChangeIds: string[] = [];
    const nextChanges: PlanningDraftChange[] = [];

    for (const change of current) {
      if (
        activeIds.has(change.id) ||
        change.status !== "DRAFT" ||
        change.changeType !== "ADD" ||
        !change.dutyStatus
      ) {
        nextChanges.push(change);
        continue;
      }

      let openRanges: Array<{ date: string; endDate: string }> = [{ date: change.date, endDate: change.endDate }];

      for (const activeChange of activeChanges) {
        if (
          activeChange.crewMemberId !== change.crewMemberId ||
          activeChange.status !== "DRAFT" ||
          activeChange.changeType !== "ADD" ||
          !rangesOverlap(days, change, activeChange)
        ) {
          continue;
        }

        openRanges = openRanges.flatMap((range) => subtractDateRange(days, range, activeChange));
      }

      if (openRanges.length === 0) {
        nextChanges.push({ ...change, status: "CANCELLED", selectedForPublish: false });
        dirtyChangeIds.push(change.id);
        continue;
      }

      const [firstRange, ...extraRanges] = openRanges;
      const dateChanged = firstRange.date !== change.date || firstRange.endDate !== change.endDate;
      nextChanges.push({ ...change, date: firstRange.date, endDate: firstRange.endDate });
      if (dateChanged) {
        dirtyChangeIds.push(change.id);
      }

      for (const range of extraRanges) {
        const splitId = makeLocalChangeId(localIdCounter);
        nextChanges.push({
          ...change,
          date: range.date,
          endDate: range.endDate,
          id: splitId,
          isLocal: true,
        });
        dirtyChangeIds.push(splitId);
      }
    }

    return { dirtyChangeIds, nextChanges };
  }

  const saveDirtyChanges = useCallback(async () => {
    const dirty = changes.filter((change) => dirtyIds.has(change.id) && change.status === "DRAFT");
    const cancelled = changes.filter((change) => dirtyIds.has(change.id) && change.status === "CANCELLED" && !change.isLocal);
    let nextDraftId = draftId;

    if (dirty.length === 0 && cancelled.length === 0) {
      const saved = await savePlanningDraftAction({
        periodId: currentPeriodId,
        viewEnd,
        viewStart,
      });
      setDraftId(saved.draftId);
      setDirtyIds(new Set());
      setMessage("Draft saved.");
      return saved.draftId;
    }

    if (cancelled.length > 0 && draftId) {
      await cancelPlanningDraftChangesAction({
        changeIds: cancelled.map((change) => change.id),
        draftId,
      });
    }

    for (const change of dirty) {
      const saved = await upsertPlanningDraftChangeAction({
        changeId: change.isLocal ? null : change.id,
        changeType: change.changeType,
        crewMemberId: change.crewMemberId,
        date: change.date,
        dutyStatus: change.dutyStatus,
        endDate: change.endDate,
        periodId: currentPeriodId,
        selectedForPublish: change.selectedForPublish,
        sourcePublishedEntryId: change.sourcePublishedEntryId,
        viewEnd,
        viewStart,
      });
      nextDraftId = saved.draftId;
      setChanges((current) =>
        current.map((candidate) =>
          candidate.id === change.id
            ? { ...candidate, id: saved.changeId, isLocal: false }
            : candidate,
        ),
      );
    }

    setDraftId(nextDraftId);
    setChanges((current) => current.filter((change) => !(change.status === "CANCELLED" && dirtyIds.has(change.id))));
    setDirtyIds(new Set());
    setMessage(`Saved ${dirty.length + cancelled.length} draft change${dirty.length + cancelled.length === 1 ? "" : "s"}.`);
    return nextDraftId;
  }, [changes, currentPeriodId, dirtyIds, draftId, viewEnd, viewStart]);

  useEffect(() => {
    if (dirtyIds.size === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      startTransition(() => {
        void saveDirtyChanges();
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [dirtyIds, saveDirtyChanges]);

  function addLocalChange(crewMemberId: string, startDate: string, endDate: string, dutyStatus: DutyStatus) {
    const id = makeLocalChangeId(localIdCounter);
    const change: PlanningDraftChange = {
      changeType: "ADD",
      crewMemberId,
      date: startDate,
      dutyStatus,
      endDate,
      id,
      isLocal: true,
      selectedForPublish: true,
      sourcePublishedEntryId: null,
      status: "DRAFT",
    };

    const localMatches = changes.filter(
      (candidate) =>
        candidate.isLocal &&
        candidate.crewMemberId === crewMemberId &&
        candidate.status === "DRAFT" &&
        candidate.changeType === "ADD" &&
        candidate.dutyStatus === dutyStatus &&
        !candidate.templateGroupId &&
        rangesTouchOrOverlap(days, candidate, change),
    );

    if (localMatches.length === 0) {
      const currentWithChange = [...changes, change];
      const { dirtyChangeIds, nextChanges } = trimOverlapsForActiveChanges(currentWithChange, [change], new Set([id]));
      setChanges(nextChanges);
      markDirtyIds([id, ...dirtyChangeIds]);
      setMessage(`${dutyLabels[dutyStatus]} block added.`);
      return;
    }

    const mergedStartIndex = Math.min(dayIndex(days, startDate), ...localMatches.map((candidate) => dayIndex(days, candidate.date)));
    const mergedEndIndex = Math.max(dayIndex(days, endDate), ...localMatches.map((candidate) => dayIndex(days, candidate.endDate)));
    const primary = localMatches[0];

    const activeChange = {
      ...primary,
      date: dayKeyFromIndex(days, mergedStartIndex) ?? primary.date,
      endDate: dayKeyFromIndex(days, mergedEndIndex) ?? primary.endDate,
      selectedForPublish: true,
    };
    const currentWithMerge = changes
      .filter((candidate) => !localMatches.some((match) => match.id === candidate.id && match.id !== primary.id))
      .map((candidate) => (candidate.id === primary.id ? activeChange : candidate));
    const { dirtyChangeIds, nextChanges } = trimOverlapsForActiveChanges(currentWithMerge, [activeChange], new Set([primary.id]));
    setChanges(nextChanges);
    markDirtyIds([primary.id, ...dirtyChangeIds]);
    setMessage(`${dutyLabels[dutyStatus]} block added.`);
  }

  function addTemplatePlacement(crewMemberId: string, startDate: string, template: PlanningTemplate, cycles: number) {
    const groupId = `template-${makeLocalChangeId(localIdCounter)}`;
    const nextChanges = contiguousTemplateChanges({
      counter: localIdCounter,
      crewMemberId,
      cycles,
      days,
      groupId,
      startDate,
      template,
    });

    const activeIds = new Set(nextChanges.map((change) => change.id));
    const { dirtyChangeIds, nextChanges: trimmedChanges } = trimOverlapsForActiveChanges([...changes, ...nextChanges], nextChanges, activeIds);
    setChanges(trimmedChanges);
    markDirtyIds([...nextChanges.map((change) => change.id), ...dirtyChangeIds]);
    setMessage(`${template.label} placed for ${cycles} cycle${cycles === 1 ? "" : "s"}.`);
  }

  function removeDraftChanges(changeIds: string[]) {
    const existingChanges = changes.filter((candidate) => changeIds.includes(candidate.id));

    if (existingChanges.length === 0) {
      return;
    }

    setChanges((current) => current.filter((candidate) => !changeIds.includes(candidate.id)));
    setDirtyIds((current) => {
      const next = new Set(current);
      for (const changeId of changeIds) {
        next.delete(changeId);
      }
      return next;
    });

    const persistedIds = existingChanges.filter((change) => !change.isLocal).map((change) => change.id);
    if (draftId && persistedIds.length > 0) {
      startTransition(() => {
        void cancelPlanningDraftChangesAction({ changeIds: persistedIds, draftId });
      });
    }

    setMessage("Draft change removed.");
  }

  function updateDraftChangesStatus(changeIds: string[], dutyStatus: DutyStatus) {
    const activeIds = new Set(changeIds);
    const nextWithStatus = changes.map((change) =>
      activeIds.has(change.id)
        ? { ...change, changeType: "ADD" as DraftChangeType, dutyStatus }
        : change,
    );
    const activeChanges = nextWithStatus.filter((change) => activeIds.has(change.id));
    const { dirtyChangeIds, nextChanges } = trimOverlapsForActiveChanges(nextWithStatus, activeChanges, activeIds);

    setChanges(nextChanges);
    markDirtyIds([...changeIds, ...dirtyChangeIds]);
    setMessage(`Changed to ${dutyLabels[dutyStatus]}.`);
  }

  function openDraftContextMenu(changeIds: string[], label: string, x: number, y: number) {
    setDraftContextMenu({
      changeIds,
      label,
      x: Math.min(x, window.innerWidth - 220),
      y: Math.min(y, window.innerHeight - 130),
    });
  }

  function findTemplate(templateKey: string | null): PlanningTemplate | null {
    return allTemplates.find((template) => template.key === templateKey) ?? null;
  }

  function previewTemplatePlacement(crewMemberId: string, startDate: string, template = activeTemplate) {
    if (!template) {
      setTemplatePreview(null);
      return;
    }

    setTemplatePreview({
      crewMemberId,
      cycles: 1,
      startDate,
      template,
    });
  }

  function startTemplatePlacement(crewMemberId: string, startDate: string, template: PlanningTemplate, event: PointerEvent | DragEvent) {
    setPlacement({
      crewMemberId,
      startDate,
      template,
      x: "clientX" in event ? event.clientX : 420,
      y: "clientY" in event ? event.clientY : 220,
    });
    setPlacementCycles("1");
  }

  function confirmTemplatePlacement() {
    if (!placement) {
      return;
    }

    const cycles = Math.max(1, Math.min(13, Number.parseInt(placementCycles, 10) || 1));
    addTemplatePlacement(placement.crewMemberId, placement.startDate, placement.template, cycles);
    setTemplatePreview(null);
    setPlacement(null);
  }

  function handleTemplateDragStart(template: PlanningTemplate, event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", template.key);
    setActiveTemplate(template);
    setActiveQuickBlock(null);
    setDraggingTemplateKey(template.key);
  }

  function handleTemplateDrop(crewMemberId: string, dayKey: string, event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const template = findTemplate(event.dataTransfer.getData("text/plain")) ?? activeTemplate;

    if (!template) {
      return;
    }

    setTemplatePreview(null);
    setDraggingTemplateKey(null);
    startTemplatePlacement(crewMemberId, dayKey, template, event);
  }

  function dayKeyFromPointer(event: PointerEvent<HTMLElement>) {
    const currentElement = event.currentTarget;
    const grid = currentElement.getAttribute("data-planning-row-grid") === "true" ? currentElement : currentElement.parentElement;

    if (!grid) {
      return null;
    }

    const rect = grid.getBoundingClientRect();
    const columnWidthPx = rect.width / days.length;
    const index = Math.max(0, Math.min(days.length - 1, Math.floor((event.clientX - rect.left) / columnWidthPx)));
    return dayKeyFromIndex(days, index);
  }

  function resizeChangeToDay(change: PlanningDraftChange, crewMemberId: string, dayKey: string, edge: "start" | "end", mergedIds: string[] = [change.id]) {
    if (change.templateGroupId && change.templateDays && change.templateCycleLengthDays && change.templateName) {
      const groupChanges = changes.filter((candidate) => candidate.templateGroupId === change.templateGroupId);
      const startDate = groupChanges.reduce((earliest, candidate) => (candidate.date < earliest ? candidate.date : earliest), change.date);
      const endDate = groupChanges.reduce((latest, candidate) => (candidate.endDate > latest ? candidate.endDate : latest), change.endDate);
      const proposedStartDate = edge === "start" ? dayKey : startDate;
      const proposedEndDate = edge === "end" ? dayKey : endDate;
      const proposedStartIndex = dayIndex(days, proposedStartDate);
      const proposedEndIndex = dayIndex(days, proposedEndDate);
      const nextStartIndex = Math.min(proposedStartIndex, proposedEndIndex);
      const nextEndIndex = Math.max(proposedStartIndex, proposedEndIndex);
      const nextStartDate = dayKeyFromIndex(days, nextStartIndex) ?? startDate;
      const cycles = Math.max(1, Math.ceil((nextEndIndex - nextStartIndex + 1) / change.templateCycleLengthDays));
      const template: PlanningTemplate = {
        cycleLengthDays: change.templateCycleLengthDays,
        days: change.templateDays,
        key: change.templateGroupId,
        label: change.templateName,
        patternId: null,
      };
      const nextGroup = contiguousTemplateChanges({
        counter: localIdCounter,
        crewMemberId,
        cycles,
        days,
        groupId: change.templateGroupId,
        startDate: nextStartDate,
        template,
      });

      const activeIds = new Set(nextGroup.map((candidate) => candidate.id));
      const currentWithNextGroup = [
        ...changes.map((candidate) =>
          candidate.templateGroupId === change.templateGroupId
            ? { ...candidate, status: "CANCELLED" as DraftChangeStatus, selectedForPublish: false }
            : candidate,
        ),
        ...nextGroup,
      ];
      const { dirtyChangeIds, nextChanges } = trimOverlapsForActiveChanges(currentWithNextGroup, nextGroup, activeIds);

      setChanges(nextChanges);
      markDirtyIds([
        ...groupChanges.map((candidate) => candidate.id),
        ...nextGroup.map((candidate) => candidate.id),
        ...dirtyChangeIds,
      ]);
      setMessage(`${change.templateName} extended to ${cycles} cycle${cycles === 1 ? "" : "s"}.`);
      return;
    }

    const startIndex = dayIndex(days, change.date);
    const endIndex = dayIndex(days, change.endDate);
    const proposedIndex = dayIndex(days, dayKey);
    const nextStartIndex = edge === "start" ? Math.min(proposedIndex, endIndex) : startIndex;
    const nextEndIndex = edge === "end" ? Math.max(proposedIndex, startIndex) : endIndex;
    const primaryId = mergedIds[0] ?? change.id;
    const activeChange: PlanningDraftChange = {
      ...change,
      date: dayKeyFromIndex(days, nextStartIndex) ?? change.date,
      endDate: dayKeyFromIndex(days, nextEndIndex) ?? change.endDate,
      id: primaryId,
    };
    const activeIds = new Set(mergedIds);
    const currentWithResize = changes.map((candidate) => {
      if (candidate.id === primaryId) {
        return activeChange;
      }

      if (activeIds.has(candidate.id)) {
        return { ...candidate, status: "CANCELLED" as DraftChangeStatus, selectedForPublish: false };
      }

      return candidate;
    });
    const { dirtyChangeIds, nextChanges } = trimOverlapsForActiveChanges(currentWithResize, [activeChange], new Set([primaryId]));

    setChanges(nextChanges);
    markDirtyIds([...activeIds, ...dirtyChangeIds]);
    setMessage("Draft change updated.");
  }

  function resizeActiveChangeToDay(crewMemberId: string, dayKey: string) {
    if (!resizingChange) {
      return;
    }

    const activeResizeChange = changes.find((change) => change.id === resizingChange.id);
    if (activeResizeChange) {
      resizeChangeToDay(
        {
          ...activeResizeChange,
          date: resizingChange.date,
          endDate: resizingChange.endDate,
        },
        crewMemberId,
        dayKey,
        resizingChange.edge,
        resizingChange.mergedIds ?? [resizingChange.id],
      );
    }
    setResizingChange(null);
    setResizePreview(null);
    setDragStart(null);
    setQuickBlockPreview(null);
  }

  function handleDraftBarPointerUp(change: PlanningDraftChange, crewMemberId: string, event: PointerEvent<HTMLDivElement>) {
    if (!resizingChange || resizingChange.id !== change.id) {
      return;
    }

    const dayKey = dayKeyFromPointer(event);
    if (dayKey) {
      resizeActiveChangeToDay(crewMemberId, dayKey);
    }
    event.stopPropagation();
  }

  function handleRowPointerMove(crewMemberId: string, event: PointerEvent<HTMLDivElement>) {
    if (!resizingChange) {
      return;
    }

    const dayKey = dayKeyFromPointer(event);
    if (dayKey) {
      setResizePreview({ crewMemberId, dayKey });
    }
  }

  function handleRowPointerUp(crewMemberId: string, event: PointerEvent<HTMLDivElement>) {
    if (!resizingChange) {
      return;
    }

    const dayKey = dayKeyFromPointer(event);
    if (dayKey) {
      resizeActiveChangeToDay(crewMemberId, dayKey);
    }
  }

  function setResizeState(change: PlanningDraftChange, edge: "start" | "end", mergedIds: string[]) {
    setResizingChange({
      date: change.date,
      edge,
      endDate: change.endDate,
      id: change.id,
      mergedIds,
    });
  }

  function handleCellPointerUp(crewMemberId: string, dayKey: string, event: PointerEvent) {
    if (suppressNextCellPointerUp.current) {
      suppressNextCellPointerUp.current = false;
      setDragStart(null);
      setQuickBlockPreview(null);
      return;
    }

    if (event.button !== 0) {
      setDragStart(null);
      setQuickBlockPreview(null);
      return;
    }

    if (resizingChange) {
      resizeActiveChangeToDay(crewMemberId, dayKey);
      return;
    }

    if (activeTemplate) {
      startTemplatePlacement(crewMemberId, dayKey, activeTemplate, event);
      setDragStart(null);
      setQuickBlockPreview(null);
      return;
    }

    if (!dragStart || dragStart.crewMemberId !== crewMemberId) {
      if (activeQuickBlock) {
        addLocalChange(
          crewMemberId,
          dayKey,
          dayKeyFromIndex(days, dayIndex(days, dayKey) + activeQuickBlock.defaultLengthDays - 1) ?? dayKey,
          activeQuickBlock.dutyStatus,
        );
      }
      setDragStart(null);
      setQuickBlockPreview(null);
      return;
    }

    const startIndex = dayIndex(days, dragStart.dayKey);
    const endIndex = dayIndex(days, dayKey);
    const startDate = days[Math.min(startIndex, endIndex)]?.dayKey ?? dayKey;
    const endDate = days[Math.max(startIndex, endIndex)]?.dayKey ?? dayKey;

    if (activeQuickBlock) {
      addLocalChange(crewMemberId, startDate, endDate, activeQuickBlock.dutyStatus);
    } else {
      setMenu({
        crewMemberId,
        endDate,
        startDate,
        x: event.clientX,
        y: event.clientY,
      });
    }
    setDragStart(null);
    setQuickBlockPreview(null);
  }

  function selectAll(selected: boolean) {
    const localOrDirtyIds = changes
      .filter((change) => selectableStatuses.has(change.status) && change.isLocal && change.selectedForPublish !== selected)
      .map((change) => change.id);
    setChanges((current) =>
      current.map((change) =>
        selectableStatuses.has(change.status) ? { ...change, selectedForPublish: selected } : change,
      ),
    );
    if (localOrDirtyIds.length > 0) {
      markDirtyIds(localOrDirtyIds);
    }
    if (draftId) {
      startTransition(() => {
        void setPlanningDraftSelectionAction({ draftId, selected });
      });
    }
    setMessage(selected ? "All open draft changes selected." : "Draft selections cleared.");
  }

  function updateChangeSelection(changeIds: string[], selected: boolean) {
    const activeIds = new Set(changeIds);
    const persistedIds = changes
      .filter((change) => activeIds.has(change.id) && !change.isLocal && selectableStatuses.has(change.status))
      .map((change) => change.id);
    const localIds = changes
      .filter((change) => activeIds.has(change.id) && change.isLocal && selectableStatuses.has(change.status))
      .map((change) => change.id);

    setChanges((current) =>
      current.map((change) =>
        activeIds.has(change.id) && selectableStatuses.has(change.status)
          ? { ...change, selectedForPublish: selected }
          : change,
      ),
    );

    if (localIds.length > 0) {
      markDirtyIds(localIds);
    }
    if (draftId && persistedIds.length > 0) {
      startTransition(() => {
        void setPlanningDraftSelectionAction({ changeIds: persistedIds, draftId, selected });
      });
    }
    setMessage(selected ? "Draft change selected." : "Draft change deselected.");
  }

  function publish(mode: "all" | "selected") {
    startTransition(async () => {
      const nextDraftId = await saveDirtyChanges();
      if (!nextDraftId) {
        setMessage("No draft is available to publish.");
        return;
      }
      const result = await publishPlanningDraftChangesAction({ draftId: nextDraftId, mode });
      const modeLabel = mode === "selected" ? "selected" : "all";
      const feedback = `Published ${modeLabel}: ${result.published} change${result.published === 1 ? "" : "s"}${result.reviewRequired ? `; ${result.reviewRequired} need review` : ""}${result.blockedConflicts ? `; ${result.blockedConflicts} blocked by overlap` : ""}.`;
      window.sessionStorage.setItem("aeroops-scheduling-planning-message", feedback);
      setChanges((current) =>
        current
          .filter((change) => !result.publishedIds.includes(change.id))
          .map((change) =>
            result.reviewRequiredIds.includes(change.id)
              ? { ...change, selectedForPublish: false, status: "REVIEW_REQUIRED" as DraftChangeStatus }
              : change,
          ),
      );
      setMessage(feedback);
      window.location.reload();
    });
  }

  function cancelSelected() {
    startTransition(async () => {
      const nextDraftId = await saveDirtyChanges();
      if (!nextDraftId) {
        setMessage("No draft is available to cancel.");
        return;
      }
      const result = await cancelSelectedPlanningDraftChangesAction({ draftId: nextDraftId });
      setChanges((current) =>
        current.filter(
          (change) =>
            !(change.selectedForPublish && (change.status === "DRAFT" || change.status === "REVIEW_REQUIRED")),
        ),
      );
      setDirtyIds(new Set());
      setMessage(`Cancelled ${result.cancelled} selected draft change${result.cancelled === 1 ? "" : "s"}.`);
    });
  }

  function addReusableTemplate() {
    const name = templateName.trim();
    const onDays = Math.max(1, Math.min(31, Number.parseInt(templateOnDays, 10) || 1));
    const offDays = Math.max(0, Math.min(31, Number.parseInt(templateOffDays, 10) || 0));
    const templateDays: PatternDay[] = [
      ...Array.from({ length: onDays }, (_value, index) => ({
        dayNumber: index + 1,
        dutyStatus: "ON_DUTY" as DutyStatus,
      })),
      ...Array.from({ length: offDays }, (_value, index) => ({
        dayNumber: onDays + index + 1,
        dutyStatus: "OFF_DUTY" as DutyStatus,
      })),
    ];

    if (!name) {
      setMessage("Template name is required.");
      return;
    }

    startTransition(async () => {
      const saved = await createReusableTemplateAction({
        days: templateDays,
        name,
      });
      const template: PlanningTemplate = {
        cycleLengthDays: saved.cycleLengthDays,
        days: saved.days,
        key: saved.id,
        label: saved.name,
        patternId: saved.id,
      };
      setCustomTemplates((current) => [...current, template]);
      setActiveTemplate(template);
      setActiveQuickBlock(null);
      setTemplateName("7 on / 7 off");
      setTemplateOnDays("7");
      setTemplateOffDays("7");
      setIsTemplateDrawerOpen(false);
      setMessage(`${saved.name} reusable template added.`);
    });
  }

  function renderTemplatePreview(crewMemberId: string) {
    if (!templatePreview || templatePreview.crewMemberId !== crewMemberId) {
      return null;
    }

    return contiguousTemplateChanges({
      counter: { current: -1000 },
      crewMemberId,
      cycles: templatePreview.cycles,
      days,
      groupId: "preview",
      startDate: templatePreview.startDate,
      template: templatePreview.template,
    }).map((change) => {
      const span = getChangeSpan(days, change);
      const style = statusStyle(change.dutyStatus);

      return (
        <div
          className="schedule-template-preview pointer-events-none z-30 m-1 flex items-center justify-center rounded-sm border border-dashed px-2 text-center text-[0.62rem] font-semibold leading-none shadow-sm"
          key={`${change.date}-${change.endDate}-${change.dutyStatus}`}
          style={{
            ...style,
            gridColumn: `${span.startIndex + 1} / span ${span.length}`,
            gridRow: 2,
          }}
        >
          <span className="truncate">{change.dutyStatus ? dutyLabels[change.dutyStatus] : "Template"}</span>
        </div>
      );
    });
  }

  function renderQuickBlockPreview(crewMemberId: string) {
    if (!quickBlockPreview || quickBlockPreview.crewMemberId !== crewMemberId) {
      return null;
    }

    const startIndex = dayIndex(days, quickBlockPreview.startDate);
    const endIndex = dayIndex(days, quickBlockPreview.endDate);
    const startDate = dayKeyFromIndex(days, Math.min(startIndex, endIndex)) ?? quickBlockPreview.startDate;
    const endDate = dayKeyFromIndex(days, Math.max(startIndex, endIndex)) ?? quickBlockPreview.endDate;
    const span = getChangeSpan(days, { date: startDate, endDate });
    const style = statusStyle(quickBlockPreview.dutyStatus);

    return (
      <div
        className="pointer-events-none z-30 m-1 flex items-center justify-center rounded-sm border-2 border-dashed px-2 text-center text-[0.62rem] font-bold leading-none shadow-sm ring-2 ring-white/70"
        style={{
          ...style,
          gridColumn: `${span.startIndex + 1} / span ${span.length}`,
          gridRow: 2,
        }}
      >
        <span className="truncate">{dutyLabels[quickBlockPreview.dutyStatus]}</span>
      </div>
    );
  }

  const activeToolLabel = activeTemplate
    ? `${templateShortLabel(activeTemplate)} template`
    : activeQuickBlock
      ? `${activeQuickBlock.label} quick block`
      : "No tool selected";
  const activeToolDetail = activeTemplate
    ? templateDetailLabel(activeTemplate)
    : activeQuickBlock
      ? "Drag across crew dates to create a range"
      : "Choose a quick block or reusable template";

  return (
    <div className="schedule-planning-canvas mt-4 min-w-0">
      <div className="mb-3 rounded-md border border-zinc-200 bg-white px-3 py-2 shadow-sm" style={{ minWidth: `max(100%, ${boardContentWidth})` }}>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-amber-800">
              Planning
            </span>
            <div className="relative">
              <button
                className="flex max-w-[260px] items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-left text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                onClick={() => setToolPickerOpen((current) => (current ? null : "quick"))}
                type="button"
              >
                <span className="truncate">Tool: {activeToolLabel}</span>
                <span className="text-zinc-400">Change</span>
              </button>
              {toolPickerOpen ? (
                <div className="absolute left-0 top-10 z-50 w-[360px] rounded-md border border-zinc-300 bg-white p-3 shadow-2xl">
                  <div className="flex gap-1 rounded-md bg-zinc-100 p-1">
                    <button
                      className={
                        toolPickerOpen === "quick"
                          ? "flex-1 rounded bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-sm"
                          : "flex-1 rounded px-3 py-1.5 text-xs font-semibold text-zinc-600"
                      }
                      onClick={() => setToolPickerOpen("quick")}
                      type="button"
                    >
                      Quick Blocks
                    </button>
                    <button
                      className={
                        toolPickerOpen === "templates"
                          ? "flex-1 rounded bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-sm"
                          : "flex-1 rounded px-3 py-1.5 text-xs font-semibold text-zinc-600"
                      }
                      onClick={() => setToolPickerOpen("templates")}
                      type="button"
                    >
                      Templates
                    </button>
                  </div>
                  {toolPickerOpen === "quick" ? (
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      {quickBlocks.map((block) => (
                        <button
                          className={
                            activeQuickBlock?.key === block.key
                              ? "rounded-full border-2 bg-white px-2 py-1 text-[0.68rem] font-bold text-zinc-950 shadow-sm ring-2 ring-sky-200"
                              : "rounded-full border px-2 py-1 text-[0.68rem] font-bold shadow-sm hover:ring-2 hover:ring-zinc-200"
                          }
                          key={block.key}
                          onClick={() => {
                            setActiveQuickBlock(block);
                            setActiveTemplate(null);
                            setToolPickerOpen(null);
                          }}
                          style={{
                            ...(quickBlockButtonStyles[block.key] ?? quickBlockButtonStyles.scheduled)[
                              activeQuickBlock?.key === block.key ? "selected" : "idle"
                            ],
                          }}
                          title={block.label}
                          type="button"
                        >
                          {quickBlockShortLabels[block.key] ?? block.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1">
                      {allTemplates.map((template) => (
                        <button
                          className={
                            activeTemplate?.key === template.key
                              ? "cursor-grab rounded-md border border-sky-600 bg-sky-50 px-3 py-2 text-left shadow-sm"
                              : draggingTemplateKey === template.key
                                ? "cursor-grabbing rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-left shadow-sm"
                                : "cursor-grab rounded-md border border-zinc-200 bg-white px-3 py-2 text-left hover:bg-sky-50"
                          }
                          draggable
                          key={template.key}
                          onDragEnd={() => {
                            setDraggingTemplateKey(null);
                            setTemplatePreview(null);
                          }}
                          onDragStart={(event) => handleTemplateDragStart(template, event)}
                          onClick={() => {
                            setActiveTemplate(template);
                            setActiveQuickBlock(null);
                            setToolPickerOpen(null);
                          }}
                          title={template.label}
                          type="button"
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-zinc-900">{templateShortLabel(template)}</span>
                            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[0.62rem] font-semibold text-zinc-500">
                              {template.cycleLengthDays}d
                            </span>
                          </span>
                          <span className="mt-1 block truncate text-xs text-zinc-500">{templateDetailLabel(template)}</span>
                        </button>
                      ))}
                      <button
                        className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                        onClick={() => {
                          setToolPickerOpen(null);
                          setIsTemplateDrawerOpen(true);
                        }}
                        type="button"
                      >
                        Create reusable template
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <span className="hidden text-xs text-zinc-500 sm:inline">{activeToolDetail}</span>
            <span className="text-xs text-zinc-500">{isPending ? "Working..." : message}</span>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 text-xs">
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-semibold">{draftCount} draft</span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-semibold text-sky-800">{selectedCount} selected</span>
            {reviewCount > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">{reviewCount} review</span>
            ) : null}
            <button className="rounded-md border border-zinc-950 bg-zinc-950 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50" disabled={isPending} onClick={() => startTransition(() => void saveDirtyChanges())} type="button">
              Save draft
            </button>
            <button className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50" onClick={() => selectAll(true)} type="button">
              Select all
            </button>
            <button className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50" onClick={() => selectAll(false)} type="button">
              Clear selection
            </button>
            <button className="rounded-md border border-rose-700 bg-rose-600 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50" disabled={removableSelectedCount === 0 || isPending} onClick={cancelSelected} type="button">
              Remove selected
            </button>
            <button className="rounded-md border border-emerald-700 bg-emerald-700 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50" disabled={selectedCount === 0 || isPending} onClick={() => publish("selected")} type="button">
              Publish selected
            </button>
            <button className="rounded-md border border-emerald-700 bg-emerald-600 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50" disabled={publishableCount === 0 || isPending} onClick={() => publish("all")} type="button">
              Publish all
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div
          className={`schedule-planning-board-scroll ${isBoardFocused ? "max-h-[calc(100vh-11rem)] min-h-[620px]" : "max-h-[calc(100vh-18rem)] min-h-[520px]"}`}
          title="Scroll horizontally to move across the planning board"
        >
          <div className="min-w-max rounded-md border border-zinc-300 bg-white p-3 shadow-sm" style={{ minWidth: `max(100%, ${boardContentWidth})` }}>
            <div className="sticky top-0 z-[90] mb-3 rounded-md border border-zinc-300 bg-zinc-100 text-xs font-semibold text-zinc-500 shadow-sm">
              <div className="grid border-b border-zinc-200" style={{ gridTemplateColumns }}>
                <div
                  className="sticky left-0 z-[100] flex items-center border-r border-zinc-200 bg-zinc-100 px-3 py-2 text-zinc-700 shadow-[2px_0_0_rgba(212,212,216,0.6)]"
                  style={{ width: crewColumnWidth }}
                >
                  {navigation.previousHref ? (
                    <a
                      className="rounded-full border border-zinc-300 bg-white px-2.5 py-1 font-semibold text-zinc-700 hover:bg-zinc-50"
                      href={navigation.previousHref}
                    >
                      Prev
                    </a>
                  ) : (
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-semibold text-zinc-400">
                      Prev
                    </span>
                  )}
                </div>
                {monthHeaderSegments.map((segment, index) => (
                  <div
                    className="flex items-center justify-center border-r border-zinc-200 bg-zinc-100 px-2 py-2 text-center font-semibold text-zinc-700"
                    key={`${segment.label}-${segment.startIndex}`}
                    style={{ gridColumn: `${segment.startIndex + 2} / span ${segment.length}` }}
                  >
                    {index === monthHeaderSegments.length - 1 ? (
                      <span className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <span />
                        <span>{segment.label}</span>
                        <a
                          className="justify-self-end rounded-full border border-zinc-300 bg-white px-2.5 py-1 font-semibold text-zinc-700 hover:bg-zinc-50"
                          href={navigation.nextHref}
                        >
                          Next
                        </a>
                      </span>
                    ) : (
                      segment.label
                    )}
                  </div>
                ))}
              </div>
              <div className="grid border-b border-zinc-200" style={{ gridTemplateColumns }}>
                <div
                  className="sticky left-0 z-[100] flex items-center justify-between gap-2 border-r border-zinc-200 bg-zinc-100 px-3 py-2 text-zinc-700 shadow-[2px_0_0_rgba(212,212,216,0.6)]"
                  style={{ width: crewColumnWidth }}
                >
                  <span>Crew</span>
                  <a
                    className="rounded-full border border-sky-300 bg-white px-2.5 py-1 text-[0.65rem] font-semibold text-sky-800 hover:bg-sky-50"
                    href={navigation.todayHref}
                  >
                    Today
                  </a>
                </div>
                {days.map((day) => {
                  const isToday = day.dayKey === todayKey;

                  return (
                    <div
                      className={`border-r px-2 py-2 text-center ${
                        isToday
                          ? "border-zinc-950 bg-zinc-700 text-white ring-1 ring-inset ring-zinc-950/40"
                          : "border-zinc-200 text-zinc-700"
                      }`}
                      key={day.dayKey}
                    >
                      <span className="block text-[0.65rem] uppercase">{day.weekday}</span>
                      <span className="block text-xs font-semibold">{day.dayNumber}</span>
                    </div>
                  );
                })}
              </div>
            </div>
        {groups.map((group) => (
          <section className="schedule-week-band mb-3 rounded-md border border-zinc-300 shadow-sm last:mb-0" key={`${group.aircraftType}-${group.seatRole}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-2">
              <h3 className="text-sm font-semibold text-zinc-950">{group.label}</h3>
              <div className="flex flex-wrap gap-1.5 text-[0.62rem] font-semibold">
                <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5">Published top</span>
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-800">Draft bottom</span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-800">
                  Months {countMonths.map((month) => month.label).join(" / ")}
                </span>
              </div>
            </div>
            <div className="rounded-md border border-zinc-300 bg-white shadow-sm">
              <div>
                {group.crew.map((crewMember) => {
                  const rowChanges = changes.filter((change) => change.crewMemberId === crewMember.crewMemberId && change.status !== "CANCELLED");

                  return (
                    <div className="grid border-b border-zinc-100 last:border-b-0" key={crewMember.crewMemberId} style={{ gridTemplateColumns }}>
                      <div
                        className="sticky left-0 z-20 flex min-w-0 items-center gap-3 border-r border-zinc-200 bg-white px-3 py-3 shadow-[2px_0_0_rgba(228,228,231,0.65)]"
                        style={{ width: crewColumnWidth }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-zinc-950">{crewMember.name}</p>
                          <p className="truncate text-[0.68rem] text-zinc-500">Base {crewMember.baseStationCode}</p>
                        </div>
                        <div className="grid min-w-[5.25rem] shrink-0 gap-0.5">
                          {countMonths.map((month) => {
                            const publishedDays = crewMember.publishedScheduledMonths.find((count) => count.monthKey === month.key)?.published ?? 0;
                            const draftScheduledDays = countDraftScheduledDays(changes, crewMember.crewMemberId, month.start, month.end);

                            return (
                              <span
                                className={`rounded-full border px-1.5 py-0.5 text-[0.62rem] font-semibold leading-none ${monthCountTone(draftScheduledDays)}`}
                                key={month.key}
                                title={`${month.label}: Published reserve ${publishedDays}, Draft reserve ${draftScheduledDays}, prototype limit ${prototypeMonthlyScheduledDayLimit}`}
                              >
                                {month.label} P{publishedDays} D{draftScheduledDays}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div
                        className="grid min-h-[74px]"
                        data-planning-row-grid="true"
                        onPointerMove={(event) => handleRowPointerMove(crewMember.crewMemberId, event)}
                        onPointerUp={(event) => handleRowPointerUp(crewMember.crewMemberId, event)}
                        style={{ gridColumn: `2 / span ${days.length}`, gridTemplateColumns: `repeat(${days.length}, ${columnWidth})`, gridTemplateRows: "34px 34px" }}
                      >
                        {days.map((day, index) => (
                          <button
                            aria-label={`${crewMember.name} ${day.label}`}
                            className={`border-r text-left ${
                              day.dayKey === todayKey
                                ? "border-zinc-800 bg-zinc-700 hover:bg-zinc-700"
                                : "border-zinc-100 hover:bg-sky-50"
                            }`}
                            key={day.dayKey}
                            onDragOver={(event) => {
                              const template = findTemplate(draggingTemplateKey) ?? activeTemplate;
                              if (template) {
                                event.preventDefault();
                                previewTemplatePlacement(crewMember.crewMemberId, day.dayKey, template);
                              }
                            }}
                            onDrop={(event) => handleTemplateDrop(crewMember.crewMemberId, day.dayKey, event)}
                            onPointerCancel={() => {
                              setDragStart(null);
                              setQuickBlockPreview(null);
                              setResizingChange(null);
                              setResizePreview(null);
                            }}
                            onPointerDown={(event) => {
                              if (event.button !== 0) {
                                return;
                              }

                              if (draftContextMenu) {
                                suppressNextCellPointerUp.current = true;
                                setDraftContextMenu(null);
                                setDragStart(null);
                                setQuickBlockPreview(null);
                                return;
                              }

                              setDragStart({ crewMemberId: crewMember.crewMemberId, dayKey: day.dayKey });
                              if (activeQuickBlock && !activeTemplate) {
                                setQuickBlockPreview({
                                  crewMemberId: crewMember.crewMemberId,
                                  dutyStatus: activeQuickBlock.dutyStatus,
                                  endDate: day.dayKey,
                                  startDate: day.dayKey,
                                });
                              }
                            }}
                            onPointerEnter={() => {
                              if (dragStart?.crewMemberId === crewMember.crewMemberId && activeQuickBlock && !activeTemplate) {
                                setQuickBlockPreview({
                                  crewMemberId: crewMember.crewMemberId,
                                  dutyStatus: activeQuickBlock.dutyStatus,
                                  endDate: day.dayKey,
                                  startDate: dragStart.dayKey,
                                });
                                return;
                              }

                              if (resizingChange) {
                                setResizePreview({
                                  crewMemberId: crewMember.crewMemberId,
                                  dayKey: day.dayKey,
                                });
                                return;
                              }

                              previewTemplatePlacement(crewMember.crewMemberId, day.dayKey);
                            }}
                            onPointerUp={(event) => handleCellPointerUp(crewMember.crewMemberId, day.dayKey, event)}
                            style={{ gridColumn: index + 1, gridRow: "1 / span 2" }}
                            type="button"
                          />
                        ))}
                        {crewMember.publishedRuns.map((run) => (
                          <div
                            className="z-10 m-1 flex items-center justify-center rounded-sm border px-2 text-center text-[0.65rem] font-semibold leading-none shadow-sm"
                            key={`${crewMember.crewMemberId}-${run.startDayKey}-${run.statusKey}`}
                            style={{
                              ...run.style,
                              gridColumn: `${run.startIndex + 1} / span ${run.length}`,
                              gridRow: 1,
                            }}
                            title={`Published: ${run.label}`}
                          >
                            <span className="truncate">{run.label}</span>
                          </div>
                        ))}
                        {renderTemplatePreview(crewMember.crewMemberId)}
                        {renderQuickBlockPreview(crewMember.crewMemberId)}
                        {previewDraftBlocks(days, rowChanges, resizingChange, resizePreview?.crewMemberId === crewMember.crewMemberId ? resizePreview : null).map((change) => {
                          const span = getChangeSpan(days, change);
                          const style = statusStyle(change.dutyStatus);
                          const changeIds = change.mergedIds ?? [change.id];
                          const isResizePreview =
                            Boolean(resizingChange && resizePreview?.crewMemberId === crewMember.crewMemberId) &&
                            changeIds.includes(resizingChange?.id ?? "");

                          return (
                            <div
                              className={`group/draft relative z-20 m-1 flex items-center gap-1 rounded-sm border border-dashed px-2 text-[0.62rem] font-semibold leading-none shadow-sm ${isResizePreview ? "schedule-resize-preview" : ""}`}
                              key={changeIds.join("-")}
                              onContextMenu={(event) => {
                                event.preventDefault();
                                openDraftContextMenu(changeIds, draftLabel(change), event.clientX, event.clientY);
                              }}
                              onPointerMove={(event) => {
                                if (!resizingChange) {
                                  return;
                                }
                                const dayKey = dayKeyFromPointer(event);
                                if (dayKey) {
                                  setResizePreview({ crewMemberId: crewMember.crewMemberId, dayKey });
                                }
                              }}
                              onPointerUp={(event) => handleDraftBarPointerUp(change, crewMember.crewMemberId, event)}
                              style={{
                                ...style,
                                gridColumn: `${span.startIndex + 1} / span ${span.length}`,
                                gridRow: 2,
                              }}
                              title={`${isResizePreview ? "Resize preview" : "Draft"}: ${draftLabel(change)}`}
                            >
                              <input
                                aria-label={`Select ${draftLabel(change)} for publish`}
                                checked={change.selectedForPublish}
                                className="h-3 w-3 shrink-0"
                                onChange={(event) => {
                                  updateChangeSelection(changeIds, event.target.checked);
                                }}
                                type="checkbox"
                              />
                              <span className="min-w-0 flex-1 truncate">{draftLabel(change)}</span>
                              <button
                                aria-label={`Resize start of ${draftLabel(change)}`}
                                className="absolute -left-1 top-0 h-full w-2 cursor-ew-resize rounded-l-sm bg-white/60 opacity-80 ring-1 ring-black/10 transition group-hover/draft:bg-sky-200 group-hover/draft:opacity-100"
                                onPointerDown={(event) => {
                                  if (event.button !== 0) {
                                    return;
                                  }
                                  event.stopPropagation();
                                  setResizeState(change, "start", changeIds);
                                }}
                                title={`Resize start of ${draftLabel(change)}`}
                                type="button"
                              />
                              <button
                                aria-label={`Resize end of ${draftLabel(change)}`}
                                className="absolute -right-1 top-0 h-full w-2 cursor-ew-resize rounded-r-sm bg-white/60 opacity-80 ring-1 ring-black/10 transition group-hover/draft:bg-sky-200 group-hover/draft:opacity-100"
                                onPointerDown={(event) => {
                                  if (event.button !== 0) {
                                    return;
                                  }
                                  event.stopPropagation();
                                  setResizeState(change, "end", changeIds);
                                }}
                                title={`Resize end of ${draftLabel(change)}`}
                                type="button"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
          </div>
        </div>
      </div>

      {isTemplateDrawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-zinc-950/20">
          <aside className="h-full w-full max-w-md border-l border-zinc-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Reusable Template</p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-950">Create reusable template</h3>
              </div>
              <button
                className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                onClick={() => setIsTemplateDrawerOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</span>
                <input
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="7 on / 7 off"
                  type="text"
                  value={templateName}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Reserve days</span>
                  <input
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                    max={31}
                    min={1}
                    onChange={(event) => setTemplateOnDays(event.target.value)}
                    type="number"
                    value={templateOnDays}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Off days</span>
                  <input
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                    max={31}
                    min={0}
                    onChange={(event) => setTemplateOffDays(event.target.value)}
                    type="number"
                    value={templateOffDays}
                  />
                </label>
              </div>
              <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
                Cycle length: {(Number.parseInt(templateOnDays, 10) || 0) + (Number.parseInt(templateOffDays, 10) || 0)} days
              </p>
              <button
                className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                disabled={isPending}
                onClick={addReusableTemplate}
                type="button"
              >
                Add reusable template
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {placement ? (
        <div className="fixed z-50 w-64 rounded-md border border-zinc-300 bg-white p-3 shadow-2xl" style={{ left: placement.x, top: placement.y }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Place template</p>
          <p className="mt-1 text-sm font-semibold text-zinc-950">{placement.template.label}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {placement.template.cycleLengthDays} days per cycle, starting {placement.startDate}
          </p>
          <label className="mt-3 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Cycles</span>
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              max={13}
              min={1}
              onChange={(event) => setPlacementCycles(event.target.value)}
              type="number"
              value={placementCycles}
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button className="rounded-md bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white" onClick={confirmTemplatePlacement} type="button">
              Place
            </button>
            <button className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700" onClick={() => setPlacement(null)} type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {draftContextMenu ? (
        <div
          className="fixed z-50 w-56 rounded-md border border-zinc-300 bg-white p-1.5 text-sm shadow-2xl"
          style={{ left: draftContextMenu.x, top: draftContextMenu.y }}
        >
          <p className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{draftContextMenu.label}</p>
          <div className="grid gap-0.5 border-b border-zinc-100 pb-1">
            {draftContextStatusOptions.map((option) => (
              <button
                className="block w-full rounded px-2 py-1.5 text-left text-xs font-semibold text-zinc-800 hover:bg-sky-50"
                key={option.label}
                onClick={() => {
                  updateDraftChangesStatus(draftContextMenu.changeIds, option.dutyStatus);
                  setDraftContextMenu(null);
                }}
                type="button"
              >
                Set {option.label}
              </button>
            ))}
          </div>
          <button
            className="mt-1 block w-full rounded px-2 py-1.5 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50"
            onClick={() => {
              removeDraftChanges(draftContextMenu.changeIds);
              setDraftContextMenu(null);
            }}
            type="button"
          >
            Remove block
          </button>
          <button
            className="block w-full rounded px-2 py-1.5 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            onClick={() => setDraftContextMenu(null)}
            type="button"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {menu ? (
        <div className="fixed z-50 rounded-md border border-zinc-300 bg-white p-2 shadow-2xl" style={{ left: menu.x, top: menu.y }}>
          <p className="px-2 pb-1 text-xs font-semibold text-zinc-500">Create quick block</p>
          {quickBlocks.map((block) => (
            <button
              className="block w-full rounded px-3 py-1.5 text-left text-sm font-semibold text-zinc-800 hover:bg-sky-50"
              key={block.key}
              onClick={() => {
                addLocalChange(menu.crewMemberId, menu.startDate, menu.endDate, block.dutyStatus);
                setMenu(null);
              }}
              type="button"
            >
              {block.label}
            </button>
          ))}
          <button className="mt-1 block w-full rounded px-3 py-1.5 text-left text-sm text-zinc-500 hover:bg-zinc-50" onClick={() => setMenu(null)} type="button">
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
