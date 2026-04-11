CREATE OR REPLACE FUNCTION public.get_public_retest_config()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT json_build_object(
      'retest_enabled', retest_enabled,
      'retest_days_threshold', retest_days_threshold,
      'dashboard_alert_enabled', dashboard_alert_enabled,
      'email_reminder_enabled', email_reminder_enabled
    )
    FROM public.retest_config
    LIMIT 1),
    json_build_object(
      'retest_enabled', true,
      'retest_days_threshold', 15,
      'dashboard_alert_enabled', true,
      'email_reminder_enabled', true
    )
  )
$$;