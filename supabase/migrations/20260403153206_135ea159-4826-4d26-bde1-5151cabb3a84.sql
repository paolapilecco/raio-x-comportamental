
CREATE TABLE public.roadmap_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.roadmap_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view roadmap_tasks"
  ON public.roadmap_tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert roadmap_tasks"
  ON public.roadmap_tasks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update roadmap_tasks"
  ON public.roadmap_tasks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete roadmap_tasks"
  ON public.roadmap_tasks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DROP TRIGGER IF EXISTS trg_updated_at_roadmap_tasks ON public.roadmap_tasks;
CREATE TRIGGER trg_updated_at_roadmap_tasks
  BEFORE UPDATE ON public.roadmap_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_tasks;
