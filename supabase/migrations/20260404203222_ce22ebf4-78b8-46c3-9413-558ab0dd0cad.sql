-- Drop the existing overly permissive INSERT policy
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;

-- Create a restrictive INSERT policy - only super_admins
CREATE POLICY "Only super admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Also ensure service_role can insert (for webhooks/triggers)
-- This is handled by default since service_role bypasses RLS