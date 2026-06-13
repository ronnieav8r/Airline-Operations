import { AlertSeverity, AlertStatus, AlertType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type PerformanceMetadata = Record<string, boolean | number | string | null | undefined>;

export type TimedOperationOptions = {
  alertKey?: string;
  alertThresholdMs?: number;
  logThresholdMs?: number;
  metadata?: PerformanceMetadata;
  severity?: AlertSeverity;
};

const DEFAULT_LOG_THRESHOLD_MS = parsePositiveInteger(process.env.AEROOPS_PERF_LOG_MS, 750);
const DEFAULT_ALERT_THRESHOLD_MS = parsePositiveInteger(process.env.AEROOPS_PERF_ALERT_MS, 1500);
const DEFAULT_ALERT_COOLDOWN_MS = parsePositiveInteger(
  process.env.AEROOPS_PERF_ALERT_COOLDOWN_MS,
  15 * 60 * 1000,
);
const ALERTS_ENABLED = process.env.AEROOPS_PERF_ALERTS !== "0";

const recentAlertByKey = new Map<string, number>();

export async function timeOperation<T>(
  name: string,
  operation: () => Promise<T>,
  options: TimedOperationOptions = {},
): Promise<T> {
  const startedAt = Date.now();

  try {
    return await operation();
  } finally {
    const durationMs = Date.now() - startedAt;

    await reportOperationTiming(name, durationMs, options);
  }
}

async function reportOperationTiming(
  name: string,
  durationMs: number,
  options: TimedOperationOptions,
): Promise<void> {
  const logThresholdMs = options.logThresholdMs ?? DEFAULT_LOG_THRESHOLD_MS;
  const alertThresholdMs = options.alertThresholdMs ?? DEFAULT_ALERT_THRESHOLD_MS;

  if (durationMs >= logThresholdMs) {
    console.warn(
      JSON.stringify({
        event: "aeroops.slow_operation",
        name,
        durationMs,
        logThresholdMs,
        alertThresholdMs,
        metadata: sanitizeMetadata(options.metadata),
      }),
    );
  }

  if (ALERTS_ENABLED && durationMs >= alertThresholdMs) {
    await createPerformanceAlert(name, durationMs, alertThresholdMs, options);
  }
}

async function createPerformanceAlert(
  name: string,
  durationMs: number,
  alertThresholdMs: number,
  options: TimedOperationOptions,
): Promise<void> {
  const alertKey = options.alertKey ?? name;
  const now = Date.now();
  const lastAlertAt = recentAlertByKey.get(alertKey);

  if (lastAlertAt && now - lastAlertAt < DEFAULT_ALERT_COOLDOWN_MS) {
    return;
  }

  recentAlertByKey.set(alertKey, now);

  try {
    await prisma.alert.create({
      data: {
        type: AlertType.PERFORMANCE,
        severity: options.severity ?? AlertSeverity.LOW,
        status: AlertStatus.ACTIVE,
        title: `Slow screen data path: ${name}`,
        message: buildAlertMessage(name, durationMs, alertThresholdMs, options.metadata),
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "aeroops.performance_alert_failed",
        name,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

function buildAlertMessage(
  name: string,
  durationMs: number,
  alertThresholdMs: number,
  metadata?: PerformanceMetadata,
): string {
  const details = Object.entries(sanitizeMetadata(metadata))
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
  const base = `${name} took ${durationMs} ms, above the ${alertThresholdMs} ms alert threshold.`;

  return details ? `${base} Context: ${details}.` : base;
}

function sanitizeMetadata(metadata?: PerformanceMetadata): Record<string, boolean | number | string | null> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, boolean | number | string | null] => {
      const [, value] = entry;

      return value !== undefined;
    }),
  );
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
