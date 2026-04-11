import { supabase } from '@/integrations/supabase/client';

export type RetestOrigin = 'dashboard_alert' | 'email_reminder' | 'manual_return' | 'unknown';

export type AnalyticsEventName =
  | 'diagnostic_completed'
  | 'report_viewed'
  | 'pdf_downloaded'
  | 'evolution_comparison_viewed'
  | 'action_plan_created'
  | 'action_plan_day_completed'
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
// Keeps track of recently fired events to prevent duplicates caused by
// re-renders, double-clicks, or component remounts within the same session.

/** Map of dedupKey → timestamp of last fire */
const recentEvents = new Map<string, number>();

/** Max entries before pruning old ones */
const MAX_CACHE = 500;

/**
 * Time windows (ms) per event type.
 * Events within the window with the same dedup key are silently dropped.
 * Events NOT listed here pass through without dedup (e.g. action_plan_day_completed).
 */
const DEDUP_WINDOWS: Partial<Record<AnalyticsEventName, number>> = {
  // Flow-unique events: one per diagnostic/module combination per session
  retest_started:              Infinity, // once per module per page session
  retest_completed:            Infinity, // once per diagnostic result
  // View/impression events: short cooldown to avoid re-render spam
  report_viewed:               30_000,   // 30s
  evolution_comparison_viewed: 30_000,
  premium_paywall_viewed:      30_000,
  // Click events: guard against rapid double-click
  premium_checkout_started:    10_000,   // 10s
  pdf_downloaded:              10_000,
};

/**
 * Build a composite dedup key from event params.
 * The key uniquely identifies "this specific occurrence" so that
 * the same logical action doesn't get counted twice.
 */
function buildDedupKey(opts: TrackEventOptions): string {
  if (opts.dedupKey) return opts.dedupKey;
  const parts = [opts.userId, opts.event];
  if (opts.moduleId) parts.push(opts.moduleId);
  if (opts.diagnosticResultId) parts.push(opts.diagnosticResultId);
  return parts.join('::');
}

/**
 * Returns true if the event should be dropped (duplicate).
 */
function isDuplicate(key: string, windowMs: number): boolean {
  const last = recentEvents.get(key);
  if (last == null) return false;
  if (windowMs === Infinity) return true; // already fired this session
  return Date.now() - last < windowMs;
}

/**
 * Prune oldest entries when cache exceeds MAX_CACHE.
 */
function pruneCache() {
  if (recentEvents.size <= MAX_CACHE) return;
  const entries = [...recentEvents.entries()].sort((a, b) => a[1] - b[1]);
  const toRemove = entries.slice(0, entries.length - MAX_CACHE);
  for (const [k] of toRemove) recentEvents.delete(k);
}

// ─── Public API ────────────────────────────────────────────

/**
 * Fire-and-forget telemetry event with built-in deduplication.
 * Never throws — silently drops on error so it never breaks user flow.
 */
export function trackEvent(opts: TrackEventOptions) {
  try {
    const { userId, event, moduleId, diagnosticResultId, metadata } = opts;
    const windowMs = DEDUP_WINDOWS[event];

    // If this event type has dedup enabled, check before inserting
    if (windowMs != null) {
      const key = buildDedupKey(opts);
      if (isDuplicate(key, windowMs)) return; // silently skip
      recentEvents.set(key, Date.now());
      pruneCache();
    }

    supabase
      .from('analytics_events' as any)
      .insert({
        user_id: userId,
        event_name: event,
        module_id: moduleId || null,
        diagnostic_result_id: diagnosticResultId || null,
        metadata: metadata || {},
      })
      .then(() => {});
  } catch {
    // silently ignore
  }
}
