ALTER TABLE public.user_central_profile 
ADD COLUMN IF NOT EXISTS behavioral_tendencies jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS behavioral_memory jsonb DEFAULT '{}'::jsonb;