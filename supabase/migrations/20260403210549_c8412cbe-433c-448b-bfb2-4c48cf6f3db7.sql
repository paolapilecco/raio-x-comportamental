-- Create the trigger that was missing on test_prompts
CREATE TRIGGER trigger_log_prompt_change
  BEFORE UPDATE ON public.test_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_prompt_change();