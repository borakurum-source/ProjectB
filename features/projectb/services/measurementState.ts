export type MeasurementStateKind = "available" | "measured_zero" | "not_measured" | "stale";

export interface MeasurementStateInput {
  totalRuns: number;
  value: number | null | undefined;
  measuredAt?: string;
  now?: string;
  maxAgeDays?: number;
}

export interface MeasurementState {
  kind: MeasurementStateKind;
  display: string;
  sampleSize: number;
}

function percentage(value: number): number {
  return Math.round(value * 100);
}

export function classifyMeasurement(input: MeasurementStateInput): MeasurementState {
  const sampleSize = Math.max(0, Math.floor(input.totalRuns || 0));
  if (sampleSize === 0 || input.value == null) {
    return { kind: "not_measured", display: "Not measured", sampleSize: 0 };
  }

  const value = Math.max(0, input.value);
  const numerator = Math.round(value * sampleSize);
  const baseDisplay = `${percentage(value)}% (${numerator}/${sampleSize})`;
  const maxAgeDays = input.maxAgeDays ?? 14;
  const measuredAt = input.measuredAt ? new Date(input.measuredAt).getTime() : Number.NaN;
  const now = input.now ? new Date(input.now).getTime() : Date.now();

  if (!Number.isNaN(measuredAt) && now - measuredAt > maxAgeDays * 86_400_000) {
    return { kind: "stale", display: `${baseDisplay} · stale`, sampleSize };
  }

  return { kind: value === 0 ? "measured_zero" : "available", display: baseDisplay, sampleSize };
}
