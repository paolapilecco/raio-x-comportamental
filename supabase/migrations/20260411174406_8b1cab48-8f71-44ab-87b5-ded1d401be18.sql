
CREATE TABLE public.retest_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retest_enabled boolean NOT NULL DEFAULT true,
  retest_days_threshold integer NOT NULL DEFAULT 15,
  dashboard_alert_enabled boolean NOT NULL DEFAULT true,
  email_reminder_enabled boolean NOT NULL DEFAULT true,
  email_subject text NOT NULL DEFAULT 'Sua análise já está desatualizada',
  email_heading text NOT NULL DEFAULT 'Seu padrão continua ativo.',
  email_body_intro text NOT NULL DEFAULT 'Seu último resultado ainda define seu comportamento atual. Nada indica que isso mudou.',
  email_body_cta text NOT NULL DEFAULT 'Refaça sua análise e veja se você evoluiu ou só adiou.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.retest_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view retest_config" ON public.retest_config FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admins can insert retest_config" ON public.retest_config FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admins can update retest_config" ON public.retest_config FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admins can delete retest_config" ON public.retest_config FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_retest_config_updated_at BEFORE UPDATE ON public.retest_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row
INSERT INTO public.retest_config (retest_enabled, retest_days_threshold, dashboard_alert_enabled, email_reminder_enabled) VALUES (true, 15, true, true);
