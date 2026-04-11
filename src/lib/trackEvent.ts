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
}

/**
 * Fire-and-forget telemetry event.
 * Never throws — silently drops on error so it never breaks user flow.
 */
export function trackEvent({ userId, event, moduleId, diagnosticResultId, metadata }: TrackEventOptions) {
  try {
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
