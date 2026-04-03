-- Skip auth.users triggers (already exist)
-- Create remaining triggers with IF NOT EXISTS pattern

-- Calculate age from birth_date
DROP TRIGGER IF EXISTS trg_calculate_age ON public.profiles;
CREATE TRIGGER trg_calculate_age
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_age();

-- Auto-update updated_at timestamps
DROP TRIGGER IF EXISTS trg_updated_at_profiles ON public.profiles;
CREATE TRIGGER trg_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_admin_prompts ON public.admin_prompts;
CREATE TRIGGER trg_updated_at_admin_prompts
  BEFORE UPDATE ON public.admin_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_global_ai_config ON public.global_ai_config;
CREATE TRIGGER trg_updated_at_global_ai_config
  BEFORE UPDATE ON public.global_ai_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_test_ai_config ON public.test_ai_config;
CREATE TRIGGER trg_updated_at_test_ai_config
  BEFORE UPDATE ON public.test_ai_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_test_prompts ON public.test_prompts;
CREATE TRIGGER trg_updated_at_test_prompts
  BEFORE UPDATE ON public.test_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_user_central_profile ON public.user_central_profile;
CREATE TRIGGER trg_updated_at_user_central_profile
  BEFORE UPDATE ON public.user_central_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();