
-- Create action plan tracking table
CREATE TABLE public.action_plan_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  diagnostic_result_id UUID NOT NULL REFERENCES public.diagnostic_results(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  action_text TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicates
ALTER TABLE public.action_plan_tracking 
  ADD CONSTRAINT unique_plan_day UNIQUE (diagnostic_result_id, day_number);

-- Enable RLS
ALTER TABLE public.action_plan_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies: owner-scoped
CREATE POLICY "Users can view own action plans"
  ON public.action_plan_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own action plans"
  ON public.action_plan_tracking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own action plans"
  ON public.action_plan_tracking FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own action plans"
  ON public.action_plan_tracking FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_action_plan_user_result ON public.action_plan_tracking(user_id, diagnostic_result_id);
