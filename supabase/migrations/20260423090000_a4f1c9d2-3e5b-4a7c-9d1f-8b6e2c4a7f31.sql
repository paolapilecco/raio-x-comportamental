-- Persist tarefasEstrategicas and their validation outcome on every diagnostic_results row.
-- Today, when the AI's strategic actions are rejected by analyze-test's validation (soft-fail
-- after 4 attempts), the "Plano estratégico" section silently disappears from the report and
-- nothing is queryable afterwards to explain why. These columns make that outcome inspectable.
ALTER TABLE public.diagnostic_results
ADD COLUMN IF NOT EXISTS tarefas_estrategicas jsonb,
ADD COLUMN IF NOT EXISTS tarefas_validation jsonb;
