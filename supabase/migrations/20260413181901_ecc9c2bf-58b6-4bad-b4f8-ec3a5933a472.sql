
DO $$
DECLARE
  uid uuid := 'e4dafc21-4600-425d-8026-42ed14e06010';
  session_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO session_ids FROM public.diagnostic_sessions WHERE user_id = uid;
  DELETE FROM public.action_plan_tracking WHERE user_id = uid;
  DELETE FROM public.progress_ai_feedback WHERE user_id = uid;
  DELETE FROM public.analytics_events WHERE user_id = uid;
  IF session_ids IS NOT NULL THEN
    DELETE FROM public.diagnostic_results WHERE session_id = ANY(session_ids);
    DELETE FROM public.diagnostic_answers WHERE session_id = ANY(session_ids);
  END IF;
  DELETE FROM public.diagnostic_sessions WHERE user_id = uid;
  DELETE FROM public.user_central_profile WHERE user_id = uid;
  DELETE FROM public.user_profile WHERE user_id = uid;
  DELETE FROM public.test_usage WHERE user_id = uid;
END $$;
