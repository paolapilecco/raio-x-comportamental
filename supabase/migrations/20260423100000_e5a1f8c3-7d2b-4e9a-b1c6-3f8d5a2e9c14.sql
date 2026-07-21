-- One-off: grant an active "pessoal" subscription to a single local test account
-- (trafegocomkrisan+assinante@gmail.com, user_id below), created to test the full
-- subscriber experience on localhost without touching any existing account.
-- Mirrors exactly what admin-users/index.ts's "set_plan" action does server-side.
-- Scoped to this one user_id only — safe to delete this test account/rows later.

INSERT INTO public.user_roles (user_id, role)
VALUES ('cf260692-c8b6-455f-9970-085ee96748da', 'premium')
ON CONFLICT DO NOTHING;

INSERT INTO public.subscriptions (user_id, plan, plan_type, status, billing_type, value)
VALUES ('cf260692-c8b6-455f-9970-085ee96748da', 'monthly', 'pessoal', 'active', 'TEST', 9.99)
ON CONFLICT DO NOTHING;
