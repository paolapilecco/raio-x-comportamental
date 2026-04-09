CREATE POLICY "Service role can update email_logs"
  ON public.email_logs FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);