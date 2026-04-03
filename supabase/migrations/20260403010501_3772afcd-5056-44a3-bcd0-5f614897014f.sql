
-- Global AI config (single row)
CREATE TABLE public.global_ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_enabled BOOLEAN NOT NULL DEFAULT true,
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 2000,
  tone TEXT NOT NULL DEFAULT 'empático e direto',
  depth_level INTEGER NOT NULL DEFAULT 3,
  report_style TEXT NOT NULL DEFAULT 'narrativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view global_ai_config" ON public.global_ai_config FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can insert global_ai_config" ON public.global_ai_config FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update global_ai_config" ON public.global_ai_config FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete global_ai_config" ON public.global_ai_config FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Insert default global config
INSERT INTO public.global_ai_config (ai_enabled, temperature, max_tokens, tone, depth_level, report_style) 
VALUES (true, 0.7, 2000, 'empático e direto', 3, 'narrativo');

-- Per-test AI config
CREATE TABLE public.test_ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.test_modules(id) ON DELETE CASCADE,
  use_global_defaults BOOLEAN NOT NULL DEFAULT true,
  ai_enabled BOOLEAN NOT NULL DEFAULT true,
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 2000,
  tone TEXT NOT NULL DEFAULT 'empático e direto',
  depth_level INTEGER NOT NULL DEFAULT 3,
  report_style TEXT NOT NULL DEFAULT 'narrativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(test_id)
);

ALTER TABLE public.test_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view test_ai_config" ON public.test_ai_config FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can insert test_ai_config" ON public.test_ai_config FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update test_ai_config" ON public.test_ai_config FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete test_ai_config" ON public.test_ai_config FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Triggers for updated_at
CREATE TRIGGER update_global_ai_config_updated_at BEFORE UPDATE ON public.global_ai_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_test_ai_config_updated_at BEFORE UPDATE ON public.test_ai_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
