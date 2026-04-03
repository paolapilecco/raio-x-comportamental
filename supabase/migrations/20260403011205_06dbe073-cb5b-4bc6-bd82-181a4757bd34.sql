
-- Prompt change history table
CREATE TABLE public.prompt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES public.test_prompts(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.test_modules(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL,
  old_content TEXT NOT NULL,
  new_content TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view prompt_history" ON public.prompt_history FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete prompt_history" ON public.prompt_history FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'));
-- Insert via trigger (SECURITY DEFINER), so no INSERT policy needed for users

-- Trigger function to auto-log changes
CREATE OR REPLACE FUNCTION public.log_prompt_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO public.prompt_history (prompt_id, test_id, prompt_type, old_content, new_content, changed_by)
    VALUES (NEW.id, NEW.test_id, NEW.prompt_type::TEXT, OLD.content, NEW.content, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_prompt_change
AFTER UPDATE ON public.test_prompts
FOR EACH ROW
EXECUTE FUNCTION public.log_prompt_change();

-- Index for efficient queries
CREATE INDEX idx_prompt_history_prompt_id ON public.prompt_history (prompt_id);
CREATE INDEX idx_prompt_history_test_id ON public.prompt_history (test_id);
