import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'user' | 'premium' | 'super_admin';
export type PlanType = 'standard' | 'pessoal' | 'profissional';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  age: number | null;
}

interface SubscriptionInfo {
  plan: string;
  plan_type: PlanType;
  status: string;
}

// Plan limits configuration
export const PLAN_LIMITS = {
  standard: { maxPersons: 1, testsPerMonth: 1, allTests: false, label: 'Padrão' },
  pessoal: { maxPersons: 3, testsPerMonth: 2, allTests: true, label: 'Pessoal', guestTestsPerMonth: 1, guestAllTests: false },
  profissional: { maxPersons: 15, testsPerMonth: 2, allTests: true, label: 'Profissional' },
} as const;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole;
  planType: PlanType;
  subscription: SubscriptionInfo | null;
  isAdmin: boolean;
  isPremium: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  previewMode: boolean;
  togglePreviewMode: () => void;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function resolveRole(roles: string[]): AppRole {
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('admin')) return 'super_admin'; // legacy admin → super_admin
  if (roles.includes('premium')) return 'premium';
  return 'user';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole>('user');
  const [planType, setPlanType] = useState<PlanType>('standard');
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const initializedRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const [profileRes, roleRes, subRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId),
      supabase
        .from('subscriptions')
        .select('plan, plan_type, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (profileRes.error) {
      console.error('Failed to load profile', profileRes.error);
      setProfile(null);
    } else {
      setProfile(profileRes.data);
    }

    if (roleRes.error) {
      console.error('Failed to load user roles', roleRes.error);
      setRole('user');
    } else {
      const roles = (roleRes.data ?? []).map((r: { role: string }) => r.role);
      setRole(resolveRole(roles));
    }

    // Set plan type from active subscription
    if (subRes.data && subRes.data.status === 'active') {
      const pt = (subRes.data as any).plan_type as PlanType;
      setPlanType(pt || 'pessoal');
      setSubscription(subRes.data as any);
    } else {
      setPlanType('standard');
      setSubscription(null);
    }
  }, []);

  const applySession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (nextSession?.user) {
      await fetchProfile(nextSession.user.id);
    } else {
      setProfile(null);
      setRole('user');
      setPlanType('standard');
      setSubscription(null);
    }
  }, [fetchProfile]);

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!initializedRef.current) return;
      void applySession(nextSession);
    });

    void supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      await applySession(initialSession);
      initializedRef.current = true;
      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, [applySession]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    
    // Send welcome email on successful signup
    if (!error) {
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            templateName: 'welcome',
            to: email,
            data: {
              name: email.split('@')[0],
              appUrl: window.location.origin + '/dashboard',
            },
          },
        });
      } catch (e) {
        console.error('Welcome email failed (non-blocking):', e);
      }
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole('user');
    setPlanType('standard');
    setSubscription(null);
    setPreviewMode(false);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const togglePreviewMode = useCallback(() => {
    if (role === 'super_admin') {
      setPreviewMode(prev => !prev);
    }
  }, [role]);

  const realSuperAdmin = role === 'super_admin';
  const isSuperAdmin = realSuperAdmin && !previewMode;
  const isPremium = (role === 'premium' || realSuperAdmin) && !previewMode;
  const isAdmin = isSuperAdmin; // backward compat

  return (
    <AuthContext.Provider value={{ session, user, profile, role, planType, subscription, isAdmin, isPremium, isSuperAdmin, loading, previewMode, togglePreviewMode, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
