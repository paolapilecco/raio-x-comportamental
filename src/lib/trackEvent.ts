import { supabase } from '@/integrations/supabase/client';

export type RetestOrigin = 'dashboard_alert' | 'email_reminder' | 'manual_return' | 'unknown';

export type AnalyticsEventName =
  | 'diagnostic_completed'
  | 'report_viewed'
  | 'pdf_downloaded'
  | 'evolution_comparison_viewed'
  | 'action_plan_created'
  | 'action_plan_day_completed'
  | 'action_plan_task_completed'
  | 'action_plan_task_in_progress'
  | 'action_plan_task_not_started'
  | 'retest_alert_viewed'
  | 'retest_email_sent'
  | 'retest_started'
  | 'retest_completed'
  | 'premium_paywall_viewed'
  | 'premium_checkout_started'
  | 'premium_checkout_completed';

interface TrackEventOptions {
  userId: string;
  event: AnalyticsEventName;
  moduleId?: string | null;
  diagnosticResultId?: string | null;
  metadata?: Record<string, unknown>;
  /** Optional dedup key. If omitted, one is auto-generated from event + IDs. */
  dedupKey?: string;
}

// ─── Client-side deduplication ─────────────────────────────
/** Map of dedupKey → timestamp of last fire */
const recentEvents = new Map<string, number>();
const MAX_CACHE = 500;

const DEDUP_WINDOWS: Partial<Record<AnalyticsEventName, number>> = {
  retest_started:              Infinity,
  retest_completed:            Infinity,
  report_viewed:               30_000,
  evolution_comparison_viewed: 30_000,
  premium_paywall_viewed:      30_000,
  premium_checkout_started:    10_000,
  pdf_downloaded:              10_000,
};

function buildClientDedupKey(opts: TrackEventOptions): string {
  if (opts.dedupKey) return opts.dedupKey;
  const parts = [opts.userId, opts.event];
  if (opts.moduleId) parts.push(opts.moduleId);
  if (opts.diagnosticResultId) parts.push(opts.diagnosticResultId);
  return parts.join('::');
}

function isDuplicate(key: string, windowMs: number): boolean {
  const last = recentEvents.get(key);
  if (last == null) return false;
  if (windowMs === Infinity) return true;
  return Date.now() - last < windowMs;
}

function pruneCache() {
  if (recentEvents.size <= MAX_CACHE) return;
  const entries = [...recentEvents.entries()].sort((a, b) => a[1] - b[1]);
  const toRemove = entries.slice(0, entries.length - MAX_CACHE);
  for (const [k] of toRemove) recentEvents.delete(k);
}

// ─── Backend event_key generation ──────────────────────────
// Deterministic keys for critical events so the DB unique index rejects duplicates.

/** 5-minute time bucket for view/click events */
function timeBucket5m(): string {
  const now = Date.now();
  return String(Math.floor(now / (5 * 60 * 1000)));
}

/**
 * Events that need a backend event_key.
 * Returns null for events that don't need one (they insert without event_key).
 */
function buildEventKey(opts: TrackEventOptions): string | null {
  const { userId, event, moduleId, diagnosticResultId, metadata } = opts;

  switch (event) {
    case 'retest_started':
      // user + module + previous session + origin → one per retest flow
      return `rs::${userId}::${moduleId || ''}::${metadata?.previousSessionId || ''}::${metadata?.origin || ''}`;

    case 'retest_completed':
      // user + module + diagnostic result → one per completed retest
      return `rc::${userId}::${moduleId || ''}::${diagnosticResultId || ''}`;

    case 'report_viewed':
      // user + module + result + 5min window
      return `rv::${userId}::${moduleId || ''}::${diagnosticResultId || ''}::${timeBucket5m()}`;

    case 'evolution_comparison_viewed':
      // user + result + 5min window
      return `ecv::${userId}::${diagnosticResultId || ''}::${timeBucket5m()}`;

    case 'premium_paywall_viewed':
      // user + 5min window
      return `ppv::${userId}::${timeBucket5m()}`;

    case 'premium_checkout_started':
      // user + plan + billing + 5min window
      return `pcs::${userId}::${metadata?.plan || ''}::${metadata?.billingType || ''}::${timeBucket5m()}`;

    case 'pdf_downloaded':
      // user + result + 5min window
      return `pd::${userId}::${diagnosticResultId || ''}::${timeBucket5m()}`;

    case 'retest_email_sent':
      // user + module + session → one per email per session
      return `res::${userId}::${moduleId || ''}::${metadata?.session_id || metadata?.sessionId || ''}`;

    default:
      return null; // no backend dedup for other events
  }
}

// ─── Public API ────────────────────────────────────────────

/**
 * Fire-and-forget telemetry event with two-layer deduplication:
 * 1) Client-side memory cache (UI noise reduction)
 * 2) Backend unique event_key (analytical truth)
 * Never throws — silently drops on error so it never breaks user flow.
 */
export function trackEvent(opts: TrackEventOptions) {
  try {
    const { userId, event, moduleId, diagnosticResultId, metadata } = opts;
    const windowMs = DEDUP_WINDOWS[event];

    // Layer 1: client-side dedup
    if (windowMs != null) {
      const key = buildClientDedupKey(opts);
      if (isDuplicate(key, windowMs)) return;
      recentEvents.set(key, Date.now());
      pruneCache();
    }

    // Layer 2: build backend event_key (null for non-critical events)
    const eventKey = buildEventKey(opts);

    const row: Record<string, unknown> = {
      user_id: userId,
      event_name: event,
      module_id: moduleId || null,
      diagnostic_result_id: diagnosticResultId || null,
      metadata: metadata || {},
    };

    if (eventKey) {
      row.event_key = eventKey;
    }

    // Use upsert with ignoreDuplicates for events with event_key
    // For events without event_key, normal insert
    if (eventKey) {
      supabase
        .from('analytics_events' as any)
        .upsert(row as any, { onConflict: 'event_key', ignoreDuplicates: true })
        .then(() => {});
    } else {
      supabase
        .from('analytics_events' as any)
        .insert(row as any)
        .then(() => {});
    }
  } catch {
    // silently ignore
  }
}
