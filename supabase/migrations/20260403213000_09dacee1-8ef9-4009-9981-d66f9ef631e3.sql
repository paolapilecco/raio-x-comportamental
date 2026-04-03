CREATE TABLE public.plan_change_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  previous_plan text NOT NULL,
  new_plan text NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view plan_change_history"
ON public.plan_change_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete plan_change_history"
ON public.plan_change_history
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));