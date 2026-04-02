-- profiles: restrict DELETE to owner
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = user_id);

-- user_profile: restrict DELETE to owner
CREATE POLICY "Users can delete own user_profile"
  ON public.user_profile FOR DELETE
  USING (auth.uid() = user_id);

-- user_central_profile: restrict DELETE to owner
CREATE POLICY "Users can delete own central profile"
  ON public.user_central_profile FOR DELETE
  USING (auth.uid() = user_id);

-- diagnostic_answers: restrict DELETE to session owner
CREATE POLICY "Users can delete own answers"
  ON public.diagnostic_answers FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM diagnostic_sessions ds
    WHERE ds.id = diagnostic_answers.session_id AND ds.user_id = auth.uid()
  ));

-- diagnostic_results: restrict DELETE to session owner
CREATE POLICY "Users can delete own results"
  ON public.diagnostic_results FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM diagnostic_sessions ds
    WHERE ds.id = diagnostic_results.session_id AND ds.user_id = auth.uid()
  ));

-- diagnostic_sessions: restrict DELETE to owner
CREATE POLICY "Users can delete own sessions"
  ON public.diagnostic_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- test_results: restrict DELETE to owner
CREATE POLICY "Users can delete own test results"
  ON public.test_results FOR DELETE
  USING (auth.uid() = user_id);
