
-- Add test_module_id column
ALTER TABLE public.admin_prompts 
ADD COLUMN test_module_id UUID REFERENCES public.test_modules(id) ON DELETE CASCADE;

-- Drop old unique constraint on context alone
ALTER TABLE public.admin_prompts DROP CONSTRAINT IF EXISTS admin_prompts_context_key;

-- Add new unique constraint: context + test_module_id (allows same context for different modules)
CREATE UNIQUE INDEX admin_prompts_context_module_idx ON public.admin_prompts (context, COALESCE(test_module_id, '00000000-0000-0000-0000-000000000000'));
