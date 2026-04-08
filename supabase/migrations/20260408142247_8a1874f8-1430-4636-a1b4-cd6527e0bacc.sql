
-- 1. Add 'profissional' to subscription_plan enum
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'profissional';

-- 2. Add plan_type column to subscriptions to differentiate Pessoal vs Profissional
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'pessoal';

-- 3. Create test_usage table to track monthly test limits
CREATE TABLE IF NOT EXISTS public.test_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_id uuid REFERENCES public.managed_persons(id) ON DELETE CASCADE,
  test_module_id uuid NOT NULL,
  month_year text NOT NULL, -- format: "2026-04"
  usage_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(person_id, test_module_id, month_year)
);

ALTER TABLE public.test_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own test_usage"
  ON public.test_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test_usage"
  ON public.test_usage FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test_usage"
  ON public.test_usage FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 4. Create invites table
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(inviter_id, email)
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invites"
  ON public.invites FOR SELECT TO authenticated
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can insert own invites"
  ON public.invites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update own invites"
  ON public.invites FOR UPDATE TO authenticated
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can delete own invites"
  ON public.invites FOR DELETE TO authenticated
  USING (auth.uid() = inviter_id);

-- 5. Add invited_by to managed_persons for tracking
ALTER TABLE public.managed_persons 
ADD COLUMN IF NOT EXISTS invited_by uuid;

-- 6. Function to check test usage limit
CREATE OR REPLACE FUNCTION public.get_test_usage_count(
  _person_id uuid,
  _test_module_id uuid,
  _month_year text
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(usage_count, 0)
  FROM public.test_usage
  WHERE person_id = _person_id
    AND test_module_id = _test_module_id
    AND month_year = _month_year
  LIMIT 1
$$;

-- 7. Function to increment test usage
CREATE OR REPLACE FUNCTION public.increment_test_usage(
  _user_id uuid,
  _person_id uuid,
  _test_module_id uuid,
  _month_year text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  INSERT INTO public.test_usage (user_id, person_id, test_module_id, month_year, usage_count)
  VALUES (_user_id, _person_id, _test_module_id, _month_year, 1)
  ON CONFLICT (person_id, test_module_id, month_year)
  DO UPDATE SET usage_count = test_usage.usage_count + 1, updated_at = now()
  RETURNING usage_count INTO current_count;
  
  RETURN current_count;
END;
$$;
