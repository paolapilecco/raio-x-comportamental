
-- Create enum for prompt types
CREATE TYPE public.prompt_type AS ENUM (
  'interpretation', 'diagnosis', 'profile', 'core_pain', 'triggers', 'direction', 'restrictions'
);

-- Create test_prompts table
CREATE TABLE public.test_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.test_modules(id) ON DELETE CASCADE,
  prompt_type public.prompt_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (test_id, prompt_type)
);

-- Enable RLS
ALTER TABLE public.test_prompts ENABLE ROW LEVEL SECURITY;

-- Only super admins can access
CREATE POLICY "Super admins can view test_prompts"
ON public.test_prompts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert test_prompts"
ON public.test_prompts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update test_prompts"
ON public.test_prompts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete test_prompts"
ON public.test_prompts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Auto-update timestamp
CREATE TRIGGER update_test_prompts_updated_at
BEFORE UPDATE ON public.test_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate data from admin_prompts (map old contexts to new prompt_type)
INSERT INTO public.test_prompts (test_id, prompt_type, title, content, is_active)
SELECT 
  test_module_id,
  CASE context
    WHEN 'prompt_base' THEN 'interpretation'::prompt_type
    WHEN 'prompt_diagnostic' THEN 'diagnosis'::prompt_type
    WHEN 'prompt_profile' THEN 'profile'::prompt_type
    WHEN 'prompt_core_pain' THEN 'core_pain'::prompt_type
    WHEN 'prompt_triggers' THEN 'triggers'::prompt_type
    WHEN 'prompt_direction' THEN 'direction'::prompt_type
    WHEN 'prompt_restrictions' THEN 'restrictions'::prompt_type
  END,
  label,
  prompt_text,
  is_active
FROM admin_prompts
WHERE test_module_id IS NOT NULL
  AND context IN ('prompt_base', 'prompt_diagnostic', 'prompt_profile', 'prompt_core_pain', 'prompt_triggers', 'prompt_direction', 'prompt_restrictions')
ON CONFLICT (test_id, prompt_type) DO NOTHING;

-- Index for fast lookups
CREATE INDEX idx_test_prompts_test_id ON public.test_prompts(test_id);
