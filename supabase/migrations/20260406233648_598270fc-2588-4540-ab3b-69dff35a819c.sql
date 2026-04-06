CREATE TABLE public.pattern_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_module_id uuid REFERENCES public.test_modules(id) ON DELETE CASCADE,
  pattern_key text NOT NULL,
  label text NOT NULL,
  profile_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  mechanism text NOT NULL DEFAULT '',
  mental_state text NOT NULL DEFAULT '',
  core_pain text NOT NULL DEFAULT '',
  key_unlock_area text NOT NULL DEFAULT '',
  critical_diagnosis text NOT NULL DEFAULT '',
  what_not_to_do text[] NOT NULL DEFAULT '{}',
  triggers text[] NOT NULL DEFAULT '{}',
  mental_traps text[] NOT NULL DEFAULT '{}',
  self_sabotage_cycle text[] NOT NULL DEFAULT '{}',
  blocking_point text NOT NULL DEFAULT '',
  contradiction text NOT NULL DEFAULT '',
  impact text NOT NULL DEFAULT '',
  direction text NOT NULL DEFAULT '',
  life_impact jsonb NOT NULL DEFAULT '[]',
  exit_strategy jsonb NOT NULL DEFAULT '[]',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(test_module_id, pattern_key)
);

ALTER TABLE public.pattern_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pattern_definitions"
  ON public.pattern_definitions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can insert pattern_definitions"
  ON public.pattern_definitions FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update pattern_definitions"
  ON public.pattern_definitions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete pattern_definitions"
  ON public.pattern_definitions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_pattern_definitions_updated_at
  BEFORE UPDATE ON public.pattern_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();