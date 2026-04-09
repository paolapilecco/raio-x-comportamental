-- Email send logs table
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resend_id TEXT,
  error_message TEXT,
  template_data JSONB DEFAULT '{}'::jsonb,
  sent_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view logs
CREATE POLICY "Super admins can view email_logs"
  ON public.email_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Only super admins can insert logs (via edge function with service role)
CREATE POLICY "Super admins can insert email_logs"
  ON public.email_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Allow service role insert (edge functions use service role key)
CREATE POLICY "Service role can insert email_logs"
  ON public.email_logs FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select email_logs"
  ON public.email_logs FOR SELECT TO service_role
  USING (true);

-- Index for fast queries
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_logs_template ON public.email_logs(template_name);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);