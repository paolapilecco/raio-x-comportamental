import { useAuth, PLAN_LIMITS } from '@/contexts/AuthContext';

/**
 * Centralized subscription helper hook.
 * Derives convenience flags from AuthContext so pages don't repeat plan logic.
 */
export function useSubscription() {
  const { planType, subscription, isPremium, isSuperAdmin } = useAuth();

  const limits = PLAN_LIMITS[planType];
  const isStandard = planType === 'standard';
  const isPessoal = planType === 'pessoal';
  const isProfissional = planType === 'profissional';
  const hasMultiplePersons = !isStandard || isSuperAdmin;
  const hasAllTests = limits.allTests || isSuperAdmin;
  const maxPersons = isSuperAdmin ? 999 : limits.maxPersons;

  return {
    planType,
    subscription,
    isPremium,
    isSuperAdmin,
    isStandard,
    isPessoal,
    isProfissional,
    hasMultiplePersons,
    hasAllTests,
    maxPersons,
    limits,
    planLabel: limits.label,
  };
}
