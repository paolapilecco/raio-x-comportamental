
-- Add notes column to action_plan_tracking for per-action annotations
ALTER TABLE public.action_plan_tracking ADD COLUMN notes text NOT NULL DEFAULT '';

-- Create progress AI feedback table for storing AI-generated progress readings
CREATE TABLE public.progress_ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  diagnostic_result_id uuid NOT NULL REFERENCES public.diagnostic_results(id) ON DELETE CASCADE,
  test_module_id uuid NOT NULL,
  feedback_text text NOT NULL DEFAULT '',
  actions_completed integer NOT NULL DEFAULT 0,
  actions_total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON public.progress_ai_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.progress_ai_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback"
  ON public.progress_ai_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
