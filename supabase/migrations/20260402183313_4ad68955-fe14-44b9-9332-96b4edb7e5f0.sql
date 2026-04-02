
-- Test modules catalog
CREATE TABLE public.test_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'behavioral',
  icon TEXT NOT NULL DEFAULT 'brain',
  question_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.test_modules ENABLE ROW LEVEL SECURITY;

-- Everyone can read active test modules
CREATE POLICY "Anyone can view active test modules"
  ON public.test_modules FOR SELECT
  USING (is_active = true);

-- Add test_module_id to diagnostic_sessions (nullable for backward compat)
ALTER TABLE public.diagnostic_sessions
  ADD COLUMN test_module_id UUID REFERENCES public.test_modules(id);

-- User central profile (unified across all tests)
CREATE TABLE public.user_central_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  dominant_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  aggregated_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  tests_completed INTEGER NOT NULL DEFAULT 0,
  mental_state TEXT,
  core_pain TEXT,
  key_unlock_area TEXT,
  profile_name TEXT,
  last_test_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_central_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own central profile"
  ON public.user_central_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own central profile"
  ON public.user_central_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own central profile"
  ON public.user_central_profile FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_central_profile_updated_at
  BEFORE UPDATE ON public.user_central_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the current behavioral pattern test as the first module
INSERT INTO public.test_modules (slug, name, description, category, icon, question_count, sort_order)
VALUES (
  'behavioral-pattern',
  'Padrão Comportamental',
  'Identifica seu padrão dominante de funcionamento, mecanismos de autossabotagem e ponto de travamento.',
  'behavioral',
  'brain',
  24,
  1
);
