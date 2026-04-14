/**
 * Meta Pixel custom events for remarketing audiences.
 * Fires only if `fbq` is available on the window (pixel script loaded externally).
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export type MetaEvent =
  | 'StartedTest'
  | 'CompletedTest'
  | 'CompletedTask1'
  | 'StoppedAfterTask1'
  | 'InactiveUser'
  | 'ViewedPremium'
  | 'StartedCheckout';

export function trackMetaEvent(event: MetaEvent, data?: Record<string, unknown>) {
  try {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('trackCustom', event, data || {});
    }
  } catch {
    // silently ignore
  }
}
