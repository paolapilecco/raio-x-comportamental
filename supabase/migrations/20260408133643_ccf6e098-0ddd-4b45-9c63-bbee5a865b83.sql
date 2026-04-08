
-- 1. Create managed_persons table
CREATE TABLE public.managed_persons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  phone TEXT,
  birth_date DATE NOT NULL,
  age INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, cpf)
);

-- 2. Enable RLS
ALTER TABLE public.managed_persons ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "Users can view own managed_persons"
  ON public.managed_persons FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own managed_persons"
  ON public.managed_persons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own managed_persons"
  ON public.managed_persons FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own managed_persons"
  ON public.managed_persons FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- 4. Auto-calculate age trigger
CREATE TRIGGER calculate_managed_person_age
  BEFORE INSERT OR UPDATE ON public.managed_persons
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_age();

-- 5. Updated_at trigger
CREATE TRIGGER update_managed_persons_updated_at
  BEFORE UPDATE ON public.managed_persons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Add person_id to diagnostic_sessions
ALTER TABLE public.diagnostic_sessions
  ADD COLUMN person_id UUID REFERENCES public.managed_persons(id) ON DELETE SET NULL;

-- 7. Add phone to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 8. Function to count managed persons per user (for plan limits)
CREATE OR REPLACE FUNCTION public.count_managed_persons(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.managed_persons
  WHERE owner_id = _user_id
$$;

-- 9. Backfill: create managed_person for each existing profile
INSERT INTO public.managed_persons (owner_id, name, cpf, birth_date, phone)
SELECT p.user_id, p.name, p.cpf, p.birth_date, p.phone
FROM public.profiles p
WHERE p.cpf IS NOT NULL
  AND p.cpf != ''
ON CONFLICT (owner_id, cpf) DO NOTHING;

-- 10. Backfill: link existing sessions to backfilled managed_persons
UPDATE public.diagnostic_sessions ds
SET person_id = mp.id
FROM public.managed_persons mp
WHERE ds.user_id = mp.owner_id
  AND ds.person_id IS NULL;
