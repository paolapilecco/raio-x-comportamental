CREATE POLICY "Users can update own results"
  ON public.diagnostic_results FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM diagnostic_sessions ds
    WHERE ds.id = diagnostic_results.session_id AND ds.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM diagnostic_sessions ds
    WHERE ds.id = diagnostic_results.session_id AND ds.user_id = auth.uid()
  ));