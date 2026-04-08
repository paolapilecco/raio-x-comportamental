
-- Table for public test invite links
CREATE TABLE public.test_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  owner_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.managed_persons(id) ON DELETE CASCADE,
  test_module_id uuid NOT NULL REFERENCES public.test_modules(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_session_id uuid REFERENCES public.diagnostic_sessions(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.test_invites ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own invites
CREATE POLICY "Owners can view own invites"
  ON public.test_invites FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert own invites"
  ON public.test_invites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own invites"
  ON public.test_invites FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own invites"
  ON public.test_invites FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Anonymous users can read pending invites by token (for public test page)
CREATE POLICY "Anyone can view pending invites by token"
  ON public.test_invites FOR SELECT
  TO anon
  USING (status = 'pending' AND expires_at > now());

-- Index for fast token lookup
CREATE INDEX idx_test_invites_token ON public.test_invites(token);
CREATE INDEX idx_test_invites_person ON public.test_invites(person_id, test_module_id);
