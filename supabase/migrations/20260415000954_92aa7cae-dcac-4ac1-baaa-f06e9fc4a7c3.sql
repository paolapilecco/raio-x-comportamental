-- Add question metadata columns for enhanced diagnostic system
ALTER TABLE public.questions 
  ADD COLUMN IF NOT EXISTS question_category text DEFAULT 'situational',
  ADD COLUMN IF NOT EXISTS mirror_pair_id uuid REFERENCES public.questions(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_counterproof boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS emotional_context text DEFAULT NULL;

-- Add constraint for question_category values
-- Using a validation trigger instead of CHECK for flexibility
CREATE OR REPLACE FUNCTION public.validate_question_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.question_category NOT IN ('situational', 'indirect', 'forced_choice', 'emotional', 'behavioral', 'mirror', 'counterproof') THEN
    RAISE EXCEPTION 'Invalid question_category: %', NEW.question_category;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_question_category ON public.questions;
CREATE TRIGGER trg_validate_question_category
  BEFORE INSERT OR UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.validate_question_category();

-- Add diagnostic confidence and temperament fields to diagnostic_results
ALTER TABLE public.diagnostic_results
  ADD COLUMN IF NOT EXISTS confidence_level text DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS confidence_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consistency_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS temperament_traits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS self_deception_index integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contradiction_count integer DEFAULT 0;

-- Add enhanced fields to user_central_profile 
ALTER TABLE public.user_central_profile
  ADD COLUMN IF NOT EXISTS temperament_profile jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS avg_confidence_level text DEFAULT 'media';