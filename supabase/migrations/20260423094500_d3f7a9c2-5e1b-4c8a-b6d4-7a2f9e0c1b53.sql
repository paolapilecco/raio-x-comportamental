-- profiles only had a "user views own row" SELECT policy — no bypass for super_admin. This is
-- not a security hole (RLS was, if anything, too restrictive), but it silently breaks
-- AdminSubscriptions.tsx, which selects profiles.user_id/name to label other users' subscriptions:
-- a super_admin querying this table only ever gets their own row back, so every other user's
-- name renders blank in that screen.
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
