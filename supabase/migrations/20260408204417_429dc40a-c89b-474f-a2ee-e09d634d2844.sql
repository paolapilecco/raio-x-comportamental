
-- Drop the overly permissive anon policy
DROP POLICY "Anyone can view pending invites by token" ON public.test_invites;

-- Create a more restrictive policy using a function
-- Since anon can't filter by token in RLS directly (no request context),
-- we'll handle this differently: remove anon SELECT entirely and
-- use the edge function (service role) to validate tokens server-side.
-- The PublicTest page will call the edge function instead of querying directly.
