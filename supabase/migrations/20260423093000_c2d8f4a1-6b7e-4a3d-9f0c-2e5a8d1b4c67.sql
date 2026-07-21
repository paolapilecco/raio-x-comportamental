-- 'profissional' was mistakenly added to the subscription_plan enum (billing cycle: monthly/yearly)
-- instead of to plan_type (plan tier: standard/pessoal/profissional) — see migration
-- 20260408142247_8a1874f8-1430-4636-a1b4-cd6527e0bacc.sql. Postgres has no DROP VALUE for enums,
-- so the stray label can't be removed from the type without recreating it. Add a CHECK on the
-- column itself so the app can never actually write that value into subscriptions.plan, even
-- though the enum technically still allows it.
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_plan_billing_cycle_check
CHECK (plan IN ('monthly', 'yearly'));

COMMENT ON TYPE public.subscription_plan IS
  'Billing cycle only (monthly/yearly). The ''profissional'' value was added by mistake in migration 20260408142247 and must never be used — plan tier (standard/pessoal/profissional) lives in subscriptions.plan_type instead. Enforced by subscriptions_plan_billing_cycle_check.';
