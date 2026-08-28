import type { ProviderSnapshot } from '../types';

export type ProviderSnapshotStateKind =
  | 'available'
  | 'stale'
  | 'not_configured'
  | 'unavailable'
  | 'failed';

export interface ProviderSnapshotState {
  kind: ProviderSnapshotStateKind;
  label: string;
  detail: string;
  canUseAsMetric: boolean;
}

export interface SnapshotFreshnessOptions {
  now?: string;
  maxAgeDays?: number;
}

function isStale(capturedAt: string, now: string | undefined, maxAgeDays: number): boolean {
  const capturedAtMs = new Date(capturedAt).getTime();
  const nowMs = now ? new Date(now).getTime() : Date.now();
  return !Number.isNaN(capturedAtMs) && nowMs - capturedAtMs > maxAgeDays * 86_400_000;
}

function availabilityDetail(snapshot: ProviderSnapshot): string {
  const fields = [
    snapshot.promptCount == null ? undefined : `${snapshot.promptCount} prompts`,
    snapshot.runsPerPrompt == null ? undefined : `${snapshot.runsPerPrompt} runs per prompt`,
    snapshot.engineLabel,
  ].filter((value): value is string => Boolean(value));

  return fields.length > 0 ? fields.join(' · ') : 'Source data captured';
}

export function classifyProviderSnapshot(
  snapshot: ProviderSnapshot,
  options: SnapshotFreshnessOptions = {},
): ProviderSnapshotState {
  if (snapshot.status === 'not_configured') {
    return { kind: 'not_configured', label: 'Not connected', detail: 'No provider connection is configured', canUseAsMetric: false };
  }

  if (snapshot.status === 'unavailable') {
    return { kind: 'unavailable', label: 'Provider unavailable', detail: snapshot.error || 'The provider did not return data', canUseAsMetric: false };
  }

  if (snapshot.status === 'failed') {
    return { kind: 'failed', label: 'Fetch failed', detail: snapshot.error || 'The last provider request failed', canUseAsMetric: false };
  }

  const detail = availabilityDetail(snapshot);
  if (isStale(snapshot.capturedAt, options.now, options.maxAgeDays ?? 14)) {
    return { kind: 'stale', label: 'Stale source data', detail, canUseAsMetric: true };
  }

  return { kind: 'available', label: 'Source data available', detail, canUseAsMetric: true };
}

export interface SnapshotComparison {
  comparable: boolean;
  reason?: string;
}

export function canCompareProviderSnapshots(
  left: ProviderSnapshot,
  right: ProviderSnapshot,
): SnapshotComparison {
  if (left.status !== 'available' || right.status !== 'available') {
    return { comparable: false, reason: 'Both providers must have available data' };
  }

  if (left.clientId !== right.clientId) {
    return { comparable: false, reason: 'Clients differ' };
  }

  if (!left.promptSetFingerprint || !right.promptSetFingerprint) {
    return { comparable: false, reason: 'Prompt set is not verified' };
  }

  if (left.promptSetFingerprint !== right.promptSetFingerprint || left.promptCount !== right.promptCount) {
    return { comparable: false, reason: 'Prompt sets differ' };
  }

  if ((left.engineLabel || '') !== (right.engineLabel || '')) {
    return { comparable: false, reason: 'Engines differ' };
  }

  if ((left.runsPerPrompt || null) !== (right.runsPerPrompt || null)) {
    return { comparable: false, reason: 'Run counts differ' };
  }

  return { comparable: true };
}
