
CREATE TABLE public.prompt_generation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL,
  section_type TEXT NOT NULL,
  generated_content TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'generated',
  generated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_generation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view prompt_generation_history"
  ON public.prompt_generation_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert prompt_generation_history"
  ON public.prompt_generation_history FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete prompt_generation_history"
  ON public.prompt_generation_history FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));
