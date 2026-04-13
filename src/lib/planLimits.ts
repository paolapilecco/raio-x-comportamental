import { PlanType, PLAN_LIMITS } from '@/contexts/AuthContext';

const BEHAVIORAL_SLUG = 'padrao-comportamental';

/**
 * Get the current month-year string for test usage tracking.
 */
export function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get person limit for a plan.
 */
export function getPersonLimit(planType: PlanType, isSuperAdmin: boolean): number {
  if (isSuperAdmin) return 999;
  return PLAN_LIMITS[planType].maxPersons;
}

/**
 * Check if a plan is individual (no multi-person management).
 */
export function isIndividualPlan(planType: PlanType): boolean {
  return PLAN_LIMITS[planType].individual;
}

/**
 * Check if a specific test module is accessible for a given plan.
 * 
 * For 'standard' (free): Only behavioral test
 * For 'pessoal': All tests (individual use only)
 * For 'profissional': All tests for all persons
 */
export function canAccessModule(
  planType: PlanType,
  moduleSlug: string,
  isOwner: boolean,
  isSuperAdmin: boolean
): boolean {
  if (isSuperAdmin) return true;
  
  if (planType === 'standard') {
    return moduleSlug === BEHAVIORAL_SLUG;
  }
  
  // pessoal and profissional have all tests
  return true;
}

/**
 * Get the monthly test limit for a person on a given plan.
 */
export function getMonthlyTestLimit(
  planType: PlanType,
  isOwner: boolean,
  moduleSlug: string,
  isSuperAdmin: boolean
): number {
  if (isSuperAdmin) return 999;
  
  if (planType === 'standard') {
    return 1; // 1 test per month for free plan
  }
  
  if (planType === 'profissional') {
    return 2; // 2 tests per month per category for everyone
  }
  
  // pessoal
  if (isOwner) {
    return 2; // owner: 2 per category per month
  }
  // guest on pessoal plan: 1 behavioral test only
  return moduleSlug === BEHAVIORAL_SLUG ? 1 : 0;
}
