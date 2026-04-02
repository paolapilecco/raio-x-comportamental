
-- Update the auto-assign trigger to use super_admin
CREATE OR REPLACE FUNCTION public.assign_admin_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IN ('paolabem@gmail.com', 'trafegocomkrisan@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Convert existing admin roles for those emails to super_admin
UPDATE public.user_roles
SET role = 'super_admin'
WHERE role = 'admin'
  AND user_id IN (
    SELECT id FROM auth.users WHERE email IN ('paolabem@gmail.com', 'trafegocomkrisan@gmail.com')
  );

-- Update RLS policy on user_roles to let super_admins manage roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin')
);
