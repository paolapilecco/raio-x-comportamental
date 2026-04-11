
-- Create analytics_events table
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  module_id UUID REFERENCES public.test_modules(id) ON DELETE SET NULL,
  diagnostic_result_id UUID REFERENCES public.diagnostic_results(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can insert own events
CREATE POLICY "Users can insert own analytics events"
  ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view own events
CREATE POLICY "Users can view own analytics events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Super admins can view all events
CREATE POLICY "Super admins can view all analytics events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Service role can insert events (for edge functions)
CREATE POLICY "Service role can insert analytics events"
  ON public.analytics_events FOR INSERT TO service_role
  WITH CHECK (true);

-- Service role can view events
CREATE POLICY "Service role can select analytics events"
  ON public.analytics_events FOR SELECT TO service_role
  USING (true);

-- Indexes for fast queries
CREATE INDEX idx_analytics_events_user ON public.analytics_events (user_id);
CREATE INDEX idx_analytics_events_name ON public.analytics_events (event_name);
CREATE INDEX idx_analytics_events_created ON public.analytics_events (created_at DESC);
CREATE INDEX idx_analytics_events_module ON public.analytics_events (module_id) WHERE module_id IS NOT NULL;
