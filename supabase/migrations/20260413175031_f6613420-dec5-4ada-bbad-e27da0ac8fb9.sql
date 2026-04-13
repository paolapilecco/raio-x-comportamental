ALTER TABLE public.action_plan_tracking ADD COLUMN IF NOT EXISTS gatilho text NOT NULL DEFAULT '';
ALTER TABLE public.action_plan_tracking ADD COLUMN IF NOT EXISTS acao text NOT NULL DEFAULT '';