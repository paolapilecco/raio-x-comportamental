-- Add INSERT, UPDATE, DELETE policies for test_modules (super_admins only)
CREATE POLICY "Super admins can insert test_modules"
ON public.test_modules
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update test_modules"
ON public.test_modules
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete test_modules"
ON public.test_modules
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));