-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('pending', 'active', 'overdue', 'canceled', 'expired');

-- Create subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('monthly', 'yearly');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asaas_customer_id TEXT,
  asaas_subscription_id TEXT,
  plan subscription_plan NOT NULL DEFAULT 'monthly',
  status subscription_status NOT NULL DEFAULT 'pending',
  billing_type TEXT NOT NULL DEFAULT 'PIX',
  value NUMERIC(10,2) NOT NULL DEFAULT 0,
  next_due_date DATE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Super admins can view all subscriptions
CREATE POLICY "Super admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- No direct INSERT/UPDATE/DELETE for regular users (managed via edge functions with service role)

-- Super admins can manage subscriptions
CREATE POLICY "Super admins can insert subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete subscriptions"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();