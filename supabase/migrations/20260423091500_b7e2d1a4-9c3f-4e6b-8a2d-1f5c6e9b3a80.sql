-- subscriptions.plan_type was added as free text (no enum, no CHECK) — the app's PlanType union
-- ('standard' | 'pessoal' | 'profissional') was only ever enforced client-side via an unchecked
-- cast (AuthContext.tsx). A stray value written by any future process would silently break
-- PLAN_LIMITS[planType] lookups on the client. Lock the column down to the three values the
-- app actually understands.
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_plan_type_check
CHECK (plan_type IN ('standard', 'pessoal', 'profissional'));
