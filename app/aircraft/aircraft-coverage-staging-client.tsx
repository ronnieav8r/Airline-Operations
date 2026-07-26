"use client";

import Link from "next/link";
import {
  type PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";

type CandidateScheduleTone =
  | "assigned"
  | "assignedElsewhere"
  | "reserve"
  | "off"
  | "unavailable"
  | "unscheduled";

type CandidateDay = {
  dateIso: string;
  dayKey: string;
  label: string;
};

type CandidateRun = {
  endIso: string;
  label: string;
  length: number;
  startIndex: number;
  startIso: string;
  tone: CandidateScheduleTone;
};

type Candidate = {
  availabilityLabel: string;
  availabilityToneClass: string;
  displayName: string;
  employeeNumber: string;
  id: string;
  isSelected: boolean;
  metaLabel: string;
  runs: CandidateRun[];
  selectionHref: string;
  warningMessages: string[];
};

type CoverageSegment = {
  crewName?: string;
  endIso: string;
  id: string;
  startIso: string;
  type: "assignment" | "gap";
};

type CoverageLane = {
  label: string;
  role: string;
  segments: CoverageSegment[];
};

type FlightSegment = {
  arrivalCode: string;
  departureCode: string;
  endIso: string;
  flightNumber: string;
  id: string;
  startIso: string;
};

type StagedCoverageEdit = {
  crewMemberId: string;
  endsAt: string;
  sourceLabel: string;
  startsAt: string;
};

type TimelinePosition = {
  left: number;
  width: number;
};

type HeaderMessage = {
  text: string;
  tone: "error" | "success";
};

type CoverageNavigation = {
  currentHref: string;
  currentLabel: string;
  nextHref: string;
  previousHref: string;
};

type SaveAction = (formData: FormData) => void | Promise<void>;

type AdjustmentMode = "end" | "move" | "start";

type ActiveAdjustment = {
  mode: AdjustmentMode;
  originalEndIndex: number;
  originalStartIndex: number;
  pointerOffset: number;
};

const toneStyles: Record<CandidateScheduleTone, { backgroundColor: string; borderColor: string; color: string }> = {
  assigned: { backgroundColor: "#075985", borderColor: "#0c4a6e", color: "#ffffff" },
  assignedElsewhere: { backgroundColor: "#075985", borderColor: "#0c4a6e", color: "#ffffff" },
  reserve: { backgroundColor: "#059669", borderColor: "#047857", color: "#ffffff" },
  off: { backgroundColor: "#52525b", borderColor: "#3f3f46", color: "#ffffff" },
  unavailable: { backgroundColor: "#991b1b", borderColor: "#7f1d1d", color: "#ffffff" },
  unscheduled: { backgroundColor: "#e4e4e7", borderColor: "#a1a1aa", color: "#3f3f46" },
};

const toneLabels: Record<CandidateScheduleTone, string> = {
  assigned: "Assigned",
  assignedElsewhere: "Assigned to tail",
  reserve: "Reserve",
  off: "Off",
  unavailable: "Unavailable",
  unscheduled: "No schedule",
};
const dayColumnWidthPx = 28;
const aircraftContextLabelWidthPx = 56;

function dayGridTemplate(days: CandidateDay[]): string {
  return `repeat(${days.length}, ${dayColumnWidthPx}px)`;
}

function dayGridWidth(days: CandidateDay[]): number {
  return days.length * dayColumnWidthPx;
}

function aircraftContextWidth(days: CandidateDay[]): number {
  return aircraftContextLabelWidthPx + dayGridWidth(days);
}

function timelineRowTemplate(days: CandidateDay[]): string {
  return `${aircraftContextLabelWidthPx}px ${dayGridWidth(days)}px minmax(0, 1fr)`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    hour12: false,
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function addDaysIso(value: string, days: number): string {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function clampIso(value: string, minIso: string, maxIso: string): string {
  const time = new Date(value).getTime();
  const min = new Date(minIso).getTime();
  const max = new Date(maxIso).getTime();

  return new Date(Math.min(Math.max(time, min), max)).toISOString();
}

function timelinePosition(startIso: string, endIso: string, windowStartIso: string, windowEndIso: string): TimelinePosition {
  const windowStart = new Date(windowStartIso).getTime();
  const windowEnd = new Date(windowEndIso).getTime();
  const start = Math.max(new Date(startIso).getTime(), windowStart);
  const end = Math.min(new Date(endIso).getTime(), windowEnd);
  const total = windowEnd - windowStart;

  if (total <= 0) {
    return { left: 0, width: 0 };
  }

  const left = ((start - windowStart) / total) * 100;
  const width = Math.max(((end - start) / total) * 100, 0.8);

  return { left, width };
}

function rangeFromIndexes(
  days: CandidateDay[],
  firstIndex: number,
  secondIndex: number,
  windowStartIso: string,
  windowEndIso: string,
  selectedCrewId: string,
): StagedCoverageEdit {
  const startIndex = Math.min(firstIndex, secondIndex);
  const endIndex = Math.max(firstIndex, secondIndex);
  const startsAt = clampIso(days[startIndex]?.dateIso ?? windowStartIso, windowStartIso, windowEndIso);
  const rawEndsAt = addDaysIso(days[endIndex]?.dateIso ?? startsAt, 1);
  const endsAt = clampIso(rawEndsAt, windowStartIso, windowEndIso);

  return {
    crewMemberId: selectedCrewId,
    endsAt,
    sourceLabel: "Selected gap range",
    startsAt,
  };
}

function clampIndex(value: number, days: CandidateDay[]): number {
  if (days.length === 0) {
    return 0;
  }

  return Math.min(Math.max(value, 0), days.length - 1);
}

function dateIndexFromClientX(days: CandidateDay[], clientX: number, element: HTMLElement | null): number {
  const rect = element?.getBoundingClientRect();

  if (!rect || rect.width <= 0) {
    return 0;
  }

  const ratio = (clientX - rect.left) / rect.width;

  return clampIndex(Math.floor(ratio * days.length), days);
}

function dateIndexFromIso(days: CandidateDay[], value: string, mode: "end" | "start"): number {
  if (days.length === 0) {
    return 0;
  }

  const firstDay = new Date(days[0].dateIso).getTime();
  const offset = new Date(value).getTime() - firstDay;
  const rawIndex = offset / 86_400_000;
  const index = mode === "end" ? Math.ceil(rawIndex) - 1 : Math.floor(rawIndex);

  return clampIndex(index, days);
}

function rangeFromAdjustment(
  adjustment: ActiveAdjustment,
  days: CandidateDay[],
  pointerIndex: number,
  windowStartIso: string,
  windowEndIso: string,
  selectedCrewId: string,
): StagedCoverageEdit {
  const originalLength = adjustment.originalEndIndex - adjustment.originalStartIndex;

  if (adjustment.mode === "move") {
    const startIndex = clampIndex(pointerIndex - adjustment.pointerOffset, days);
    const limitedStartIndex = Math.min(startIndex, Math.max(days.length - originalLength - 1, 0));

    return rangeFromIndexes(
      days,
      limitedStartIndex,
      limitedStartIndex + originalLength,
      windowStartIso,
      windowEndIso,
      selectedCrewId,
    );
  }

  if (adjustment.mode === "start") {
    return rangeFromIndexes(
      days,
      Math.min(pointerIndex, adjustment.originalEndIndex),
      adjustment.originalEndIndex,
      windowStartIso,
      windowEndIso,
      selectedCrewId,
    );
  }

  return rangeFromIndexes(
    days,
    adjustment.originalStartIndex,
    Math.max(pointerIndex, adjustment.originalStartIndex),
    windowStartIso,
    windowEndIso,
    selectedCrewId,
  );
}

function GridLines({ days }: { days: CandidateDay[] }) {
  const gridTemplateColumns = dayGridTemplate(days);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 grid" style={{ gridTemplateColumns }}>
      {days.map((day) => (
        <div className="border-r border-zinc-100 last:border-r-0" key={day.dayKey} />
      ))}
    </div>
  );
}

function DateHeader({ days }: { days: CandidateDay[] }) {
  const gridTemplateColumns = dayGridTemplate(days);
  const rowTemplateColumns = timelineRowTemplate(days);

  return (
    <div
      className="grid border-b border-zinc-100 bg-zinc-50 text-center text-[0.62rem] font-semibold tabular-nums text-zinc-500"
      style={{ gridTemplateColumns: rowTemplateColumns }}
    >
      <div className="border-r border-zinc-100 px-1 py-1 text-left text-zinc-600">Date</div>
      <div className="grid" style={{ gridTemplateColumns }}>
        {days.map((day) => (
          <span
            className="border-r border-zinc-100 px-1 py-1 leading-none last:border-r-0"
            key={day.dayKey}
            title={formatDate(day.dateIso)}
          >
            {day.label}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="border-l border-zinc-100" />
    </div>
  );
}

function StagedPreviewBar({
  days,
  onStage,
  selectedCrewId,
  stagedEdit,
  windowEndIso,
  windowStartIso,
}: {
  days: CandidateDay[];
  onStage: (edit: StagedCoverageEdit) => void;
  selectedCrewId: string;
  stagedEdit: StagedCoverageEdit;
  windowEndIso: string;
  windowStartIso: string;
}) {
  const laneRef = useRef<HTMLDivElement | null>(null);
  const activeAdjustmentRef = useRef<ActiveAdjustment | null>(null);
  const [activeAdjustment, setActiveAdjustment] = useState<ActiveAdjustment | null>(null);
  const position = timelinePosition(stagedEdit.startsAt, stagedEdit.endsAt, windowStartIso, windowEndIso);

  function pointerIndexFromClientX(clientX: number): number {
    return dateIndexFromClientX(days, clientX, laneRef.current?.parentElement ?? null);
  }

  function pointerIndex(event: ReactPointerEvent<HTMLElement>): number {
    return pointerIndexFromClientX(event.clientX);
  }

  function startAdjustment(event: ReactPointerEvent<HTMLElement>, mode: AdjustmentMode) {
    event.preventDefault();
    event.stopPropagation();
    const startIndex = dateIndexFromIso(days, stagedEdit.startsAt, "start");
    const endIndex = dateIndexFromIso(days, stagedEdit.endsAt, "end");

    const nextAdjustment = {
      mode,
      originalEndIndex: endIndex,
      originalStartIndex: startIndex,
      pointerOffset: pointerIndexFromClientX(event.clientX) - startIndex,
    };

    activeAdjustmentRef.current = nextAdjustment;
    setActiveAdjustment(nextAdjustment);
    if ("pointerId" in event) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Window-level pointer tracking below is the durable path.
      }
    }

    const adjustFromWindow = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      onStage(
        rangeFromAdjustment(
          nextAdjustment,
          days,
          pointerIndexFromClientX(moveEvent.clientX),
          windowStartIso,
          windowEndIso,
          selectedCrewId,
        ),
      );
    };
    const stopAdjustment = () => {
      activeAdjustmentRef.current = null;
      setActiveAdjustment(null);
      window.removeEventListener("pointermove", adjustFromWindow);
      window.removeEventListener("pointerup", stopAdjustment);
      window.removeEventListener("pointercancel", stopAdjustment);
    };

    window.addEventListener("pointermove", adjustFromWindow);
    window.addEventListener("pointerup", stopAdjustment);
    window.addEventListener("pointercancel", stopAdjustment);
  }

  function adjust(event: ReactPointerEvent<HTMLElement>) {
    const currentAdjustment = activeAdjustmentRef.current ?? activeAdjustment;

    if (!currentAdjustment) {
      return;
    }

    onStage(
      rangeFromAdjustment(
        currentAdjustment,
        days,
        pointerIndex(event),
        windowStartIso,
        windowEndIso,
        selectedCrewId,
      ),
    );
  }

  return (
    <div
      className="absolute top-1 z-30 h-7 overflow-hidden rounded border border-emerald-700 bg-emerald-600 text-center text-[0.62rem] font-semibold leading-7 text-white shadow-sm"
      data-testid="staged-coverage-bar"
      onPointerCancel={() => {
        activeAdjustmentRef.current = null;
        setActiveAdjustment(null);
      }}
      onPointerDown={(event) => startAdjustment(event, "move")}
      onPointerMove={adjust}
      onPointerUp={() => {
        activeAdjustmentRef.current = null;
        setActiveAdjustment(null);
      }}
      ref={laneRef}
      style={{
        left: `${position.left}%`,
        width: `${Math.max(position.width, 1.5)}%`,
      }}
      title={`${stagedEdit.sourceLabel} | ${formatDateTime(stagedEdit.startsAt)} - ${formatDateTime(stagedEdit.endsAt)}`}
    >
      <button
        aria-label="Stretch staged assignment start"
        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-emerald-900/30 hover:bg-emerald-950/50"
        data-testid="staged-coverage-start-handle"
        onPointerCancel={() => {
          activeAdjustmentRef.current = null;
          setActiveAdjustment(null);
        }}
        onPointerDown={(event) => startAdjustment(event, "start")}
        onPointerMove={adjust}
        onPointerUp={() => {
          activeAdjustmentRef.current = null;
          setActiveAdjustment(null);
        }}
        type="button"
      />
      <button
        aria-label="Move staged assignment"
        className="h-full w-full cursor-grab px-3 active:cursor-grabbing"
        data-testid="staged-coverage-move-handle"
        onPointerDown={(event) => startAdjustment(event, "move")}
        type="button"
      >
        {position.width > 8 ? "Staged" : ""}
      </button>
      <button
        aria-label="Stretch staged assignment end"
        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-emerald-900/30 hover:bg-emerald-950/50"
        data-testid="staged-coverage-end-handle"
        onPointerCancel={() => {
          activeAdjustmentRef.current = null;
          setActiveAdjustment(null);
        }}
        onPointerDown={(event) => startAdjustment(event, "end")}
        onPointerMove={adjust}
        onPointerUp={() => {
          activeAdjustmentRef.current = null;
          setActiveAdjustment(null);
        }}
        type="button"
      />
    </div>
  );
}

function AircraftScheduleContext({
  days,
  flightSegments,
  gapEndIso,
  gapStartIso,
  lanes,
  message,
  navigation,
  role,
  returnTo,
  saveAction,
  selectedCrewId,
  stagedEdit,
  tailNumber,
  windowEndIso,
  windowStartIso,
  onStage,
}: {
  days: CandidateDay[];
  flightSegments: FlightSegment[];
  gapEndIso: string | null;
  gapStartIso: string | null;
  lanes: CoverageLane[];
  message: HeaderMessage | null;
  navigation: CoverageNavigation;
  role: string;
  returnTo: string;
  saveAction: SaveAction;
  selectedCrewId: string | null;
  stagedEdit: StagedCoverageEdit | null;
  tailNumber: string;
  windowEndIso: string;
  windowStartIso: string;
  onStage: (edit: StagedCoverageEdit) => void;
}) {
  const dragStartIndexRef = useRef<number | null>(null);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragCurrentIndex, setDragCurrentIndex] = useState<number | null>(null);
  const rowTemplateColumns = useMemo(() => timelineRowTemplate(days), [days]);
  const dragPreview =
    selectedCrewId && dragStartIndex !== null && dragCurrentIndex !== null
      ? rangeFromIndexes(days, dragStartIndex, dragCurrentIndex, windowStartIso, windowEndIso, selectedCrewId)
      : null;
  const previewEdit = dragPreview ?? stagedEdit;

  function clearGapDrag() {
    dragStartIndexRef.current = null;
    setDragStartIndex(null);
    setDragCurrentIndex(null);
  }

  function stageGapRange(startIndex: number, currentIndex: number) {
    if (!selectedCrewId) {
      return;
    }

    setDragCurrentIndex(currentIndex);
    onStage(rangeFromIndexes(days, startIndex, currentIndex, windowStartIso, windowEndIso, selectedCrewId));
  }

  function startGapDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!selectedCrewId || event.button !== 0) {
      return;
    }

    event.preventDefault();
    const target = event.currentTarget;
    const startIndex = dateIndexFromClientX(days, event.clientX, target);
    dragStartIndexRef.current = startIndex;
    setDragStartIndex(startIndex);
    stageGapRange(startIndex, startIndex);

    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // Window-level tracking keeps the drag stable even if capture is unavailable.
    }

    const updateFromWindow = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      stageGapRange(startIndex, dateIndexFromClientX(days, moveEvent.clientX, target));
    };
    const finishFromWindow = (finishEvent: PointerEvent) => {
      finishEvent.preventDefault();
      stageGapRange(startIndex, dateIndexFromClientX(days, finishEvent.clientX, target));
      clearGapDrag();
      window.removeEventListener("pointermove", updateFromWindow);
      window.removeEventListener("pointerup", finishFromWindow);
      window.removeEventListener("pointercancel", cancelFromWindow);
    };
    const cancelFromWindow = () => {
      clearGapDrag();
      window.removeEventListener("pointermove", updateFromWindow);
      window.removeEventListener("pointerup", finishFromWindow);
      window.removeEventListener("pointercancel", cancelFromWindow);
    };

    window.addEventListener("pointermove", updateFromWindow);
    window.addEventListener("pointerup", finishFromWindow, { once: true });
    window.addEventListener("pointercancel", cancelFromWindow, { once: true });
  }

  return (
    <section className="min-w-0" data-testid="aircraft-schedule-context">
      <div className="grid gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-950">Aircraft schedule context</h3>
          <p className="mt-1 text-xs text-zinc-600">
            {tailNumber} flights and active aircraft crew coverage for this gap window.
          </p>
          <p className="mt-1 text-xs font-semibold text-zinc-500">
            Gap window: {gapStartIso ? formatDateTime(gapStartIso) : "No start"} -{" "}
            {gapEndIso ? formatDateTime(gapEndIso) : "open"}
          </p>
        </div>
        <div className="flex min-w-0 flex-col items-start gap-1.5 text-[0.62rem] font-semibold">
          <div className="flex flex-wrap items-center gap-1.5">
            {message ? (
              <span
                className={`rounded-full border px-2 py-0.5 ${
                  message.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {message.text}
              </span>
            ) : null}
            {stagedEdit && selectedCrewId ? (
              <form action={saveAction} className="flex flex-wrap items-center justify-end gap-1.5">
                <input name="crewMemberId" type="hidden" value={stagedEdit.crewMemberId} />
                <input name="endsAt" type="hidden" value={stagedEdit.endsAt} />
                <input name="notes" type="hidden" value={stagedEdit.sourceLabel} />
                <input name="returnTo" type="hidden" value={returnTo} />
                <input name="seatRole" type="hidden" value={role} />
                <input name="startsAt" type="hidden" value={stagedEdit.startsAt} />
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800">
                  {formatDateTime(stagedEdit.startsAt)} - {formatDateTime(stagedEdit.endsAt)}
                </span>
                <button
                  className="rounded-md bg-zinc-950 px-2 py-1 text-[0.68rem] font-semibold text-white hover:bg-zinc-800"
                  data-testid="staged-coverage-save"
                  type="submit"
                >
                  Save published assignment
                </button>
              </form>
            ) : null}
            <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-sky-800">Flight</span>
            <span className="rounded-full border border-emerald-700 bg-emerald-600 px-2 py-0.5 text-white">Assigned</span>
            <span className="rounded-full border border-red-700 bg-red-600 px-2 py-0.5 text-white">Gap</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Link
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[0.68rem] font-semibold text-zinc-700 hover:bg-zinc-50"
              href={navigation.previousHref}
            >
              Previous
            </Link>
            <Link
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[0.68rem] font-semibold text-zinc-700 hover:bg-zinc-50"
              href={navigation.currentHref}
            >
              {navigation.currentLabel}
            </Link>
            <Link
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[0.68rem] font-semibold text-zinc-700 hover:bg-zinc-50"
              href={navigation.nextHref}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-3 border-y border-zinc-200 bg-white">
          <DateHeader days={days} />
          <div className="grid border-b border-zinc-100 bg-white" style={{ gridTemplateColumns: rowTemplateColumns }}>
            <div className="flex min-h-9 items-center border-r border-zinc-100 px-2 text-[0.65rem] font-semibold text-zinc-600">
              FLT
            </div>
            <div className="relative min-h-9 overflow-hidden">
              <GridLines days={days} />
              {flightSegments.length === 0 ? (
                <div className="relative z-10 flex h-9 items-center px-2 text-[0.65rem] font-semibold text-zinc-400">
                  No flights in window
                </div>
              ) : null}
              {flightSegments.map((flight) => {
                const position = timelinePosition(flight.startIso, flight.endIso, windowStartIso, windowEndIso);
                const label = `${flight.flightNumber} ${flight.departureCode}-${flight.arrivalCode}`;

                return (
                  <div
                    className="absolute top-1 z-10 h-7 overflow-hidden rounded border border-sky-300 bg-sky-50 px-1 text-center text-[0.62rem] font-semibold leading-7 text-sky-800"
                    key={flight.id}
                    style={{
                      left: `${position.left}%`,
                      width: `${Math.max(position.width, 2)}%`,
                    }}
                    title={`${label} | ${formatDateTime(flight.startIso)} - ${formatDateTime(flight.endIso)}`}
                  >
                    {position.width > 6 ? label : flight.flightNumber}
                  </div>
                );
              })}
            </div>
            <div aria-hidden="true" className="border-l border-zinc-100" />
          </div>
          {lanes.map((lane) => {
            const isInteractiveLane = lane.role === role;

            return (
              <div className="grid border-b border-zinc-100 bg-white last:border-b-0" key={lane.role} style={{ gridTemplateColumns: rowTemplateColumns }}>
                <div className="flex min-h-9 items-center border-r border-zinc-100 px-2 text-[0.65rem] font-semibold text-zinc-600">
                  {lane.label}
                </div>
                <div className={`relative min-h-9 overflow-hidden ${isInteractiveLane && !selectedCrewId ? "bg-zinc-50" : ""}`}>
                  <GridLines days={days} />
                  {lane.segments.map((segment) => {
                    const position = timelinePosition(segment.startIso, segment.endIso, windowStartIso, windowEndIso);

                    if (segment.type === "gap") {
                      return (
                        <div
                          className={`absolute top-1 z-10 h-7 overflow-hidden rounded border px-1 text-center text-[0.62rem] font-semibold leading-7 text-white ${
                            isInteractiveLane && !selectedCrewId
                              ? "border-red-300 bg-red-300"
                              : "border-red-700 bg-red-600"
                          }`}
                          key={segment.id}
                          style={{
                            left: `${position.left}%`,
                            width: `${Math.max(position.width, 1.5)}%`,
                          }}
                          title={`Coverage gap | ${formatDateTime(segment.startIso)} - ${formatDateTime(segment.endIso)}`}
                        >
                          {position.width > 8 ? "Gap" : ""}
                        </div>
                      );
                    }

                    return (
                      <div
                        className="absolute top-1 z-10 h-7 overflow-hidden rounded border border-emerald-700 bg-emerald-600 px-1 text-center text-[0.62rem] font-semibold leading-7 text-white"
                        key={segment.id}
                        style={{
                          left: `${position.left}%`,
                          width: `${Math.max(position.width, 1.5)}%`,
                        }}
                        title={`${segment.crewName ?? "Assigned"} | ${formatDateTime(segment.startIso)} - ${formatDateTime(segment.endIso)}`}
                      >
                        {position.width > 10 ? segment.crewName : ""}
                      </div>
                    );
                  })}
                  {isInteractiveLane ? (
                    <button
                      aria-label="Stage coverage range"
                      className={`absolute inset-0 z-20 touch-none ${
                        selectedCrewId ? "cursor-crosshair hover:bg-emerald-500/10" : "cursor-not-allowed"
                      }`}
                      data-testid="coverage-gap-stage-lane"
                      disabled={!selectedCrewId}
                      onPointerCancel={clearGapDrag}
                      onPointerDown={startGapDrag}
                      type="button"
                    />
                  ) : null}
                  {isInteractiveLane && previewEdit && selectedCrewId ? (
                    <StagedPreviewBar
                      days={days}
                      onStage={onStage}
                      selectedCrewId={selectedCrewId}
                      stagedEdit={previewEdit}
                      windowEndIso={windowEndIso}
                      windowStartIso={windowStartIso}
                    />
                  ) : null}
                </div>
                <div aria-hidden="true" className="border-l border-zinc-100" />
              </div>
            );
          })}
      </div>
    </section>
  );
}

function CoverageOptions({
  aircraftTypeLabel,
  candidates,
  days,
  roleLabel,
  selectedCrewId,
  stagedEdit,
  onStage,
}: {
  aircraftTypeLabel: string;
  candidates: Candidate[];
  days: CandidateDay[];
  roleLabel: string;
  selectedCrewId: string | null;
  stagedEdit: StagedCoverageEdit | null;
  onStage: (edit: StagedCoverageEdit) => void;
}) {
  const gridTemplateColumns = useMemo(() => dayGridTemplate(days), [days]);
  const rowTemplateColumns = useMemo(() => timelineRowTemplate(days), [days]);

  function stageCandidateRun(candidate: Candidate, run: CandidateRun) {
    onStage({
      crewMemberId: candidate.id,
      endsAt: run.endIso,
      sourceLabel: run.label,
      startsAt: run.startIso,
    });
  }

  return (
    <section className="min-w-0 border-t border-zinc-200 pt-3" data-testid="coverage-options">
      <div className="grid gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-950">Coverage options</h3>
          <p className="mt-1 text-xs text-zinc-600">
            Showing {aircraftTypeLabel} {roleLabel} candidates for this gap.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-1.5 text-[0.62rem] font-semibold">
          {(["reserve", "off", "assignedElsewhere", "unavailable", "unscheduled"] as CandidateScheduleTone[]).map((tone) => (
            <span className="rounded-full border px-2 py-0.5" key={tone} style={toneStyles[tone]}>
              {toneLabels[tone]}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {candidates.length === 0 ? (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
            No same-role candidates found for this aircraft type.
          </p>
        ) : (
          candidates.map((candidate) => (
            <article
              className={`min-w-0 overflow-hidden rounded-md border ${
                candidate.isSelected
                  ? "border-sky-300 bg-sky-50 ring-1 ring-sky-200"
                  : "border-zinc-200 bg-zinc-50"
              }`}
              data-testid={`coverage-candidate-${candidate.id}`}
              key={candidate.id}
            >
              <div className="flex min-w-0 items-start justify-between gap-2 p-2">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold leading-tight text-zinc-950">{candidate.displayName}</span>
                  <span className="text-xs text-zinc-500">#{candidate.employeeNumber}</span>
                  <span className="text-xs font-medium text-zinc-600">{candidate.metaLabel}</span>
                  {candidate.warningMessages.length > 0 ? (
                    <details className="relative shrink-0">
                      <summary
                        className={`list-none cursor-pointer select-none rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold leading-none hover:brightness-95 [&::-webkit-details-marker]:hidden ${candidate.availabilityToneClass}`}
                      >
                        {candidate.availabilityLabel}
                      </summary>
                      <div className="absolute right-0 top-6 z-30 w-80 max-w-[calc(100vw-3rem)] rounded-md border border-amber-200 bg-white p-2 text-xs text-zinc-700 shadow-lg">
                        <ul className="grid gap-1">
                          {candidate.warningMessages.map((warning) => (
                            <li className="rounded border status-embedded-caution p-1.5" key={warning}>
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  ) : (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold leading-none ${candidate.availabilityToneClass}`}
                    >
                      {candidate.availabilityLabel}
                    </span>
                  )}
                </div>
                <Link
                  aria-label={`${candidate.isSelected ? "Clear selected crew" : "Select crew"} ${candidate.displayName}`}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                    candidate.isSelected
                      ? "border-sky-700 bg-sky-700"
                      : "border-zinc-300 bg-white hover:border-sky-500 hover:bg-sky-50"
                  }`}
                  href={candidate.selectionHref}
                  title={candidate.isSelected ? "Selected" : "Select"}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-sm ${candidate.isSelected ? "bg-white" : "bg-transparent"}`}
                  />
                </Link>
              </div>

              <div className="border-t border-zinc-200 bg-white">
                <div
                  className="grid border-b border-zinc-100 text-center text-[0.6rem] font-semibold tabular-nums text-zinc-500"
                  style={{ gridTemplateColumns: rowTemplateColumns }}
                >
                  <div className="border-r border-zinc-100 px-1 py-1 text-left text-zinc-600">Date</div>
                  <div className="grid" style={{ gridTemplateColumns }}>
                    {days.map((day) => (
                      <span
                        className="border-r border-zinc-100 px-1 py-1 leading-none last:border-r-0"
                        key={day.dayKey}
                        title={formatDate(day.dateIso)}
                      >
                        {day.label}
                      </span>
                    ))}
                  </div>
                  <div aria-hidden="true" className="border-l border-zinc-100" />
                </div>
                <div className="grid" style={{ gridTemplateColumns: rowTemplateColumns }}>
                  <div className="flex min-h-8 items-center border-r border-zinc-100 px-2 text-[0.62rem] font-semibold text-zinc-500">
                    Crew
                  </div>
                  <div className="relative grid h-8 gap-0.5 p-1" style={{ gridTemplateColumns }}>
                    {candidate.runs.map((run) => {
                      const isInteractive = candidate.isSelected && selectedCrewId === candidate.id;
                      const isStaged =
                        stagedEdit?.crewMemberId === candidate.id &&
                        stagedEdit.startsAt === run.startIso &&
                        stagedEdit.endsAt === run.endIso;

                      return (
                        <button
                          className={`flex items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap rounded-sm border px-1 text-[0.6rem] font-semibold leading-none ${
                            isInteractive ? "cursor-copy ring-offset-1 hover:ring-2 hover:ring-emerald-300" : "cursor-default"
                          } ${isStaged ? "ring-2 ring-emerald-700" : ""}`}
                          data-testid={`coverage-run-${candidate.id}-${run.startIndex}`}
                          disabled={!isInteractive}
                          key={`${candidate.id}-${run.startIndex}-${run.tone}`}
                          onClick={() => stageCandidateRun(candidate, run)}
                          onPointerDown={(event) => {
                            if (event.button !== 0 || !isInteractive) {
                              return;
                            }

                            stageCandidateRun(candidate, run);
                          }}
                          style={{
                            ...toneStyles[run.tone],
                            gridColumn: `${run.startIndex + 1} / span ${run.length}`,
                          }}
                          title={`Stage ${run.label} | ${formatDateTime(run.startIso)} - ${formatDateTime(run.endIso)}`}
                          type="button"
                        >
                          {run.length > 1 || days.length <= 7 ? run.label : ""}
                        </button>
                      );
                    })}
                  </div>
                  <div aria-hidden="true" className="border-l border-zinc-100" />
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function AircraftCoverageStagingClient({
  aircraftTypeLabel,
  candidates,
  days,
  flightSegments,
  gapEndIso,
  gapStartIso,
  message,
  navigation,
  lanes,
  role,
  roleLabel,
  returnTo,
  saveAction,
  selectedCrewId,
  tailNumber,
  windowEndIso,
  windowStartIso,
}: {
  aircraftTypeLabel: string;
  candidates: Candidate[];
  days: CandidateDay[];
  flightSegments: FlightSegment[];
  gapEndIso: string | null;
  gapStartIso: string | null;
  message: HeaderMessage | null;
  navigation: CoverageNavigation;
  lanes: CoverageLane[];
  role: string;
  roleLabel: string;
  returnTo: string;
  saveAction: SaveAction;
  selectedCrewId: string | null;
  tailNumber: string;
  windowEndIso: string;
  windowStartIso: string;
}) {
  const [stagedEdit, setStagedEdit] = useState<StagedCoverageEdit | null>(null);
  const timelineWidth = useMemo(() => aircraftContextWidth(days), [days]);
  const sharedSurfaceWidth = useMemo(() => `max(100%, ${timelineWidth}px)`, [timelineWidth]);

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-3"
      data-testid="aircraft-coverage-shared-timeline"
    >
      <div className="overflow-x-auto pb-2">
        <div className="grid gap-3" style={{ width: sharedSurfaceWidth }}>
        <AircraftScheduleContext
          days={days}
          flightSegments={flightSegments}
          gapEndIso={gapEndIso}
          gapStartIso={gapStartIso}
          lanes={lanes}
          message={message}
          navigation={navigation}
          onStage={setStagedEdit}
          role={role}
          returnTo={returnTo}
          saveAction={saveAction}
          selectedCrewId={selectedCrewId}
          stagedEdit={stagedEdit}
          tailNumber={tailNumber}
          windowEndIso={windowEndIso}
          windowStartIso={windowStartIso}
        />
        <CoverageOptions
          aircraftTypeLabel={aircraftTypeLabel}
          candidates={candidates}
          days={days}
          onStage={setStagedEdit}
          roleLabel={roleLabel}
          selectedCrewId={selectedCrewId}
          stagedEdit={stagedEdit}
        />
        </div>
      </div>
    </section>
  );
}
