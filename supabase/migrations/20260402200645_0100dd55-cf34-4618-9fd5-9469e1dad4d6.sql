
-- Restrict questions to authenticated users only
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;
CREATE POLICY "Authenticated users can view questions"
  ON public.questions FOR SELECT
  TO authenticated
  USING (true);
