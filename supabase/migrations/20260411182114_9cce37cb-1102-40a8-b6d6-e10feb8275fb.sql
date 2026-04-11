-- Add nullable event_key column for backend deduplication
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS event_key text;

-- Unique partial index: only enforced when event_key is not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_events_event_key_unique
  ON public.analytics_events (event_key)
  WHERE event_key IS NOT NULL;