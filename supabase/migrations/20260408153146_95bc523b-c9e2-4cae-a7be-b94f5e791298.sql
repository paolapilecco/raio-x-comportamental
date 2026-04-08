
-- Professional notes table (therapist notes per patient per session)
CREATE TABLE public.professional_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  person_id UUID NOT NULL REFERENCES public.managed_persons(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.diagnostic_sessions(id) ON DELETE SET NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON public.professional_notes FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own notes" ON public.professional_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own notes" ON public.professional_notes FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own notes" ON public.professional_notes FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER update_professional_notes_updated_at BEFORE UPDATE ON public.professional_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Retest reminders table
CREATE TABLE public.retest_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  person_id UUID NOT NULL REFERENCES public.managed_persons(id) ON DELETE CASCADE,
  test_module_id UUID REFERENCES public.test_modules(id) ON DELETE SET NULL,
  remind_at DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.retest_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders" ON public.retest_reminders FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own reminders" ON public.retest_reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own reminders" ON public.retest_reminders FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own reminders" ON public.retest_reminders FOR DELETE TO authenticated USING (auth.uid() = owner_id);
