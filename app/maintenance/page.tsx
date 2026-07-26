import {
  AircraftLogbookEntryStatus,
  AircraftLogbookEntryType,
  AircraftType,
  AircraftStatus,
  AogResolutionPhase,
  DiscrepancyStatus,
  MaintenanceComplianceStatus,
  MaintenanceEventStatus,
  MaintenanceProgramApplicabilityScope,
  MaintenanceProgramOverrideAction,
  MaintenanceProgramTaskCategory,
  UserRole,
} from "@prisma/client";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  MaintenanceLogbookDrawer,
  type MaintenanceLogbookDrawerUrlState,
} from "@/components/maintenance-logbook-drawer";
import {
  addMaintenanceProgramApplicabilityAction,
  addMaintenanceProgramOverrideAction,
  createAircraftMeterSnapshotAction,
  createMaintenanceProgramTaskAction,
  convertMaintenanceControlHoldAction,
  convertMaintenanceControlHoldToScheduledAction,
  markMaintenanceTaskNotApplicableAction,
  placeMaintenanceControlHoldAction,
  planScheduledMaintenanceAction,
  releaseMaintenanceControlHoldAction,
  releaseMaintenanceOccurrenceAction,
  retireMaintenanceProgramApplicabilityAction,
  setMaintenanceProgramTaskActiveAction,
  startScheduledMaintenanceAction,
  updateDiscrepancyAogPhaseAction,
  updateMaintenanceProgramTaskAction,
  upsertMaintenanceComplianceBaselineAction,
} from "@/app/maintenance/actions";
import { requireRole } from "@/lib/auth/guards";
import {
  getMaintenanceLogbookDrawerData,
  normalizeLogbookDrawerLimit,
  parseLogbookDrawerDate,
} from "@/lib/maintenance-logbook-drawer";
import {
  getMaintenanceWorkbenchData,
  type MaintenanceLogbookItem,
  type MaintenanceBoardStatus,
  type MaintenanceProgramItem,
  type MaintenanceQueueItem,
  type MaintenanceQueueSortFocus,
  type MaintenanceScheduledItem,
} from "@/lib/maintenance-workbench-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
    selected?: string | string[];
    scheduledStatus?: string | string[];
    entryType?: string | string[];
    logbookStatus?: string | string[];
    logbookAircraft?: string | string[];
    logbookDrawerQ?: string | string[];
    logbookCursor?: string | string[];
    logbookDrawerStatus?: string | string[];
    logbookDrawerType?: string | string[];
    logbookEntry?: string | string[];
    logbookFrom?: string | string[];
    logbookLimit?: string | string[];
    logbookTo?: string | string[];
    category?: string | string[];
    active?: string | string[];
    required?: string | string[];
    submitted?: string | string[];
    q?: string | string[];
    status?: string | string[];
    tail?: string | string[];
    aircraftType?: string | string[];
    view?: string | string[];
  }>;
};

type ViewMode = "queue" | "scheduled" | "program" | "logbook";

type QueueItemGroup = {
  aircraftId: string;
  aircraftStatus: AircraftStatus;
  aircraftType: AircraftType;
  boardStatus: MaintenanceBoardStatus;
  items: MaintenanceQueueItem[];
  tailNumber: string;
};

type NextScheduledMaintenance = {
  item: MaintenanceScheduledItem;
  timeLabel: string;
};

type ScheduledItemGroup = {
  aircraftId: string;
  aircraftType: AircraftType;
  items: MaintenanceScheduledItem[];
  tailNumber: string;
};

type LogbookItemGroup = {
  aircraftId: string;
  aircraftType: AircraftType;
  items: MaintenanceLogbookItem[];
  tailNumber: string;
};

type MaintenanceFleetStats = {
  aogCount: number;
  deferredCount: number;
  inServiceCount: number;
  plannedMaintenanceCount: number;
  serviceablePercent: number;
  totalAircraft: number;
  typeSummaries: Array<{
    aircraftType: AircraftType;
    inServiceCount: number;
    totalAircraft: number;
  }>;
};

type ProgramItemGroup = {
  description: string;
  items: MaintenanceProgramItem[];
  key: string;
  label: string;
};

const statusOptions: { label: string; value: MaintenanceQueueSortFocus }[] = [
  { label: "AOG", value: "AOG" },
  { label: "Serviceable", value: "SERVICEABLE" },
  { label: "MEL", value: "MEL" },
  { label: "CDL", value: "CDL" },
  { label: "NEF", value: "NEF" },
];

const aogPhaseOptions: { label: string; value: AogResolutionPhase }[] = [
  { label: "Needs assessment", value: AogResolutionPhase.NEEDS_ASSESSMENT },
  { label: "Troubleshooting", value: AogResolutionPhase.TROUBLESHOOTING },
  { label: "Awaiting parts", value: AogResolutionPhase.AWAITING_PARTS },
  { label: "Repair in progress", value: AogResolutionPhase.REPAIR_IN_PROGRESS },
  { label: "RTS pending", value: AogResolutionPhase.RTS_PENDING },
];

const scheduledStatusOptions: { label: string; value: MaintenanceComplianceStatus }[] = [
  { label: "Needs baseline", value: MaintenanceComplianceStatus.NEEDS_BASELINE },
  { label: "Overdue", value: MaintenanceComplianceStatus.OVERDUE },
  { label: "Due", value: MaintenanceComplianceStatus.DUE },
  { label: "Due soon", value: MaintenanceComplianceStatus.DUE_SOON },
  { label: "Current", value: MaintenanceComplianceStatus.CURRENT },
  { label: "Not applicable", value: MaintenanceComplianceStatus.NOT_APPLICABLE },
];

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeView(value: string | null): ViewMode {
  if (value === "scheduled" || value === "program" || value === "logbook") {
    return value;
  }

  return "queue";
}

function normalizeStatus(value: string | null): MaintenanceQueueSortFocus {
  if (value && statusOptions.some((option) => option.value === value)) {
    return value as MaintenanceQueueSortFocus;
  }

  return "AOG";
}

function normalizeAircraftType(value: string | null): AircraftType | null {
  if (value && Object.values(AircraftType).includes(value as AircraftType)) {
    return value as AircraftType;
  }

  return null;
}

function normalizeScheduledStatus(value: string | null): MaintenanceComplianceStatus | null {
  if (value && Object.values(MaintenanceComplianceStatus).includes(value as MaintenanceComplianceStatus)) {
    return value as MaintenanceComplianceStatus;
  }

  return null;
}

function normalizeLogbookStatus(value: string | null): AircraftLogbookEntryStatus | null {
  if (value && Object.values(AircraftLogbookEntryStatus).includes(value as AircraftLogbookEntryStatus)) {
    return value as AircraftLogbookEntryStatus;
  }

  return null;
}

function normalizeLogbookEntryType(value: string | null): AircraftLogbookEntryType | null {
  if (value && Object.values(AircraftLogbookEntryType).includes(value as AircraftLogbookEntryType)) {
    return value as AircraftLogbookEntryType;
  }

  return null;
}

function normalizeTaskCategory(value: string | null): MaintenanceProgramTaskCategory | null {
  if (value && Object.values(MaintenanceProgramTaskCategory).includes(value as MaintenanceProgramTaskCategory)) {
    return value as MaintenanceProgramTaskCategory;
  }

  return null;
}

function normalizeActiveFilter(value: string | null): "active" | "inactive" | null {
  return value === "active" || value === "inactive" ? value : null;
}

function normalizeRequiredFilter(value: string | null): "required" | "optional" | null {
  return value === "required" || value === "optional" ? value : null;
}

function formatEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function aircraftTypeLabel(value: AircraftType): string {
  if (value === AircraftType.CL_65) {
    return "CL 65";
  }

  if (value === AircraftType.EMB_135_145) {
    return "EMB 135 145";
  }

  return formatEnum(value);
}

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: false,
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function dateTimeInputValue(value: Date | null): string {
  if (!value) {
    return "";
  }

  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function aogPhaseLabel(phase: AogResolutionPhase | null): string {
  if (!phase) {
    return "Not set";
  }

  return aogPhaseOptions.find((option) => option.value === phase)?.label ?? formatEnum(phase);
}

function aogEtaLabel(phase: AogResolutionPhase | null): string {
  if (phase === AogResolutionPhase.TROUBLESHOOTING) {
    return "Next update";
  }

  if (phase === AogResolutionPhase.AWAITING_PARTS) {
    return "Parts ETA";
  }

  if (phase === AogResolutionPhase.REPAIR_IN_PROGRESS) {
    return "Repair ETA";
  }

  if (phase === AogResolutionPhase.RTS_PENDING) {
    return "RTS ETA";
  }

  return "ETA";
}

function compactTime(item: MaintenanceQueueItem): string {
  if (item.aogEtaAt) {
    return `${aogEtaLabel(item.aogPhase)} ${formatDateTime(item.aogEtaAt)}`;
  }

  if (item.dueAt) {
    return `Due ${formatDateTime(item.dueAt)}`;
  }

  if (item.eventAt) {
    return `Reported ${formatDateTime(item.eventAt)}`;
  }

  return "No time set";
}

function scheduledTimeLabel(item: MaintenanceScheduledItem): string {
  if (item.nextDueAt || item.nextDueAirframeHours !== null || item.nextDueCycles !== null) {
    return [
      item.nextDueAt ? formatDateTime(item.nextDueAt) : null,
      item.nextDueAirframeHours !== null ? `${item.nextDueAirframeHours.toLocaleString()} hrs` : null,
      item.nextDueCycles !== null ? `${item.nextDueCycles.toLocaleString()} cycles` : null,
    ].filter(Boolean).join(" / ");
  }

  if (item.maintenanceEvent?.scheduledAt) {
    return `Scheduled ${formatDateTime(item.maintenanceEvent.scheduledAt)}`;
  }

  if (item.maintenanceEvent?.startedAt) {
    return `Started ${formatDateTime(item.maintenanceEvent.startedAt)}`;
  }

  return "Needs baseline";
}

function scheduledReferenceTime(item: MaintenanceScheduledItem): number {
  return item.maintenanceEvent?.startedAt?.getTime()
    ?? item.maintenanceEvent?.scheduledAt?.getTime()
    ?? item.nextDueAt?.getTime()
    ?? Number.MAX_SAFE_INTEGER;
}

function scheduledReferenceRank(item: MaintenanceScheduledItem): number {
  if (item.complianceStatus === MaintenanceComplianceStatus.NOT_APPLICABLE) {
    return 99;
  }

  if (item.maintenanceEvent?.status === MaintenanceEventStatus.IN_PROGRESS) {
    return 0;
  }

  if (item.maintenanceEvent?.scheduledAt) {
    return 1;
  }

  if (
    item.complianceStatus === MaintenanceComplianceStatus.OVERDUE ||
    item.complianceStatus === MaintenanceComplianceStatus.DUE ||
    item.complianceStatus === MaintenanceComplianceStatus.DUE_SOON
  ) {
    return 2;
  }

  if (item.nextDueAt || item.nextDueAirframeHours !== null || item.nextDueCycles !== null) {
    return 3;
  }

  if (item.complianceStatus === MaintenanceComplianceStatus.NEEDS_BASELINE) {
    return 4;
  }

  return 5;
}

function buildNextScheduledMaintenanceMap(items: MaintenanceScheduledItem[]) {
  const grouped = new Map<string, MaintenanceScheduledItem[]>();

  for (const item of items) {
    if (item.complianceStatus === MaintenanceComplianceStatus.NOT_APPLICABLE) {
      continue;
    }

    grouped.set(item.aircraftId, [...(grouped.get(item.aircraftId) ?? []), item]);
  }

  return Array.from(grouped).reduce((map, [aircraftId, aircraftItems]) => {
    const item = aircraftItems
      .slice()
      .sort((first, second) => {
        const rankDelta = scheduledReferenceRank(first) - scheduledReferenceRank(second);

        if (rankDelta !== 0) {
          return rankDelta;
        }

        const timeDelta = scheduledReferenceTime(first) - scheduledReferenceTime(second);

        if (timeDelta !== 0) {
          return timeDelta;
        }

        return first.taskTitle.localeCompare(second.taskTitle);
      })[0];

    if (item) {
      map.set(aircraftId, {
        item,
        timeLabel: scheduledTimeLabel(item),
      });
    }

    return map;
  }, new Map<string, NextScheduledMaintenance>());
}

function groupScheduledItems(items: MaintenanceScheduledItem[]): ScheduledItemGroup[] {
  const groups = new Map<string, ScheduledItemGroup>();

  for (const item of items) {
    const group = groups.get(item.aircraftId);
    if (group) {
      group.items.push(item);
    } else {
      groups.set(item.aircraftId, {
        aircraftId: item.aircraftId,
        aircraftType: item.aircraftType,
        items: [item],
        tailNumber: item.tailNumber,
      });
    }
  }

  return Array.from(groups.values());
}

function groupLogbookItems(items: MaintenanceLogbookItem[]): LogbookItemGroup[] {
  const groups = new Map<string, LogbookItemGroup>();

  for (const item of items) {
    const group = groups.get(item.aircraftId);
    if (group) {
      group.items.push(item);
    } else {
      groups.set(item.aircraftId, {
        aircraftId: item.aircraftId,
        aircraftType: item.aircraftType,
        items: [item],
        tailNumber: item.tailNumber,
      });
    }
  }

  return Array.from(groups.values());
}

function isUnresolvedLogbookItem(item: MaintenanceLogbookItem): boolean {
  return item.status === AircraftLogbookEntryStatus.OPEN
    || item.status === AircraftLogbookEntryStatus.DEFERRED
    || item.status === AircraftLogbookEntryStatus.CORRECTED
    || item.status === AircraftLogbookEntryStatus.READY_FOR_SIGNATURE;
}

function isActionableLogbookItem(item: MaintenanceLogbookItem): boolean {
  return item.status === AircraftLogbookEntryStatus.DRAFT
    || item.status === AircraftLogbookEntryStatus.OPEN
    || item.status === AircraftLogbookEntryStatus.CORRECTED
    || item.status === AircraftLogbookEntryStatus.READY_FOR_SIGNATURE;
}

function hasUnresolvedDiscrepancy(item: MaintenanceLogbookItem): boolean {
  return item.discrepancy?.status === DiscrepancyStatus.OPEN
    || item.discrepancy?.status === DiscrepancyStatus.DEFERRED
    || item.discrepancy?.status === DiscrepancyStatus.CORRECTED_PENDING_RTS;
}

function aircraftStatusLabel(status: AircraftStatus): string {
  if (status === AircraftStatus.OUT_OF_SERVICE) {
    return "AOG";
  }

  return formatEnum(status);
}

function boardStatusLabel(status: MaintenanceBoardStatus): string {
  if (status === "AOG") {
    return "AOG";
  }

  if (status === "SERVICEABLE_MEL") {
    return "MEL";
  }

  if (status === "SERVICEABLE_CDL") {
    return "CDL";
  }

  if (status === "SERVICEABLE_NEF") {
    return "NEF";
  }

  if (status === "SERVICEABLE_OTHER_DEFERRAL") {
    return "Deferred";
  }

  if (status === "SERVICEABLE_SCHEDULED_MX") {
    return "Scheduled MX";
  }

  return formatEnum(status);
}

function boardStatusClasses(status: MaintenanceBoardStatus): string {
  if (status === "AOG") {
    return "border-rose-300 bg-rose-50 text-rose-800";
  }

  if (
    status === "SERVICEABLE_MEL" ||
    status === "SERVICEABLE_CDL" ||
    status === "SERVICEABLE_NEF" ||
    status === "SERVICEABLE_OTHER_DEFERRAL"
  ) {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }

  if (status === "SERVICEABLE_SCHEDULED_MX") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function queueBoardStatusRank(status: MaintenanceBoardStatus): number {
  if (status === "AOG") {
    return 0;
  }

  if (
    status === "SERVICEABLE_MEL" ||
    status === "SERVICEABLE_CDL" ||
    status === "SERVICEABLE_NEF" ||
    status === "SERVICEABLE_OTHER_DEFERRAL"
  ) {
    return 1;
  }

  if (status === "SERVICEABLE_SCHEDULED_MX") {
    return 2;
  }

  return 3;
}

function groupBoardStatus(items: MaintenanceQueueItem[]): MaintenanceBoardStatus {
  return items
    .map((item) => item.boardStatus)
    .sort((first, second) => queueBoardStatusRank(first) - queueBoardStatusRank(second))[0] ?? "SERVICEABLE";
}

function queueGroupSummary(group: QueueItemGroup): string {
  const aogCount = group.items.filter((item) => item.boardStatus === "AOG").length;
  const melCount = group.items.filter((item) => item.boardStatus === "SERVICEABLE_MEL").length;
  const cdlCount = group.items.filter((item) => item.boardStatus === "SERVICEABLE_CDL").length;
  const nefCount = group.items.filter((item) => item.boardStatus === "SERVICEABLE_NEF").length;
  const scheduledCount = group.items.filter((item) => item.boardStatus === "SERVICEABLE_SCHEDULED_MX").length;
  const details = [
    `${group.items.length} item${group.items.length === 1 ? "" : "s"}`,
    aogCount > 0 ? `${aogCount} AOG` : null,
    melCount > 0 ? `${melCount} MEL` : null,
    cdlCount > 0 ? `${cdlCount} CDL` : null,
    nefCount > 0 ? `${nefCount} NEF` : null,
    scheduledCount > 0 ? `${scheduledCount} scheduled MX` : null,
  ].filter(Boolean);

  return details.join(" | ");
}

function queueGroupPhaseSummary(group: QueueItemGroup): string {
  const phases = Array.from(
    new Set(group.items.filter((item) => item.boardStatus === "AOG").map((item) => aogPhaseLabel(item.aogPhase))),
  );

  if (phases.length === 0) {
    return aircraftStatusLabel(group.aircraftStatus);
  }

  return phases.slice(0, 2).join(" / ");
}

function statusClasses(status: string): string {
  if (status === "AOG" || status === "NOT SERVICEABLE" || status === "OVERDUE") {
    return "border-rose-300 bg-rose-50 text-rose-800";
  }

  if (status.includes("DEFER") || status.includes("RTS") || status.includes("LIMITATION") || status === "DUE" || status === "DUE SOON" || status === "NEEDS BASELINE") {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }

  if (status.includes("SERVICEABLE") || status === "SIGNED" || status === "CURRENT") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function scheduledStatusLabel(status: MaintenanceComplianceStatus) {
  return formatEnum(status);
}

function scheduledEventLabel(item: MaintenanceScheduledItem) {
  if (!item.maintenanceEvent) {
    return "No event linked";
  }

  return `${item.maintenanceEvent.maintenanceNumber} | ${formatEnum(item.maintenanceEvent.status)}`;
}

function latestMeterLabel(item: MaintenanceScheduledItem) {
  const values = [
    item.latestAirframeHours !== null ? `${item.latestAirframeHours.toLocaleString()} hrs` : null,
    item.latestAirframeCycles !== null ? `${item.latestAirframeCycles.toLocaleString()} cycles` : null,
  ].filter(Boolean);

  if (values.length === 0) {
    return "No meter";
  }

  return values.join(" / ");
}

function programIntervalLabel(item: MaintenanceProgramItem) {
  const values = [
    item.intervalMonths ? `${item.intervalMonths} mo` : null,
    item.intervalDays ? `${item.intervalDays} d` : null,
    item.intervalAirframeHours !== null ? `${item.intervalAirframeHours.toLocaleString()} hrs` : null,
    item.intervalCycles !== null ? `${item.intervalCycles.toLocaleString()} cycles` : null,
  ].filter(Boolean);

  return values.length > 0 ? values.join(" / ") : "No interval";
}

function programWarningLabel(item: MaintenanceProgramItem) {
  const values = [
    item.warningDays ? `${item.warningDays} d` : null,
    item.warningAirframeHours !== null ? `${item.warningAirframeHours.toLocaleString()} hrs` : null,
    item.warningCycles !== null ? `${item.warningCycles.toLocaleString()} cycles` : null,
  ].filter(Boolean);

  return values.length > 0 ? values.join(" / ") : "No warning";
}

function programGroupKey(item: MaintenanceProgramItem) {
  if (item.applicabilitySummary === "All aircraft") {
    return "all-aircraft";
  }

  const types = Array.from(new Set(item.affectedAircraft.map((aircraft) => aircraft.aircraftType))).sort();

  if (types.length === 1 && types[0]) {
    return `type-${types[0]}`;
  }

  if (types.length > 1) {
    return "multiple-types";
  }

  return "no-active-applicability";
}

function programGroupLabel(key: string) {
  if (key === "all-aircraft") {
    return "All aircraft";
  }

  if (key === "multiple-types") {
    return "Multiple aircraft types";
  }

  if (key === "no-active-applicability") {
    return "No active applicability";
  }

  if (key.startsWith("type-")) {
    return aircraftTypeLabel(key.replace("type-", "") as AircraftType);
  }

  return "Other";
}

function programGroupDescription(key: string) {
  if (key === "all-aircraft") {
    return "Fleet-wide tasks that apply unless a tail override excludes them.";
  }

  if (key === "multiple-types") {
    return "Tasks currently applicable to more than one aircraft type.";
  }

  if (key === "no-active-applicability") {
    return "Library tasks that need applicability before they appear in Scheduled Maintenance.";
  }

  if (key.startsWith("type-")) {
    return "Type-level and tail-specific tasks for this aircraft type.";
  }

  return "Program tasks";
}

function groupProgramItems(items: MaintenanceProgramItem[]): ProgramItemGroup[] {
  const groups = new Map<string, MaintenanceProgramItem[]>();

  for (const item of items) {
    const key = programGroupKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const order = (key: string) => {
    if (key === "all-aircraft") {
      return "0";
    }

    if (key.startsWith("type-")) {
      return `1-${programGroupLabel(key)}`;
    }

    if (key === "multiple-types") {
      return "2";
    }

    return "3";
  };

  return Array.from(groups.entries())
    .sort(([first], [second]) => order(first).localeCompare(order(second)))
    .map(([key, groupItems]) => ({
      description: programGroupDescription(key),
      items: groupItems.slice().sort((first, second) => first.title.localeCompare(second.title)),
      key,
      label: programGroupLabel(key),
    }));
}

function scopeLabel(scope: MaintenanceProgramApplicabilityScope) {
  if (scope === MaintenanceProgramApplicabilityScope.ALL_AIRCRAFT) {
    return "All aircraft";
  }

  if (scope === MaintenanceProgramApplicabilityScope.AIRCRAFT_TYPE) {
    return "Aircraft type";
  }

  return "Tail";
}

function overrideActionLabel(action: MaintenanceProgramOverrideAction) {
  return formatEnum(action);
}

function itemIcon(item: MaintenanceQueueItem) {
  if (item.boardStatus === "AOG") {
    return <AlertTriangle className="h-4 w-4" />;
  }

  if (item.boardStatus === "SERVICEABLE") {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (item.boardStatus === "SERVICEABLE_SCHEDULED_MX") {
    return <Wrench className="h-4 w-4" />;
  }

  return <FileText className="h-4 w-4" />;
}

function supportingLabel(item: MaintenanceQueueItem): string {
  if (item.boardStatus === "AOG") {
    return item.aogPhase ? aogPhaseLabel(item.aogPhase) : "Needs assessment";
  }

  if (
    item.boardStatus === "SERVICEABLE_MEL" ||
    item.boardStatus === "SERVICEABLE_CDL" ||
    item.boardStatus === "SERVICEABLE_NEF" ||
    item.boardStatus === "SERVICEABLE_OTHER_DEFERRAL"
  ) {
    return item.limitation ?? item.summary ?? item.reference;
  }

  if (item.boardStatus === "SERVICEABLE_SCHEDULED_MX") {
    return `${item.reference} | ${compactTime(item)}`;
  }

  return item.summary ?? "No maintenance restriction recorded.";
}

function buildHref(params: {
  active?: string | null;
  aircraftType?: string | null;
  category?: string | null;
  entryType?: string | null;
  logbookStatus?: string | null;
  logbookAircraft?: string | null;
  logbookDrawerQ?: string | null;
  logbookCursor?: string | null;
  logbookDrawerStatus?: string | null;
  logbookDrawerType?: string | null;
  logbookEntry?: string | null;
  logbookFrom?: string | null;
  logbookLimit?: number | null;
  logbookTo?: string | null;
  q?: string | null;
  required?: string | null;
  selected?: string | null;
  scheduledStatus?: string | null;
  status?: string | null;
  tail?: string | null;
  view: ViewMode;
}) {
  const search = new URLSearchParams();

  search.set("view", params.view);

  if (params.status) {
    search.set("status", params.status);
  }
  if (params.aircraftType) {
    search.set("aircraftType", params.aircraftType);
  }
  if (params.category) {
    search.set("category", params.category);
  }
  if (params.entryType) {
    search.set("entryType", params.entryType);
  }
  if (params.logbookStatus) {
    search.set("logbookStatus", params.logbookStatus);
  }
  if (params.logbookAircraft) {
    search.set("logbookAircraft", params.logbookAircraft);
  }
  if (params.logbookEntry) {
    search.set("logbookEntry", params.logbookEntry);
  }
  if (params.logbookLimit) {
    search.set("logbookLimit", String(params.logbookLimit));
  }
  if (params.logbookDrawerQ) {
    search.set("logbookDrawerQ", params.logbookDrawerQ);
  }
  if (params.logbookCursor) {
    search.set("logbookCursor", params.logbookCursor);
  }
  if (params.logbookDrawerStatus) {
    search.set("logbookDrawerStatus", params.logbookDrawerStatus);
  }
  if (params.logbookDrawerType) {
    search.set("logbookDrawerType", params.logbookDrawerType);
  }
  if (params.logbookFrom) {
    search.set("logbookFrom", params.logbookFrom);
  }
  if (params.logbookTo) {
    search.set("logbookTo", params.logbookTo);
  }
  if (params.active) {
    search.set("active", params.active);
  }
  if (params.required) {
    search.set("required", params.required);
  }
  if (params.q) {
    search.set("q", params.q);
  }
  if (params.scheduledStatus) {
    search.set("scheduledStatus", params.scheduledStatus);
  }
  if (params.tail) {
    search.set("tail", params.tail);
  }
  if (params.selected) {
    search.set("selected", params.selected);
  }

  return `/maintenance?${search.toString()}`;
}

function maintenanceLogbookDrawerHref(
  returnTo: string,
  aircraftId: string,
  entryId: string | null = null,
): string {
  const parsed = new URL(returnTo, "http://aeroops.local");
  parsed.pathname = "/maintenance";
  parsed.searchParams.set("view", "logbook");
  parsed.searchParams.set("logbookAircraft", aircraftId);
  parsed.searchParams.set("logbookLimit", "50");
  parsed.searchParams.delete("selected");

  if (entryId) {
    parsed.searchParams.set("logbookEntry", entryId);
  } else {
    parsed.searchParams.delete("logbookEntry");
  }

  return `${parsed.pathname}${parsed.search}`;
}

function logbookSearchText(item: MaintenanceLogbookItem): string {
  return [
    item.tailNumber,
    item.entryNumber,
    item.title,
    item.narrative,
    item.manualReference,
    item.taskReference,
    item.category,
    item.discrepancy?.discrepancyNumber,
    item.discrepancy?.title,
    item.deferral?.deferralNumber,
    item.maintenanceEvent?.maintenanceNumber,
    item.maintenanceProgramTask?.title,
    item.maintenanceProgramTask?.taskKey,
    item.maintenanceProgramTask?.sourceReference,
    ...item.returnToServiceRecords.map((record) => record.rtsNumber),
  ].filter(Boolean).join(" ").toLowerCase();
}

function queueSortMatches(item: MaintenanceQueueItem, status: MaintenanceQueueSortFocus): boolean {
  if (status === "AOG") {
    return item.boardStatus === "AOG";
  }

  if (status === "SERVICEABLE") {
    return item.boardStatus === "SERVICEABLE";
  }

  if (status === "MEL") {
    return item.boardStatus === "SERVICEABLE_MEL";
  }

  if (status === "CDL") {
    return item.boardStatus === "SERVICEABLE_CDL";
  }

  return item.boardStatus === "SERVICEABLE_NEF";
}

function groupQueueItems(items: MaintenanceQueueItem[], statusSort: MaintenanceQueueSortFocus): QueueItemGroup[] {
  const groups = new Map<string, MaintenanceQueueItem[]>();

  for (const item of items) {
    groups.set(item.aircraftId, [...(groups.get(item.aircraftId) ?? []), item]);
  }

  return Array.from(groups.values())
    .map((groupItems) => {
      const first = groupItems[0];

      return {
        aircraftId: first.aircraftId,
        aircraftStatus: first.aircraftStatus,
        aircraftType: first.aircraftType,
        boardStatus: groupBoardStatus(groupItems),
        items: groupItems,
        tailNumber: first.tailNumber,
      };
    })
    .sort((first, second) => {
      const firstMatchesSort = first.items.some((item) => queueSortMatches(item, statusSort));
      const secondMatchesSort = second.items.some((item) => queueSortMatches(item, statusSort));

      if (firstMatchesSort !== secondMatchesSort) {
        return firstMatchesSort ? -1 : 1;
      }

      const statusDelta = queueBoardStatusRank(first.boardStatus) - queueBoardStatusRank(second.boardStatus);

      if (statusDelta !== 0) {
        return statusDelta;
      }

      return first.tailNumber.localeCompare(second.tailNumber);
    });
}

function hasDeferredQueueItem(group: QueueItemGroup): boolean {
  return group.items.some((item) =>
    item.boardStatus === "SERVICEABLE_MEL" ||
    item.boardStatus === "SERVICEABLE_CDL" ||
    item.boardStatus === "SERVICEABLE_NEF" ||
    item.boardStatus === "SERVICEABLE_OTHER_DEFERRAL"
  );
}

function hasPlannedMaintenanceQueueItem(group: QueueItemGroup): boolean {
  return group.items.some((item) => item.boardStatus === "SERVICEABLE_SCHEDULED_MX");
}

function buildMaintenanceFleetStats(groups: QueueItemGroup[]): MaintenanceFleetStats {
  const totalAircraft = groups.length;
  const aogCount = groups.filter((group) => group.boardStatus === "AOG").length;
  const inServiceCount = totalAircraft - aogCount;
  const serviceablePercent = totalAircraft > 0 ? Math.round((inServiceCount / totalAircraft) * 100) : 0;
  const typeSummaries = Array.from(
    groups.reduce((map, group) => {
      const current = map.get(group.aircraftType) ?? { aircraftType: group.aircraftType, inServiceCount: 0, totalAircraft: 0 };
      current.totalAircraft += 1;

      if (group.boardStatus !== "AOG") {
        current.inServiceCount += 1;
      }

      map.set(group.aircraftType, current);
      return map;
    }, new Map<AircraftType, MaintenanceFleetStats["typeSummaries"][number]>()),
  )
    .map(([, summary]) => summary)
    .sort((first, second) => aircraftTypeLabel(first.aircraftType).localeCompare(aircraftTypeLabel(second.aircraftType)));

  return {
    aogCount,
    deferredCount: groups.filter(hasDeferredQueueItem).length,
    inServiceCount,
    plannedMaintenanceCount: groups.filter(hasPlannedMaintenanceQueueItem).length,
    serviceablePercent,
    totalAircraft,
    typeSummaries,
  };
}

function largestFleetType(stats: MaintenanceFleetStats): AircraftType | null {
  return stats.typeSummaries
    .slice()
    .sort((first, second) => {
      const totalDelta = second.totalAircraft - first.totalAircraft;

      if (totalDelta !== 0) {
        return totalDelta;
      }

      return aircraftTypeLabel(first.aircraftType).localeCompare(aircraftTypeLabel(second.aircraftType));
    })[0]?.aircraftType ?? null;
}

function FilterPill({
  active,
  children,
  href,
}: {
  active: boolean;
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      className={`inline-flex min-h-8 items-center rounded-md border px-3 text-xs font-semibold transition ${
        active
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

function MaintenanceFleetStatsStrip({
  active,
  aircraftTypeValue,
  category,
  entryType,
  logbookStatus,
  q,
  required,
  scheduledStatus,
  stats,
  status,
  tail,
  typeStats,
  view,
}: {
  active: string | null;
  aircraftTypeValue: string;
  category: string | null;
  entryType: string | null;
  logbookStatus: string | null;
  q: string;
  required: string | null;
  scheduledStatus: string | null;
  stats: MaintenanceFleetStats;
  status: string | null;
  tail: string | null;
  typeStats: MaintenanceFleetStats;
  view: ViewMode;
}) {
  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-[9rem_6rem_7rem_8rem_minmax(14rem,22rem)]">
      <div className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">In service</p>
        <p className="text-xl font-semibold leading-6 text-zinc-950">{stats.serviceablePercent}% <span className="text-xs text-zinc-500">({stats.inServiceCount}/{stats.totalAircraft})</span></p>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">AOG</p>
        <p className="text-xl font-semibold leading-6 text-zinc-950">{stats.aogCount}</p>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">Deferred</p>
        <p className="text-xl font-semibold leading-6 text-zinc-950">{stats.deferredCount}</p>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">Planned MX</p>
        <p className="text-xl font-semibold leading-6 text-zinc-950">{stats.plannedMaintenanceCount}</p>
      </div>
      <form action="/maintenance" className="min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5" method="get">
        <input name="view" type="hidden" value={view} />
        {view === "queue" && status ? <input name="status" type="hidden" value={status} /> : null}
        {view === "scheduled" && scheduledStatus ? <input name="scheduledStatus" type="hidden" value={scheduledStatus} /> : null}
        {(view === "scheduled" || view === "program") && category ? <input name="category" type="hidden" value={category} /> : null}
        {view === "logbook" && entryType ? <input name="entryType" type="hidden" value={entryType} /> : null}
        {view === "logbook" && logbookStatus ? <input name="logbookStatus" type="hidden" value={logbookStatus} /> : null}
        {view === "program" && active ? <input name="active" type="hidden" value={active} /> : null}
        {view === "program" && required ? <input name="required" type="hidden" value={required} /> : null}
        {(view === "program" || view === "logbook") && q ? <input name="q" type="hidden" value={q} /> : null}
        {tail ? <input name="tail" type="hidden" value={tail} /> : null}
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">By type</p>
        <div className="mt-0.5 flex min-w-0 items-center gap-1">
          <select
            className="h-7 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-950"
            defaultValue={aircraftTypeValue}
            name="aircraftType"
          >
            <option value="all">All types ({typeStats.inServiceCount}/{typeStats.totalAircraft})</option>
            {typeStats.typeSummaries.map((item) => (
              <option key={item.aircraftType} value={item.aircraftType}>
                {aircraftTypeLabel(item.aircraftType)} ({item.inServiceCount}/{item.totalAircraft})
              </option>
            ))}
          </select>
          <button className="h-7 rounded-md border border-zinc-300 bg-white px-2 text-[0.7rem] font-semibold text-zinc-700 hover:bg-zinc-100" type="submit">
            Apply
          </button>
        </div>
      </form>
    </div>
  );
}

function QueueRow({
  href,
  item,
  selected,
  surfaceClassName = "bg-white hover:bg-zinc-50",
}: {
  href: string;
  item: MaintenanceQueueItem;
  selected: boolean;
  surfaceClassName?: string;
}) {
  return (
    <Link
      className={`grid gap-2 px-3 py-2.5 transition md:grid-cols-[12rem_minmax(0,1fr)_13rem_6rem] md:items-center ${surfaceClassName} ${
        selected ? "bg-zinc-100 ring-1 ring-inset ring-zinc-300" : ""
      }`}
      href={href}
    >
      <div className="flex items-center gap-2">
        <span className="text-zinc-500">{itemIcon(item)}</span>
        <span className={`w-fit rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold ${boardStatusClasses(item.boardStatus)}`}>
          {boardStatusLabel(item.boardStatus)}
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-950">{item.title}</p>
        <p className="truncate text-xs text-zinc-500">{supportingLabel(item)}</p>
      </div>
      <p className="text-xs font-medium text-zinc-600">{compactTime(item)}</p>
      <span className="justify-self-start rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 md:justify-self-end">
        Review
      </span>
    </Link>
  );
}

function QueueGroup({
  buildItemHref,
  group,
  nextScheduled,
  striped,
  selected,
}: {
  buildItemHref: (item: MaintenanceQueueItem) => string;
  group: QueueItemGroup;
  nextScheduled: NextScheduledMaintenance | null;
  striped: boolean;
  selected: string | null;
}) {
  const headerSurfaceClassName = striped ? "maintenance-queue-stripe" : "bg-white hover:bg-zinc-50";
  const itemSurfaceClassName = striped ? "maintenance-queue-stripe" : "bg-white hover:bg-zinc-50";

  return (
    <details className="group border-b border-zinc-100 last:border-b-0">
      <summary className={`grid cursor-pointer list-none gap-2 px-3 py-3 transition md:grid-cols-[9rem_11rem_minmax(0,1fr)_minmax(12rem,16rem)_7rem] md:items-center [&::-webkit-details-marker]:hidden ${headerSurfaceClassName}`}>
        <div>
          <p className="text-sm font-semibold text-zinc-950">{group.tailNumber}</p>
          <p className="text-[0.7rem] font-medium uppercase text-zinc-500">{aircraftTypeLabel(group.aircraftType)}</p>
        </div>
        <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${boardStatusClasses(group.boardStatus)}`}>
          {boardStatusLabel(group.boardStatus)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">{queueGroupSummary(group)}</p>
          <p className="truncate text-xs text-zinc-500">{queueGroupPhaseSummary(group)}</p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Next scheduled MX</p>
          {nextScheduled ? (
            <>
              <p className="truncate text-sm font-semibold text-zinc-900">{nextScheduled.item.taskTitle}</p>
              <p className="truncate text-xs text-zinc-500">{nextScheduled.timeLabel}</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-zinc-500">No scheduled task</p>
          )}
        </div>
        <span className="text-xs font-semibold text-zinc-500 md:text-right">
          <span className="group-open:hidden">Expand</span>
          <span className="hidden group-open:inline">Collapse</span>
        </span>
      </summary>
      <div className="divide-y divide-zinc-100 border-t border-zinc-200 bg-white pl-0 md:ml-9 md:border-l md:border-zinc-200">
        {group.items.map((item) => (
          <QueueRow
            href={buildItemHref(item)}
            item={item}
            key={item.id}
            selected={selected === item.id}
            surfaceClassName={itemSurfaceClassName}
          />
        ))}
      </div>
    </details>
  );
}

function ScheduledMaintenanceRow({
  href,
  item,
  selected,
}: {
  href: string;
  item: MaintenanceScheduledItem;
  selected: boolean;
}) {
  return (
    <Link
      className={`grid gap-2 px-3 py-2.5 transition hover:bg-zinc-100 md:grid-cols-[8rem_10rem_minmax(0,1fr)_13rem_12rem_11rem_6rem] md:items-center ${
        selected ? "bg-zinc-100 ring-1 ring-inset ring-zinc-300" : ""
      }`}
      href={href}
    >
      <div>
        <p className="text-sm font-semibold text-zinc-950">{item.tailNumber}</p>
        <p className="text-[0.7rem] font-medium uppercase text-zinc-500">{aircraftTypeLabel(item.aircraftType)}</p>
      </div>
      <span className={`w-fit rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold ${statusClasses(scheduledStatusLabel(item.complianceStatus).toUpperCase())}`}>
        {scheduledStatusLabel(item.complianceStatus)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-950">{item.taskTitle}</p>
        <p className="truncate text-xs text-zinc-500">
          {[item.taskCategory ? formatEnum(item.taskCategory) : null, item.sourceReference, item.applicabilityLabel].filter(Boolean).join(" | ")}
        </p>
      </div>
      <p className="text-xs font-medium text-zinc-600">{scheduledTimeLabel(item)}</p>
      <p className="text-xs font-medium text-zinc-600">{latestMeterLabel(item)}</p>
      <p className="truncate text-xs font-medium text-zinc-600">{scheduledEventLabel(item)}</p>
      <span className="justify-self-start rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 md:justify-self-end">
        Review
      </span>
    </Link>
  );
}

function ScheduledMaintenanceGroup({
  buildItemHref,
  group,
  selected,
}: {
  buildItemHref: (item: MaintenanceScheduledItem) => string;
  group: ScheduledItemGroup;
  selected: string | null;
}) {
  const mostUrgent = group.items[0];
  const statusCounts = scheduledStatusOptions
    .map(({ label, value }) => ({ count: group.items.filter((item) => item.complianceStatus === value).length, label }))
    .filter(({ count }) => count > 0);
  const plannedCount = group.items.filter((item) => item.maintenanceEvent?.status === MaintenanceEventStatus.PLANNED).length;
  const inProgressCount = group.items.filter((item) => item.maintenanceEvent?.status === MaintenanceEventStatus.IN_PROGRESS).length;
  const context = [
    plannedCount > 0 ? `${plannedCount} planned` : null,
    inProgressCount > 0 ? `${inProgressCount} in progress` : null,
  ].filter(Boolean).join(" | ");

  return (
    <details className="group border-b border-zinc-100 last:border-b-0" open={group.items.some((item) => item.id === selected)}>
      <summary className="grid cursor-pointer list-none gap-2 px-3 py-3 transition hover:bg-zinc-50 md:grid-cols-[8rem_8rem_minmax(0,1fr)_minmax(12rem,16rem)_5rem] md:items-center [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-sm font-semibold text-zinc-950">{group.tailNumber}</p>
          <p className="text-[0.7rem] font-medium uppercase text-zinc-500">{aircraftTypeLabel(group.aircraftType)}</p>
        </div>
        <span className={`w-fit rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold ${statusClasses(scheduledStatusLabel(mostUrgent.complianceStatus).toUpperCase())}`}>
          {scheduledStatusLabel(mostUrgent.complianceStatus)}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">
            {group.items.length} matching item{group.items.length === 1 ? "" : "s"}
          </p>
          <p className="truncate text-xs text-zinc-500">{statusCounts.map(({ count, label }) => `${count} ${label.toLowerCase()}`).join(" | ")}</p>
          {context ? <p className="truncate text-xs text-zinc-500">{context}</p> : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">{mostUrgent.taskTitle}</p>
          <p className="truncate text-xs text-zinc-500">{scheduledTimeLabel(mostUrgent)}</p>
        </div>
        <span className="text-xs font-semibold text-zinc-500 md:text-right">
          <span className="group-open:hidden">Expand</span>
          <span className="hidden group-open:inline">Collapse</span>
        </span>
      </summary>
      <div className="divide-y divide-zinc-100 border-t border-zinc-200 bg-white md:ml-9 md:border-l md:border-zinc-200">
        {group.items.map((item) => (
          <ScheduledMaintenanceRow href={buildItemHref(item)} item={item} key={item.id} selected={selected === item.id} />
        ))}
      </div>
    </details>
  );
}

function ProgramRow({
  href,
  item,
  selected,
}: {
  href: string;
  item: MaintenanceProgramItem;
  selected: boolean;
}) {
  return (
    <Link
      className={`grid gap-2 px-3 py-2.5 transition hover:bg-zinc-100 md:grid-cols-[minmax(0,1fr)_10rem_12rem_10rem_12rem_6rem] md:items-center ${
        selected ? "bg-zinc-100 ring-1 ring-inset ring-zinc-300" : ""
      }`}
      href={href}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-950">{item.title}</p>
        <p className="truncate text-xs text-zinc-500">{item.sourceReference ?? item.taskKey}</p>
      </div>
      <span className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[0.7rem] font-semibold text-zinc-700">
        {formatEnum(item.category)}
      </span>
      <p className="truncate text-xs font-medium text-zinc-600">{programIntervalLabel(item)}</p>
      <span className={`w-fit rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold ${item.requiredForServiceability ? "border-amber-200 bg-amber-50 text-amber-900" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}>
        {item.requiredForServiceability ? "Required" : "Optional"}
      </span>
      <p className="truncate text-xs font-medium text-zinc-600">
        {item.active ? "Active" : "Inactive"} | {item.applicabilitySummary} | {item.overrideCount} override{item.overrideCount === 1 ? "" : "s"}
      </p>
      <span className="justify-self-start rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 md:justify-self-end">
        Review
      </span>
    </Link>
  );
}

function logbookStatusClasses(status: AircraftLogbookEntryStatus): string {
  if (status === AircraftLogbookEntryStatus.SIGNED || status === AircraftLogbookEntryStatus.RELEASED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === AircraftLogbookEntryStatus.VOIDED || status === AircraftLogbookEntryStatus.SUPERSEDED) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (
    status === AircraftLogbookEntryStatus.OPEN ||
    status === AircraftLogbookEntryStatus.DEFERRED ||
    status === AircraftLogbookEntryStatus.READY_FOR_SIGNATURE
  ) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function logbookRelatedLabel(item: MaintenanceLogbookItem): string {
  if (item.discrepancy) {
    return `${item.discrepancy.discrepancyNumber} | ${item.discrepancy.title}`;
  }

  if (item.deferral) {
    return `${item.deferral.deferralNumber} | ${item.deferral.deferralMethod ? formatEnum(item.deferral.deferralMethod) : "Deferral"}`;
  }

  if (item.maintenanceEvent) {
    return `${item.maintenanceEvent.maintenanceNumber} | ${formatEnum(item.maintenanceEvent.eventType)}`;
  }

  if (item.maintenanceProgramTask) {
    return `${item.maintenanceProgramTask.taskKey} | ${item.maintenanceProgramTask.title}`;
  }

  return item.manualReference ?? item.taskReference ?? item.source;
}

function LogbookRow({
  href,
  item,
  selected,
}: {
  href: string;
  item: MaintenanceLogbookItem;
  selected: boolean;
}) {
  return (
    <Link
      className={`grid gap-2 px-3 py-2.5 transition hover:bg-zinc-100 md:grid-cols-[8rem_8rem_11rem_minmax(0,1fr)_minmax(0,1fr)_8rem_6rem] md:items-center ${
        selected ? "bg-zinc-100 ring-1 ring-inset ring-zinc-300" : ""
      }`}
      href={href}
    >
      <div>
        <p className="text-sm font-semibold text-zinc-950">{item.tailNumber}</p>
        <p className="text-[0.7rem] font-medium uppercase text-zinc-500">{aircraftTypeLabel(item.aircraftType)}</p>
      </div>
      <p className="text-xs font-semibold text-zinc-600">{formatDateTime(item.reportedAt)}</p>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-zinc-500">{item.entryNumber}</p>
        <p className="truncate text-xs text-zinc-500">{formatEnum(item.entryType)}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-950">{item.title}</p>
        <p className="truncate text-xs text-zinc-500">{logbookRelatedLabel(item)}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-zinc-600">
          {item.manualReference ?? item.taskReference ?? item.maintenanceProgramTask?.sourceReference ?? "No reference"}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {item.signatureCount > 0 ? `${item.signatureCount} signature${item.signatureCount === 1 ? "" : "s"}` : "Unsigned"}
          {item.attachmentCount > 0 ? ` | ${item.attachmentCount} attachment${item.attachmentCount === 1 ? "" : "s"}` : ""}
        </p>
      </div>
      <span className={`w-fit rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold ${logbookStatusClasses(item.status)}`}>
        {formatEnum(item.status)}
      </span>
      <span className="justify-self-start rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 md:justify-self-end">
        Review
      </span>
    </Link>
  );
}

function LogbookGroup({
  aircraftItems,
  buildItemHref,
  fullLogbookHref,
  group,
}: {
  aircraftItems: MaintenanceLogbookItem[];
  buildItemHref: (item: MaintenanceLogbookItem) => string;
  fullLogbookHref: string;
  group: LogbookItemGroup;
}) {
  const unresolved = group.items.filter(isUnresolvedLogbookItem);
  const actionableCount = group.items.filter(isActionableLogbookItem).length;
  const oldestUnresolvedWriteUp = aircraftItems
    .filter(hasUnresolvedDiscrepancy)
    .slice()
    .sort((first, second) => first.reportedAt.getTime() - second.reportedAt.getTime())[0];
  const mostRecent = group.items[0];

  return (
    <details className="group border-b border-zinc-100 last:border-b-0">
      <summary className="grid cursor-pointer list-none gap-2 px-3 py-3 transition hover:bg-zinc-50 md:grid-cols-[8rem_minmax(0,1fr)_minmax(12rem,16rem)_minmax(12rem,16rem)_5rem] md:items-center [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-sm font-semibold text-zinc-950">{group.tailNumber}</p>
          <p className="text-[0.7rem] font-medium uppercase text-zinc-500">{aircraftTypeLabel(group.aircraftType)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">{group.items.length} matching entr{group.items.length === 1 ? "y" : "ies"}</p>
          <p className="truncate text-xs text-zinc-500">{actionableCount} actionable | {unresolved.length} unresolved</p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">Most recent: {mostRecent.title}</p>
          <p className="truncate text-xs text-zinc-500">{formatDateTime(mostRecent.reportedAt)}</p>
        </div>
        <div className="min-w-0">
          {oldestUnresolvedWriteUp ? (
            <>
              <p className="truncate text-sm font-semibold text-amber-900">Oldest unresolved write-up: {oldestUnresolvedWriteUp.title}</p>
              <p className="truncate text-xs text-zinc-500">{formatDateTime(oldestUnresolvedWriteUp.reportedAt)}</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-emerald-800">No unresolved write-ups</p>
          )}
        </div>
        <span className="text-xs font-semibold text-zinc-500 md:text-right">
          <span className="group-open:hidden">Expand</span>
          <span className="hidden group-open:inline">Collapse</span>
        </span>
      </summary>
      <div className="flex justify-end border-t border-zinc-200 bg-zinc-50 px-3 py-2 md:ml-9 md:border-l md:border-zinc-200">
        <Link
          className="inline-flex min-h-9 items-center rounded-md border border-zinc-950 bg-zinc-950 px-3 text-xs font-semibold text-white hover:bg-zinc-800"
          href={fullLogbookHref}
        >
          View full logbook
        </Link>
      </div>
      <div className="divide-y divide-zinc-100 bg-white md:ml-9 md:border-l md:border-zinc-200">
        {group.items.map((item) => (
          <LogbookRow href={buildItemHref(item)} item={item} key={item.id} selected={false} />
        ))}
      </div>
    </details>
  );
}

function ProgramCreateDrawer({
  closeHref,
  returnTo,
}: {
  closeHref: string;
  returnTo: string;
}) {
  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-xl flex-col border-l border-zinc-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-200 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Program library</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950">Create task</h2>
        </div>
        <Link className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100" href={closeHref}>
          Close
        </Link>
      </div>
      <form action={createMaintenanceProgramTaskAction} className="grid gap-4 overflow-y-auto p-4">
        <input name="returnTo" type="hidden" value={returnTo} />
        <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold text-zinc-950">Task setup</p>
          <p className="mt-1 text-xs leading-5 text-zinc-600">
            Create the reusable task first. Applicability and tail overrides are managed from the task review drawer after save.
          </p>
        </section>
        <TaskFields />
        <button className="min-h-10 rounded-md border border-zinc-950 bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800 md:w-fit" type="submit">
          Create task
        </button>
      </form>
    </aside>
  );
}

function ActionLinks({
  aircraftHref,
  airworthinessHref,
  exportHref,
  logbookHref,
}: {
  aircraftHref: string;
  airworthinessHref: string;
  exportHref: string;
  logbookHref: string;
}) {
  const linkClass =
    "inline-flex min-h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100";

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Link className={linkClass} href={logbookHref}>View aircraft logbook</Link>
      <Link className={linkClass} href={airworthinessHref}>View airworthiness</Link>
      <Link className={linkClass} href={aircraftHref}>View aircraft details</Link>
      <a className={linkClass} href={exportHref} target="_blank">Export package</a>
    </div>
  );
}

function TaskFields({ item }: { item?: MaintenanceProgramItem }) {
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Title
          <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item?.title ?? ""} name="title" required />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Category
          <select className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item?.category ?? MaintenanceProgramTaskCategory.INSPECTION} name="category">
            {Object.values(MaintenanceProgramTaskCategory).map((category) => (
              <option key={category} value={category}>{formatEnum(category)}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Task key
          <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item?.taskKey ?? ""} name="taskKey" placeholder="Optional on create" readOnly={Boolean(item)} />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Source / reference
          <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item?.sourceReference ?? ""} name="sourceReference" placeholder="AMM, AAIP, AD, STC ICA" />
        </label>
      </div>
      <label className="grid gap-1 text-xs font-semibold text-zinc-600">
        Description
        <textarea className="min-h-20 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" defaultValue={item?.description ?? ""} name="description" />
      </label>
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Months
          <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item?.intervalMonths ?? ""} name="intervalMonths" type="number" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Days
          <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item?.intervalDays ?? ""} name="intervalDays" type="number" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Hours
          <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item?.intervalAirframeHours ?? ""} name="intervalAirframeHours" step="0.1" type="number" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Cycles
          <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item?.intervalCycles ?? ""} name="intervalCycles" type="number" />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Warn days
          <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item?.warningDays ?? 30} name="warningDays" type="number" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Warn hours
          <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item?.warningAirframeHours ?? ""} name="warningAirframeHours" step="0.1" type="number" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Warn cycles
          <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item?.warningCycles ?? ""} name="warningCycles" type="number" />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Effective from
          <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={dateTimeInputValue(item?.effectiveFrom ?? null)} name="effectiveFrom" type="datetime-local" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-zinc-600">
          Effective to
          <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={dateTimeInputValue(item?.effectiveTo ?? null)} name="effectiveTo" type="datetime-local" />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
          <input defaultChecked={item?.requiredForServiceability ?? true} name="requiredForServiceability" type="checkbox" />
          Required for serviceability
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
          <input defaultChecked={item?.active ?? true} name="active" type="checkbox" />
          Active
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
          <input defaultChecked={item?.requiresIndependentInspection ?? false} name="requiresIndependentInspection" type="checkbox" />
          Required independent inspection
        </label>
      </div>
    </>
  );
}

function AogPhaseForm({ item, returnTo }: { item: MaintenanceQueueItem; returnTo: string }) {
  if (item.boardStatus !== "AOG" || !item.discrepancyId) {
    return null;
  }

  return (
    <form
      action={updateDiscrepancyAogPhaseAction.bind(null, item.discrepancyId)}
      className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
    >
      <input name="returnTo" type="hidden" value={returnTo} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">AOG phase</p>
        <p className="mt-1 text-xs text-zinc-500">Visible to maintenance control and ops as the current blocker.</p>
      </div>
      <label className="grid gap-1 text-xs font-semibold text-zinc-600">
        Phase
        <select
          className="min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-950"
          defaultValue={item.aogPhase ?? AogResolutionPhase.NEEDS_ASSESSMENT}
          name="aogPhase"
        >
          {aogPhaseOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold text-zinc-600">
        ETA / next update
        <input
          className="min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-950"
          defaultValue={dateTimeInputValue(item.aogEtaAt)}
          name="aogEtaAt"
          type="datetime-local"
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-zinc-600">
        Maintenance-control note
        <textarea
          className="min-h-20 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-950"
          defaultValue={item.aogMaintenanceNote ?? ""}
          maxLength={600}
          name="aogMaintenanceNote"
          placeholder="Short current blocker or next step"
        />
      </label>
      <button
        className="min-h-10 rounded-md border border-zinc-950 bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
        type="submit"
      >
        Update AOG status
      </button>
    </form>
  );
}

function QueueDrawer({
  canControl,
  closeHref,
  item,
  returnTo,
  scheduledOccurrenceOptions,
}: {
  canControl: boolean;
  closeHref: string;
  item: MaintenanceQueueItem;
  returnTo: string;
  scheduledOccurrenceOptions: Array<{
    id: string;
    label: string;
  }>;
}) {
  const holdId = item.id.startsWith("mx-hold-") ? item.id.slice("mx-hold-".length) : null;
  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-xl flex-col border-l border-zinc-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-200 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Maintenance review</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950">{item.tailNumber}</h2>
        </div>
        <Link className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100" href={closeHref}>
          Close
        </Link>
      </div>
      <div className="grid gap-4 overflow-y-auto p-4">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${boardStatusClasses(item.boardStatus)}`}>
            {boardStatusLabel(item.boardStatus)}
          </span>
          {item.boardStatus === "AOG" ? (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700">
              {aogPhaseLabel(item.aogPhase)}
            </span>
          ) : null}
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700">
            {aircraftStatusLabel(item.aircraftStatus)}
          </span>
        </div>
        <section className="grid gap-2">
          <h3 className="text-base font-semibold text-zinc-950">{item.title}</h3>
          <p className="text-sm leading-6 text-zinc-700">{item.summary ?? "No additional summary recorded."}</p>
          {item.aogMaintenanceNote ? (
            <p className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm leading-6 text-zinc-700">{item.aogMaintenanceNote}</p>
          ) : null}
        </section>
        <dl className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="font-semibold text-zinc-500">Reference</dt>
            <dd className="text-right text-zinc-900">{item.reference}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-semibold text-zinc-500">Due / ETA / reported</dt>
            <dd className="text-right text-zinc-900">{compactTime(item)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-semibold text-zinc-500">Aircraft state</dt>
            <dd className="text-right text-zinc-900">{aircraftStatusLabel(item.aircraftStatus)}</dd>
          </div>
        </dl>
        {item.limitation ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Operational limitation</p>
            <p className="mt-2 text-sm leading-6 text-amber-950">{item.limitation}</p>
          </section>
        ) : null}
        <AogPhaseForm item={item} returnTo={returnTo} />
        {canControl && holdId ? (
          <>
            <form action={releaseMaintenanceControlHoldAction.bind(null, holdId)} className="grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <input name="returnTo" type="hidden" value={returnTo} />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Release MX hold</p>
              <textarea className="min-h-16 rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm" name="releaseExplanation" placeholder="Why no defect or maintenance resulted" required />
              <label className="flex items-start gap-2 text-xs font-semibold leading-5 text-emerald-950">
                <input className="mt-1 h-4 w-4" name="noDefectOrMaintenanceConfirmed" required type="checkbox" />
                I confirm no defect was found and no maintenance was performed.
              </label>
              <button className="min-h-9 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white" type="submit">Release hold</button>
            </form>
            <form action={convertMaintenanceControlHoldAction.bind(null, holdId)} className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <input name="returnTo" type="hidden" value={returnTo} />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Convert to write-up</p>
              <input className="min-h-9 rounded-md border border-amber-300 bg-white px-3 text-sm" name="title" placeholder="Official write-up title" required />
              <textarea className="min-h-16 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm" name="description" placeholder="Discrepancy details" />
              <button className="min-h-9 rounded-md bg-amber-800 px-3 text-sm font-semibold text-white" type="submit">Create write-up</button>
            </form>
            {scheduledOccurrenceOptions.length > 0 ? (
              <form action={convertMaintenanceControlHoldToScheduledAction.bind(null, holdId)} className="grid gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <input name="returnTo" type="hidden" value={returnTo} />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">Link to scheduled maintenance</p>
                <select className="min-h-9 rounded-md border border-blue-300 bg-white px-3 text-sm" name="maintenanceEventId" required>
                  <option value="">Select occurrence</option>
                  {scheduledOccurrenceOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <button className="min-h-9 rounded-md bg-blue-800 px-3 text-sm font-semibold text-white" type="submit">Link and continue maintenance</button>
              </form>
            ) : null}
          </>
        ) : canControl ? (
          <form action={placeMaintenanceControlHoldAction.bind(null, item.aircraftId)} className="grid gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
            <input name="returnTo" type="hidden" value={returnTo} />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-800">Remove from service</p>
            <input className="min-h-9 rounded-md border border-rose-300 bg-white px-3 text-sm" name="reason" placeholder="MX Control reason" required />
            <textarea className="min-h-16 rounded-md border border-rose-300 bg-white px-3 py-2 text-sm" name="note" placeholder="Short note" />
            <input className="min-h-9 rounded-md border border-rose-300 bg-white px-3 text-sm" name="expectedReturnAt" type="datetime-local" />
            <button className="min-h-9 rounded-md bg-rose-800 px-3 text-sm font-semibold text-white" type="submit">Remove from service</button>
          </form>
        ) : null}
        <ActionLinks
          aircraftHref={item.aircraftHref}
          airworthinessHref={item.airworthinessHref}
          exportHref={item.exportHref}
          logbookHref={maintenanceLogbookDrawerHref(returnTo, item.aircraftId)}
        />
      </div>
    </aside>
  );
}

function ScheduledMaintenanceDrawer({
  canControl,
  closeHref,
  item,
  returnTo,
  stationOptions,
}: {
  canControl: boolean;
  closeHref: string;
  item: MaintenanceScheduledItem;
  returnTo: string;
  stationOptions: { id: string; code: string; name: string }[];
}) {
  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-xl flex-col border-l border-zinc-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-200 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Scheduled maintenance</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950">{item.tailNumber}</h2>
        </div>
        <Link className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100" href={closeHref}>
          Close
        </Link>
      </div>
      <div className="grid gap-4 overflow-y-auto p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Task</p>
            <p className="mt-1 text-base font-semibold text-zinc-950">{item.taskTitle}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Status</p>
            <p className="mt-1 text-base font-semibold text-zinc-950">{scheduledStatusLabel(item.complianceStatus)}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Next due</p>
            <p className="mt-1 text-base font-semibold text-zinc-950">{scheduledTimeLabel(item)}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Latest meter</p>
            <p className="mt-1 text-base font-semibold text-zinc-950">{latestMeterLabel(item)}</p>
          </div>
        </div>
        <section className="rounded-lg border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Applicability</p>
          <p className="mt-2 text-sm font-semibold text-zinc-950">{item.applicabilityLabel}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-700">{item.description ?? "No maintenance description recorded."}</p>
          <p className="mt-2 text-xs font-semibold text-zinc-500">
            {item.requiredForServiceability ? "Required for serviceability" : "Informational / non-blocking"}
            {item.sourceReference ? ` | ${item.sourceReference}` : ""}
          </p>
          {item.overrideLabel ? <p className="mt-2 text-xs font-semibold text-amber-800">{item.overrideLabel}</p> : null}
        </section>
        <section className="rounded-lg border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Linked work</p>
          <p className="mt-2 text-sm font-semibold text-zinc-950">{scheduledEventLabel(item)}</p>
          {item.maintenanceEvent ? (
            <p className="mt-1 text-sm text-zinc-600">
              {formatEnum(item.maintenanceEvent.eventType)} | {scheduledTimeLabel(item)}
              {item.maintenanceEvent.providerName ? ` | ${item.maintenanceEvent.providerName}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-600">Plan a date and station. Planning does not remove the aircraft from service.</p>
          )}
          {item.logbookEntry ? (
            <Link className="mt-2 inline-flex min-h-9 items-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100" href={maintenanceLogbookDrawerHref(returnTo, item.aircraftId, item.logbookEntry.id)}>
              Review logbook entry {item.logbookEntry.entryNumber}
            </Link>
          ) : null}
        </section>
        {item.taskId ? (
          <form
            action={upsertMaintenanceComplianceBaselineAction.bind(null, item.aircraftId, item.taskId)}
            className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
          >
            <input name="returnTo" type="hidden" value={returnTo} />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Baseline / next due</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="grid gap-1 text-xs font-semibold text-zinc-600">
                Last done
                <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={dateTimeInputValue(item.lastCompletedAt)} name="lastCompletedAt" type="datetime-local" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-zinc-600">
                Last hours
                <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item.lastCompletedAirframeHours ?? ""} name="lastCompletedAirframeHours" step="0.1" type="number" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-zinc-600">
                Last cycles
                <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item.lastCompletedCycles ?? ""} name="lastCompletedCycles" type="number" />
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="grid gap-1 text-xs font-semibold text-zinc-600">
                Manual due
                <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={dateTimeInputValue(item.nextDueAt)} name="manualNextDueAt" type="datetime-local" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-zinc-600">
                Due hours
                <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item.nextDueAirframeHours ?? ""} name="manualNextDueAirframeHours" step="0.1" type="number" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-zinc-600">
                Due cycles
                <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" defaultValue={item.nextDueCycles ?? ""} name="manualNextDueCycles" type="number" />
              </label>
            </div>
            <textarea className="min-h-16 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm" name="baselineNotes" placeholder="Baseline notes" />
            <button className="min-h-9 rounded-md border border-zinc-950 bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800" type="submit">
              Save baseline
            </button>
          </form>
        ) : null}
        <form action={createAircraftMeterSnapshotAction.bind(null, item.aircraftId)} className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <input name="returnTo" type="hidden" value={returnTo} />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Meter snapshot</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="recordedAt" type="datetime-local" />
            <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="airframeHours" placeholder="Hours" step="0.1" type="number" />
            <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="airframeCycles" placeholder="Cycles" type="number" />
          </div>
          <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="notes" placeholder="Meter notes" />
          <button className="min-h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100" type="submit">
            Add meter snapshot
          </button>
        </form>
        {item.taskId ? (
          <>
            {!item.maintenanceEvent ? (
              <form action={planScheduledMaintenanceAction.bind(null, item.aircraftId, item.taskId)} className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <input name="returnTo" type="hidden" value={returnTo} />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Plan scheduled maintenance</p>
                <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="scheduledAt" type="datetime-local" />
                <select className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="stationId" defaultValue="">
                  <option value="">Station not selected</option>
                  {stationOptions.map((station) => <option key={station.id} value={station.id}>{station.code} — {station.name}</option>)}
                </select>
                <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="planNote" placeholder="Short planning note" />
                <button className="min-h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100" type="submit">
                  Save plan
                </button>
              </form>
            ) : null}
            {canControl && item.maintenanceEvent?.status === MaintenanceEventStatus.PLANNED ? (
              <form action={startScheduledMaintenanceAction.bind(null, item.maintenanceEvent.id)} className="grid gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                <input name="returnTo" type="hidden" value={returnTo} />
                <p className="text-xs text-rose-900">Starting maintenance creates the draft logbook entry and removes the aircraft from service.</p>
                <button className="min-h-9 rounded-md bg-rose-800 px-3 text-sm font-semibold text-white" type="submit">Start maintenance</button>
              </form>
            ) : null}
            {canControl && item.maintenanceEvent?.status === MaintenanceEventStatus.COMPLETED ? (
              <form action={releaseMaintenanceOccurrenceAction.bind(null, item.maintenanceEvent.id)} className="grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <input name="returnTo" type="hidden" value={returnTo} />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">MX Control release</p>
                <textarea className="min-h-16 rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm" name="mxControlReleaseNote" placeholder="Release note" required />
                <button className="min-h-9 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white" type="submit">Release aircraft</button>
              </form>
            ) : null}
            <form action={markMaintenanceTaskNotApplicableAction.bind(null, item.aircraftId, item.taskId)} className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <input name="returnTo" type="hidden" value={returnTo} />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Tail override</p>
              <input className="min-h-9 rounded-md border border-amber-300 bg-white px-2 text-sm" name="reason" placeholder="Reason required" />
              <button className="min-h-9 rounded-md border border-amber-700 bg-amber-700 px-3 text-sm font-semibold text-white hover:bg-amber-800" type="submit">
                Mark not applicable
              </button>
            </form>
          </>
        ) : null}
        <ActionLinks
          aircraftHref={item.aircraftHref}
          airworthinessHref={item.airworthinessHref}
          exportHref={item.exportHref}
          logbookHref={maintenanceLogbookDrawerHref(
            returnTo,
            item.aircraftId,
            item.logbookEntry?.id ?? null,
          )}
        />
      </div>
    </aside>
  );
}

function ProgramDrawer({
  aircraftOptions,
  closeHref,
  item,
  returnTo,
}: {
  aircraftOptions: { id: string; tailNumber: string; type: AircraftType }[];
  closeHref: string;
  item: MaintenanceProgramItem;
  returnTo: string;
}) {
  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-2xl flex-col border-l border-zinc-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-200 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Maintenance program</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950">{item.title}</h2>
        </div>
        <Link className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100" href={closeHref}>
          Close
        </Link>
      </div>
      <div className="grid gap-4 overflow-y-auto p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Category</p>
            <p className="mt-1 text-sm font-semibold text-zinc-950">{formatEnum(item.category)}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Interval</p>
            <p className="mt-1 text-sm font-semibold text-zinc-950">{programIntervalLabel(item)}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Warning</p>
            <p className="mt-1 text-sm font-semibold text-zinc-950">{programWarningLabel(item)}</p>
          </div>
        </div>

        <form action={updateMaintenanceProgramTaskAction.bind(null, item.id)} className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <input name="returnTo" type="hidden" value={returnTo} />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Task details</p>
          <TaskFields item={item} />
          <button className="min-h-9 rounded-md border border-zinc-950 bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800" type="submit">
            Save task
          </button>
        </form>

        <form action={setMaintenanceProgramTaskActiveAction.bind(null, item.id, !item.active)} className="rounded-lg border border-zinc-200 bg-white p-3">
          <input name="returnTo" type="hidden" value={returnTo} />
          <button className="min-h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100" type="submit">
            {item.active ? "Deactivate task" : "Activate task"}
          </button>
        </form>

        <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Applicability</p>
          {item.applicabilities.length === 0 ? (
            <p className="text-sm text-zinc-600">No applicability rules yet.</p>
          ) : (
            <div className="grid gap-2">
              {item.applicabilities.map((applicability) => (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs" key={applicability.id}>
                  <span className="font-semibold text-zinc-800">
                    {scopeLabel(applicability.scope)}
                    {applicability.aircraftType ? ` ${aircraftTypeLabel(applicability.aircraftType)}` : ""}
                    {applicability.aircraftTailNumber ? ` ${applicability.aircraftTailNumber}` : ""}
                    {!applicability.active ? " (retired)" : ""}
                  </span>
                  {applicability.active ? (
                    <form action={retireMaintenanceProgramApplicabilityAction.bind(null, applicability.id)}>
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <button className="rounded-md border border-zinc-300 bg-white px-2 py-1 font-semibold text-zinc-700 hover:bg-zinc-100" type="submit">
                        Retire
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <form action={addMaintenanceProgramApplicabilityAction.bind(null, item.id)} className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2">
            <input name="returnTo" type="hidden" value={returnTo} />
            <div className="grid gap-2 sm:grid-cols-3">
              <select className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="scope" defaultValue={MaintenanceProgramApplicabilityScope.ALL_AIRCRAFT}>
                {Object.values(MaintenanceProgramApplicabilityScope).map((scope) => (
                  <option key={scope} value={scope}>{scopeLabel(scope)}</option>
                ))}
              </select>
              <select className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="aircraftType" defaultValue="">
                <option value="">Aircraft type</option>
                {Object.values(AircraftType).map((aircraftType) => (
                  <option key={aircraftType} value={aircraftType}>{aircraftTypeLabel(aircraftType)}</option>
                ))}
              </select>
              <select className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="aircraftId" defaultValue="">
                <option value="">Tail</option>
                {aircraftOptions.map((aircraft) => (
                  <option key={aircraft.id} value={aircraft.id}>{aircraft.tailNumber}</option>
                ))}
              </select>
            </div>
            <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="notes" placeholder="Applicability notes" />
            <button className="min-h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100" type="submit">
              Add applicability
            </button>
          </form>
        </section>

        <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Tail overrides</p>
          {item.overrides.length === 0 ? (
            <p className="text-sm text-zinc-600">No tail overrides recorded.</p>
          ) : (
            <div className="grid gap-2">
              {item.overrides.map((override) => (
                <p className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700" key={override.id}>
                  <span className="font-semibold text-zinc-900">{override.aircraftTailNumber}</span> | {overrideActionLabel(override.action)} | {override.reason}
                </p>
              ))}
            </div>
          )}
          <form action={addMaintenanceProgramOverrideAction.bind(null, item.id)} className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2">
            <input name="returnTo" type="hidden" value={returnTo} />
            <div className="grid gap-2 sm:grid-cols-2">
              <select className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="aircraftId" required defaultValue="">
                <option value="">Tail</option>
                {aircraftOptions.map((aircraft) => (
                  <option key={aircraft.id} value={aircraft.id}>{aircraft.tailNumber}</option>
                ))}
              </select>
              <select className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="action" defaultValue={MaintenanceProgramOverrideAction.EXCLUDE}>
                {Object.values(MaintenanceProgramOverrideAction).map((action) => (
                  <option key={action} value={action}>{overrideActionLabel(action)}</option>
                ))}
              </select>
            </div>
            <input className="min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" name="reason" placeholder="Reason required" required />
            <button className="min-h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100" type="submit">
              Add override
            </button>
          </form>
        </section>

        <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Affected aircraft</p>
          {item.affectedAircraft.length === 0 ? (
            <p className="text-sm text-zinc-600">No active aircraft currently match this task.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-100">
              {item.affectedAircraft.map((aircraft) => (
                <div className="grid gap-1 border-b border-zinc-100 p-2 text-xs last:border-b-0 sm:grid-cols-[6rem_8rem_minmax(0,1fr)_9rem]" key={aircraft.aircraftId}>
                  <span className="font-semibold text-zinc-950">{aircraft.tailNumber}</span>
                  <span className={`w-fit rounded-full border px-2 py-0.5 font-semibold ${statusClasses(scheduledStatusLabel(aircraft.complianceStatus).toUpperCase())}`}>
                    {scheduledStatusLabel(aircraft.complianceStatus)}
                  </span>
                  <span className="truncate text-zinc-600">{aircraft.overrideLabel ?? aircraft.applicabilityLabel}</span>
                  <span className="text-zinc-600">
                    {[aircraft.nextDueAt ? formatDateTime(aircraft.nextDueAt) : null, aircraft.nextDueAirframeHours !== null ? `${aircraft.nextDueAirframeHours.toLocaleString()} hrs` : null, aircraft.nextDueCycles !== null ? `${aircraft.nextDueCycles.toLocaleString()} cycles` : null].filter(Boolean).join(" / ") || "Needs baseline"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

export default async function MaintenancePage({ searchParams }: PageProps) {
  const currentUser = await requireRole([UserRole.ADMIN, UserRole.MAINTENANCE]);

  const params = await searchParams;
  const view = normalizeView(firstParam(params.view));
  const selected = firstParam(params.selected);
  const statusSort = normalizeStatus(firstParam(params.status));
  const scheduledStatusFilter = normalizeScheduledStatus(firstParam(params.scheduledStatus));
  const logbookStatusFilter = normalizeLogbookStatus(firstParam(params.logbookStatus));
  const logbookEntryTypeFilter = normalizeLogbookEntryType(firstParam(params.entryType));
  const categoryFilter = normalizeTaskCategory(firstParam(params.category));
  const activeFilter = normalizeActiveFilter(firstParam(params.active));
  const requiredFilter = normalizeRequiredFilter(firstParam(params.required));
  const searchFilter = firstParam(params.q)?.trim() ?? "";
  const tailFilter = firstParam(params.tail);
  const aircraftTypeParam = firstParam(params.aircraftType);
  const requestedAircraftTypeFilter = normalizeAircraftType(aircraftTypeParam);
  const submitted = firstParam(params.submitted);
  const message = firstParam(params.message) ?? (submitted ? "Logbook action saved." : null);
  const error = firstParam(params.error);
  const logbookAircraftId = view === "logbook" ? firstParam(params.logbookAircraft) : null;
  const logbookEntryId = view === "logbook" ? firstParam(params.logbookEntry) : null;
  const logbookCursorEntryId = view === "logbook" ? firstParam(params.logbookCursor) : null;
  const logbookDrawerLimit = normalizeLogbookDrawerLimit(firstParam(params.logbookLimit));
  const logbookDrawerSearch = firstParam(params.logbookDrawerQ)?.trim() ?? "";
  const logbookDrawerStatus = normalizeLogbookStatus(firstParam(params.logbookDrawerStatus));
  const logbookDrawerEntryType = normalizeLogbookEntryType(firstParam(params.logbookDrawerType));
  const logbookFromValue = firstParam(params.logbookFrom) ?? "";
  const logbookToValue = firstParam(params.logbookTo) ?? "";
  const [data, logbookDrawerData] = await Promise.all([
    getMaintenanceWorkbenchData(),
    logbookAircraftId
      ? getMaintenanceLogbookDrawerData({
          aircraftId: logbookAircraftId,
          cursorEntryId: logbookCursorEntryId,
          filters: {
            entryType: logbookDrawerEntryType,
            from: parseLogbookDrawerDate(logbookFromValue),
            search: logbookDrawerSearch,
            status: logbookDrawerStatus,
            to: parseLogbookDrawerDate(logbookToValue, true),
          },
          limit: logbookDrawerLimit,
          selectedEntryId: logbookEntryId,
        })
      : Promise.resolve(null),
  ]);
  const allFleetQueueGroups = groupQueueItems(data.queueItems, "AOG");
  const allFleetStats = buildMaintenanceFleetStats(allFleetQueueGroups);
  const defaultAircraftTypeFilter = largestFleetType(allFleetStats);
  const aircraftTypeFilter = requestedAircraftTypeFilter ?? (aircraftTypeParam === null ? defaultAircraftTypeFilter : null);
  const aircraftTypeSelectValue = aircraftTypeFilter ?? "all";
  const aircraftTypeHrefValue = aircraftTypeParam !== null && !requestedAircraftTypeFilter ? "all" : aircraftTypeFilter;
  const fleetStats = buildMaintenanceFleetStats(
    aircraftTypeFilter
      ? allFleetQueueGroups.filter((group) => group.aircraftType === aircraftTypeFilter)
      : allFleetQueueGroups,
  );
  const aircraftTypeOptions = data.aircraftTypeOptions
    .slice()
    .sort((first, second) => aircraftTypeLabel(first).localeCompare(aircraftTypeLabel(second)));

  const filteredQueue = data.queueItems
    .map((item, index) => ({ index, item }))
    .filter(({ item }) => {
      if (aircraftTypeFilter && item.aircraftType !== aircraftTypeFilter) {
        return false;
      }
      if (tailFilter && item.tailNumber !== tailFilter) {
        return false;
      }

      return true;
    })
    .sort((first, second) => {
      const firstMatchesSort = queueSortMatches(first.item, statusSort);
      const secondMatchesSort = queueSortMatches(second.item, statusSort);

      if (firstMatchesSort !== secondMatchesSort) {
        return firstMatchesSort ? -1 : 1;
      }

      return first.index - second.index;
    })
    .map(({ item }) => item);
  const queueGroups = groupQueueItems(filteredQueue, statusSort);
  const nextScheduledByAircraft = buildNextScheduledMaintenanceMap(
    data.scheduledItems.filter((item) => {
      if (aircraftTypeFilter && item.aircraftType !== aircraftTypeFilter) {
        return false;
      }

      return !tailFilter || item.tailNumber === tailFilter;
    }),
  );

  const filteredScheduledItems = data.scheduledItems.filter((item) => {
    if (aircraftTypeFilter && item.aircraftType !== aircraftTypeFilter) {
      return false;
    }
    if (scheduledStatusFilter && item.complianceStatus !== scheduledStatusFilter) {
      return false;
    }
    if (categoryFilter && item.taskCategory !== categoryFilter) {
      return false;
    }

    return !tailFilter || item.tailNumber === tailFilter;
  });
  const filteredProgramItems = data.programItems.filter((item) => {
    if (categoryFilter && item.category !== categoryFilter) {
      return false;
    }
    if (activeFilter === "active" && !item.active) {
      return false;
    }
    if (activeFilter === "inactive" && item.active) {
      return false;
    }
    if (requiredFilter === "required" && !item.requiredForServiceability) {
      return false;
    }
    if (requiredFilter === "optional" && item.requiredForServiceability) {
      return false;
    }
    if (aircraftTypeFilter && !item.affectedAircraft.some((aircraft) => aircraft.aircraftType === aircraftTypeFilter)) {
      return false;
    }
    if (tailFilter && !item.affectedAircraft.some((aircraft) => aircraft.tailNumber === tailFilter)) {
      return false;
    }
    if (searchFilter) {
      const haystack = [item.title, item.sourceReference, item.taskKey, item.description].filter(Boolean).join(" ").toLowerCase();

      return haystack.includes(searchFilter.toLowerCase());
    }

    return true;
  });
  const filteredLogbookItems = data.logbookItems.filter((item) => {
    if (aircraftTypeFilter && item.aircraftType !== aircraftTypeFilter) {
      return false;
    }
    if (tailFilter && item.tailNumber !== tailFilter) {
      return false;
    }
    if (logbookStatusFilter && item.status !== logbookStatusFilter) {
      return false;
    }
    if (logbookEntryTypeFilter && item.entryType !== logbookEntryTypeFilter) {
      return false;
    }
    if (searchFilter && !logbookSearchText(item).includes(searchFilter.toLowerCase())) {
      return false;
    }

    return true;
  });
  const scheduledItemGroups = groupScheduledItems(filteredScheduledItems);
  const logbookItemGroups = groupLogbookItems(filteredLogbookItems);
  const allLogbookItemGroupsByAircraft = new Map(
    groupLogbookItems(data.logbookItems).map((group) => [group.aircraftId, group.items]),
  );
  const programItemGroups = groupProgramItems(filteredProgramItems);
  const isCreatingProgramTask = view === "program" && selected === "new-task";
  const selectedQueueItem = view === "queue" ? data.queueItems.find((item) => item.id === selected) ?? null : null;
  const selectedScheduledItem = view === "scheduled" ? data.scheduledItems.find((item) => item.id === selected) ?? null : null;
  const selectedProgramItem = view === "program" && !isCreatingProgramTask ? data.programItems.find((item) => item.id === selected) ?? null : null;
  const closeHref = buildHref({
    active: view === "program" ? activeFilter : null,
    aircraftType: aircraftTypeHrefValue,
    category: view === "scheduled" || view === "program" ? categoryFilter : null,
    entryType: view === "logbook" ? logbookEntryTypeFilter : null,
    logbookStatus: view === "logbook" ? logbookStatusFilter : null,
    q: view === "program" || view === "logbook" ? searchFilter : null,
    required: view === "program" ? requiredFilter : null,
    scheduledStatus: view === "scheduled" ? scheduledStatusFilter : null,
    status: view === "queue" ? statusSort : null,
    tail: tailFilter,
    view,
  });
  const createProgramTaskHref = buildHref({
    active: activeFilter,
    aircraftType: aircraftTypeHrefValue,
    category: categoryFilter,
    q: searchFilter,
    required: requiredFilter,
    selected: "new-task",
    tail: tailFilter,
    view: "program",
  });
  const selectedQueueHref = selectedQueueItem
    ? buildHref({ aircraftType: aircraftTypeHrefValue, selected: selectedQueueItem.id, status: statusSort, tail: tailFilter, view })
    : closeHref;
  const selectedScheduledHref = selectedScheduledItem
    ? buildHref({
        aircraftType: aircraftTypeHrefValue,
        category: categoryFilter,
        scheduledStatus: scheduledStatusFilter,
        selected: selectedScheduledItem.id,
        tail: tailFilter,
        view,
      })
    : closeHref;
  const logbookDrawerUrlState: MaintenanceLogbookDrawerUrlState | null =
    logbookAircraftId && logbookDrawerData
      ? {
          aircraftId: logbookAircraftId,
          baseParams: Array.from(
            new URL(closeHref, "http://aeroops.local").searchParams.entries(),
          ),
          cursorEntryId: logbookCursorEntryId,
          entryId: logbookEntryId,
          entryType: logbookDrawerEntryType,
          from: logbookFromValue,
          limit: logbookDrawerLimit,
          search: logbookDrawerSearch,
          status: logbookDrawerStatus,
          to: logbookToValue,
        }
      : null;
  const selectedProgramHref = selectedProgramItem
    ? buildHref({
        active: activeFilter,
        aircraftType: aircraftTypeHrefValue,
        category: categoryFilter,
        q: searchFilter,
        required: requiredFilter,
        selected: selectedProgramItem.id,
        tail: tailFilter,
        view,
    })
    : closeHref;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1440px] gap-4">
        <header className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <MaintenanceFleetStatsStrip
            active={activeFilter}
            aircraftTypeValue={aircraftTypeSelectValue}
            category={categoryFilter}
            entryType={logbookEntryTypeFilter}
            logbookStatus={logbookStatusFilter}
            q={searchFilter}
            required={requiredFilter}
            scheduledStatus={scheduledStatusFilter}
            stats={fleetStats}
            status={statusSort}
            tail={tailFilter}
            typeStats={allFleetStats}
            view={view}
          />
          <div className="flex w-fit rounded-lg border border-zinc-300 bg-white p-1">
            <FilterPill active={view === "queue"} href={buildHref({ aircraftType: aircraftTypeHrefValue, status: statusSort, tail: tailFilter, view: "queue" })}>
              Queue
            </FilterPill>
            <FilterPill active={view === "scheduled"} href={buildHref({ aircraftType: aircraftTypeHrefValue, category: categoryFilter, scheduledStatus: scheduledStatusFilter, tail: tailFilter, view: "scheduled" })}>
              Scheduled Maintenance
            </FilterPill>
            <FilterPill active={view === "program"} href={buildHref({ active: activeFilter, aircraftType: aircraftTypeHrefValue, category: categoryFilter, q: searchFilter, required: requiredFilter, tail: tailFilter, view: "program" })}>
              Program
            </FilterPill>
            <FilterPill active={view === "logbook"} href={buildHref({ aircraftType: aircraftTypeHrefValue, entryType: logbookEntryTypeFilter, logbookStatus: logbookStatusFilter, q: searchFilter, tail: tailFilter, view: "logbook" })}>
              Logbook
            </FilterPill>
          </div>
        </header>

        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{message}</p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{error}</p>
        ) : null}
        {view === "logbook" && logbookAircraftId && !logbookDrawerData ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            The requested aircraft logbook was not found. The fleet Logbook overview remains available.
          </p>
        ) : null}

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-2">
          <div className="flex flex-wrap items-center gap-2">
          {view === "queue"
            ? (
              <>
                {statusOptions.map((option) => (
                  <FilterPill
                    active={statusSort === option.value}
                    href={buildHref({ aircraftType: aircraftTypeHrefValue, status: option.value, tail: tailFilter, view })}
                    key={option.value}
                  >
                    {option.label}
                  </FilterPill>
                ))}
                <span className="mx-1 h-6 w-px bg-zinc-200" />
              </>
            )
            : null}
          </div>

          <form action="/maintenance" className="flex flex-wrap items-center gap-2" method="get">
            <input name="view" type="hidden" value={view} />
            {view === "queue" ? (
              <input name="status" type="hidden" value={statusSort} />
            ) : null}
            {view === "scheduled" ? (
              <>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="maintenance-scheduled-status-filter">
                  Status
                </label>
                <select
                  className="h-8 min-w-36 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  defaultValue={scheduledStatusFilter ?? ""}
                  id="maintenance-scheduled-status-filter"
                  name="scheduledStatus"
                >
                  <option value="">All status</option>
                  {scheduledStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="maintenance-category-filter">
                  Category
                </label>
                <select
                  className="h-8 min-w-36 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  defaultValue={categoryFilter ?? ""}
                  id="maintenance-category-filter"
                  name="category"
                >
                  <option value="">All categories</option>
                  {Object.values(MaintenanceProgramTaskCategory).map((category) => (
                    <option key={category} value={category}>
                      {formatEnum(category)}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            {view === "program" ? (
              <>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="maintenance-program-search-filter">
                  Search
                </label>
                <input
                  className="h-8 min-w-44 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  defaultValue={searchFilter}
                  id="maintenance-program-search-filter"
                  name="q"
                  placeholder="Task or source"
                />
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="maintenance-program-active-filter">
                  State
                </label>
                <select
                  className="h-8 min-w-32 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  defaultValue={activeFilter ?? ""}
                  id="maintenance-program-active-filter"
                  name="active"
                >
                  <option value="">All state</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="maintenance-program-required-filter">
                  Required
                </label>
                <select
                  className="h-8 min-w-32 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  defaultValue={requiredFilter ?? ""}
                  id="maintenance-program-required-filter"
                  name="required"
                >
                  <option value="">All tasks</option>
                  <option value="required">Required</option>
                  <option value="optional">Optional</option>
                </select>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="maintenance-program-category-filter">
                  Category
                </label>
                <select
                  className="h-8 min-w-36 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  defaultValue={categoryFilter ?? ""}
                  id="maintenance-program-category-filter"
                  name="category"
                >
                  <option value="">All categories</option>
                  {Object.values(MaintenanceProgramTaskCategory).map((category) => (
                    <option key={category} value={category}>
                      {formatEnum(category)}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            {view === "logbook" ? (
              <>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="maintenance-logbook-search-filter">
                  Search
                </label>
                <input
                  className="h-8 min-w-44 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  defaultValue={searchFilter}
                  id="maintenance-logbook-search-filter"
                  name="q"
                  placeholder="Entry, title, reference"
                />
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="maintenance-logbook-status-filter">
                  Status
                </label>
                <select
                  className="h-8 min-w-36 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  defaultValue={logbookStatusFilter ?? ""}
                  id="maintenance-logbook-status-filter"
                  name="logbookStatus"
                >
                  <option value="">All status</option>
                  {Object.values(AircraftLogbookEntryStatus).map((status) => (
                    <option key={status} value={status}>
                      {formatEnum(status)}
                    </option>
                  ))}
                </select>
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="maintenance-logbook-entry-type-filter">
                  Entry type
                </label>
                <select
                  className="h-8 min-w-40 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  defaultValue={logbookEntryTypeFilter ?? ""}
                  id="maintenance-logbook-entry-type-filter"
                  name="entryType"
                >
                  <option value="">All entry types</option>
                  {Object.values(AircraftLogbookEntryType).map((entryType) => (
                    <option key={entryType} value={entryType}>
                      {formatEnum(entryType)}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="maintenance-aircraft-type-filter">
              Type
            </label>
            <select
              className="h-8 min-w-36 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              defaultValue={aircraftTypeSelectValue}
              id="maintenance-aircraft-type-filter"
              name="aircraftType"
            >
              <option value="all">All types</option>
              {aircraftTypeOptions.map((aircraftType) => (
                <option key={aircraftType} value={aircraftType}>
                  {aircraftTypeLabel(aircraftType)}
                </option>
              ))}
            </select>
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500" htmlFor="maintenance-tail-filter">
              Tail
            </label>
            <select
              className="h-8 min-w-36 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              defaultValue={tailFilter ?? ""}
              id="maintenance-tail-filter"
              name="tail"
            >
              <option value="">All tails</option>
              {data.tailOptions.map((tail) => (
                <option key={tail} value={tail}>
                  {tail}
                </option>
              ))}
            </select>
            <button
              className="inline-flex h-8 items-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
              type="submit"
            >
              Apply
            </button>
          </form>
        </section>

        {view === "queue" ? (
          <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-zinc-500" />
                <h2 className="text-sm font-semibold text-zinc-950">Serviceability queue</h2>
              </div>
              <span className="text-xs font-semibold text-zinc-500">
                {queueGroups.length} aircraft | {filteredQueue.length} item{filteredQueue.length === 1 ? "" : "s"}
              </span>
            </div>
            {queueGroups.length === 0 ? (
              <p className="p-4 text-sm text-zinc-600">No maintenance items match this filter.</p>
            ) : (
              <div>
                {queueGroups.map((group, index) => (
                  <QueueGroup
                    buildItemHref={(item) => buildHref({ aircraftType: aircraftTypeHrefValue, selected: item.id, status: statusSort, tail: tailFilter, view })}
                    group={group}
                    key={group.aircraftId}
                    nextScheduled={nextScheduledByAircraft.get(group.aircraftId) ?? null}
                    selected={selected}
                    striped={index % 2 === 1}
                  />
                ))}
              </div>
            )}
          </section>
        ) : view === "scheduled" ? (
          <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-zinc-500" />
                <h2 className="text-sm font-semibold text-zinc-950">Scheduled maintenance</h2>
              </div>
              <span className="text-xs font-semibold text-zinc-500">{scheduledItemGroups.length} aircraft | {filteredScheduledItems.length} item{filteredScheduledItems.length === 1 ? "" : "s"}</span>
            </div>
            {filteredScheduledItems.length === 0 ? (
              <p className="p-4 text-sm text-zinc-600">No planned or in-progress maintenance is currently scheduled.</p>
            ) : (
              <div>
                {scheduledItemGroups.map((group) => (
                  <ScheduledMaintenanceGroup
                    buildItemHref={(item) => buildHref({
                      aircraftType: aircraftTypeHrefValue,
                      category: categoryFilter,
                      scheduledStatus: scheduledStatusFilter,
                      selected: item.id,
                      tail: tailFilter,
                      view,
                    })}
                    group={group}
                    key={group.aircraftId}
                    selected={selected}
                  />
                ))}
              </div>
            )}
          </section>
        ) : view === "logbook" ? (
          <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-500" />
                <div>
                  <h2 className="text-sm font-semibold text-zinc-950">Aircraft logbook</h2>
                  <p className="text-xs text-zinc-500">Stay in Maintenance while reviewing, filtering, and working across aircraft logbooks.</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-zinc-500">{logbookItemGroups.length} aircraft | {filteredLogbookItems.length} entr{filteredLogbookItems.length === 1 ? "y" : "ies"}</span>
            </div>
            {filteredLogbookItems.length === 0 ? (
              <p className="p-4 text-sm text-zinc-600">No logbook entries match this filter.</p>
            ) : (
              <div>
                {logbookItemGroups.map((group) => (
                  <LogbookGroup
                    aircraftItems={allLogbookItemGroupsByAircraft.get(group.aircraftId) ?? group.items}
                    buildItemHref={(item) => buildHref({
                      aircraftType: aircraftTypeHrefValue,
                      entryType: logbookEntryTypeFilter,
                      logbookAircraft: item.aircraftId,
                      logbookEntry: item.id,
                      logbookLimit: 50,
                      logbookStatus: logbookStatusFilter,
                      q: searchFilter,
                      tail: tailFilter,
                      view,
                    })}
                    fullLogbookHref={buildHref({
                      aircraftType: aircraftTypeHrefValue,
                      entryType: logbookEntryTypeFilter,
                      logbookAircraft: group.aircraftId,
                      logbookLimit: 50,
                      logbookStatus: logbookStatusFilter,
                      q: searchFilter,
                      tail: tailFilter,
                      view,
                    })}
                    group={group}
                    key={group.aircraftId}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-zinc-500" />
                <div>
                  <h2 className="text-sm font-semibold text-zinc-950">Program task library</h2>
                  <p className="text-xs text-zinc-500">Reusable tasks grouped by fleet-wide, aircraft type, or tail applicability.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500">{filteredProgramItems.length} task{filteredProgramItems.length === 1 ? "" : "s"}</span>
                <Link
                  className="inline-flex min-h-9 items-center rounded-md border border-zinc-950 bg-zinc-950 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
                  href={createProgramTaskHref}
                >
                  Create task
                </Link>
              </div>
            </div>
            {filteredProgramItems.length === 0 ? (
              <p className="p-4 text-sm text-zinc-600">No maintenance program tasks match this filter.</p>
            ) : (
              <div className="grid gap-0">
                {programItemGroups.map((group) => (
                  <section className="border-b border-zinc-100 last:border-b-0" key={group.key}>
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-50 px-3 py-2">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">{group.label}</h3>
                        <p className="mt-0.5 text-xs text-zinc-500">{group.description}</p>
                      </div>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[0.7rem] font-semibold text-zinc-600">
                        {group.items.length} task{group.items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {group.items.map((item) => (
                        <ProgramRow
                          href={buildHref({
                            active: activeFilter,
                            aircraftType: aircraftTypeHrefValue,
                            category: categoryFilter,
                            q: searchFilter,
                            required: requiredFilter,
                            selected: item.id,
                            tail: tailFilter,
                            view,
                          })}
                          item={item}
                          key={item.id}
                          selected={selected === item.id}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="flex flex-wrap gap-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> AOG: cannot fly</span>
          <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> MEL, CDL, NEF: serviceable with limitations</span>
          <span className="inline-flex items-center gap-1"><Wrench className="h-3.5 w-3.5" /> Scheduled MX: serviceable now, maintenance planned</span>
        </section>
      </div>

      {selectedQueueItem ? (
        <QueueDrawer
          canControl={currentUser.role === UserRole.MAINTENANCE}
          closeHref={closeHref}
          item={selectedQueueItem}
          returnTo={selectedQueueHref}
          scheduledOccurrenceOptions={data.scheduledItems
            .filter(
              (scheduledItem) =>
                scheduledItem.aircraftId === selectedQueueItem.aircraftId &&
                scheduledItem.maintenanceEvent !== null,
            )
            .map((scheduledItem) => ({
              id: scheduledItem.maintenanceEvent!.id,
              label: `${scheduledItem.taskTitle} · ${scheduledEventLabel(scheduledItem)}`,
            }))}
        />
      ) : null}
      {selectedScheduledItem ? (
        <ScheduledMaintenanceDrawer
          canControl={currentUser.role === UserRole.MAINTENANCE}
          closeHref={closeHref}
          item={selectedScheduledItem}
          returnTo={selectedScheduledHref}
          stationOptions={data.stationOptions}
        />
      ) : null}
      {selectedProgramItem ? (
        <ProgramDrawer
          aircraftOptions={data.aircraftOptions}
          closeHref={closeHref}
          item={selectedProgramItem}
          returnTo={selectedProgramHref}
        />
      ) : null}
      {logbookDrawerData && logbookDrawerUrlState ? (
        <MaintenanceLogbookDrawer
          aircraftOptions={data.aircraftOptions}
          closeHref={closeHref}
          data={logbookDrawerData}
          role={currentUser.role}
          urlState={logbookDrawerUrlState}
        />
      ) : null}
      {isCreatingProgramTask ? <ProgramCreateDrawer closeHref={closeHref} returnTo={closeHref} /> : null}
    </main>
  );
}
