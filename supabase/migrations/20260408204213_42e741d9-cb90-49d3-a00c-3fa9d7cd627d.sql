
-- Allow anon to read questions (needed for public test page)
CREATE POLICY "Anon can view questions"
  ON public.questions FOR SELECT
  TO anon
  USING (true);
