
ALTER TABLE public.diagnostic_results
  ADD COLUMN IF NOT EXISTS core_pain text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS key_unlock_area text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS critical_diagnosis text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS impact text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS what_not_to_do text[] NOT NULL DEFAULT '{}'::text[];
