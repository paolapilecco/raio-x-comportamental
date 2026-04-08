-- Add is_active column to managed_persons
ALTER TABLE public.managed_persons
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Update count function to only count active persons
CREATE OR REPLACE FUNCTION public.count_managed_persons(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.managed_persons
  WHERE owner_id = _user_id
    AND is_active = true
$$;