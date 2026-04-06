
-- Function to update question_count on test_modules
CREATE OR REPLACE FUNCTION public.update_question_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update count for the affected test_module
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE public.test_modules
    SET question_count = (
      SELECT COUNT(*) FROM public.questions WHERE test_id = OLD.test_id
    )
    WHERE id = OLD.test_id;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.test_modules
    SET question_count = (
      SELECT COUNT(*) FROM public.questions WHERE test_id = NEW.test_id
    )
    WHERE id = NEW.test_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on questions table
CREATE TRIGGER trg_update_question_count
AFTER INSERT OR UPDATE OR DELETE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_question_count();

-- Sync existing counts
UPDATE public.test_modules tm
SET question_count = (
  SELECT COUNT(*) FROM public.questions q WHERE q.test_id = tm.id
);
