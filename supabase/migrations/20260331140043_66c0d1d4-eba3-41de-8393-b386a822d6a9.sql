
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  age INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create diagnostic_sessions table
CREATE TABLE public.diagnostic_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.diagnostic_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.diagnostic_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.diagnostic_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.diagnostic_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Create diagnostic_answers table
CREATE TABLE public.diagnostic_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.diagnostic_sessions(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  answer_value INTEGER NOT NULL CHECK (answer_value >= 1 AND answer_value <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnostic_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own answers" ON public.diagnostic_answers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.diagnostic_sessions ds WHERE ds.id = session_id AND ds.user_id = auth.uid()));
CREATE POLICY "Users can insert own answers" ON public.diagnostic_answers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.diagnostic_sessions ds WHERE ds.id = session_id AND ds.user_id = auth.uid()));

-- Create diagnostic_results table
CREATE TABLE public.diagnostic_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE REFERENCES public.diagnostic_sessions(id) ON DELETE CASCADE,
  dominant_pattern TEXT NOT NULL,
  secondary_patterns TEXT[] DEFAULT '{}',
  intensity TEXT NOT NULL,
  profile_name TEXT NOT NULL,
  mental_state TEXT NOT NULL,
  state_summary TEXT NOT NULL,
  mechanism TEXT NOT NULL,
  triggers TEXT[] DEFAULT '{}',
  traps TEXT[] DEFAULT '{}',
  self_sabotage_cycle TEXT[] DEFAULT '{}',
  blocking_point TEXT NOT NULL,
  contradiction TEXT NOT NULL,
  life_impact JSONB DEFAULT '[]',
  exit_strategy JSONB DEFAULT '[]',
  all_scores JSONB DEFAULT '[]',
  direction TEXT NOT NULL,
  combined_title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own results" ON public.diagnostic_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.diagnostic_sessions ds WHERE ds.id = session_id AND ds.user_id = auth.uid()));
CREATE POLICY "Users can insert own results" ON public.diagnostic_results FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.diagnostic_sessions ds WHERE ds.id = session_id AND ds.user_id = auth.uid()));

-- Trigger for updating profiles.updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-calculate age on profile insert/update
CREATE OR REPLACE FUNCTION public.calculate_age()
RETURNS TRIGGER AS $$
BEGIN
  NEW.age = EXTRACT(YEAR FROM age(NEW.birth_date));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER calculate_profile_age
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.calculate_age();
