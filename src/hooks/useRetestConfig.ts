import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RetestConfigData {
  loading: boolean;
  retest_enabled: boolean;
  retest_days_threshold: number;
  dashboard_alert_enabled: boolean;
  email_reminder_enabled: boolean;
}

const DEFAULTS: RetestConfigData = {
  loading: true,
  retest_enabled: true,
  retest_days_threshold: 15,
  dashboard_alert_enabled: true,
  email_reminder_enabled: true,
};

export function useRetestConfig(): RetestConfigData {
  const [data, setData] = useState<RetestConfigData>(DEFAULTS);

  useEffect(() => {
    const fetch = async () => {
      try {
        // Use service-accessible query - retest_config has super_admin-only RLS
        // For regular users, we read from a public-safe edge or fallback to defaults
        const { data: config, error } = await supabase
          .from('retest_config' as any)
          .select('retest_enabled, retest_days_threshold, dashboard_alert_enabled, email_reminder_enabled')
          .limit(1)
          .maybeSingle();

        if (error || !config) {
          // Fallback to defaults (RLS blocks non-admin users, which is expected)
          setData({ ...DEFAULTS, loading: false });
          return;
        }

        setData({
          loading: false,
          retest_enabled: (config as any).retest_enabled ?? true,
          retest_days_threshold: (config as any).retest_days_threshold ?? 15,
          dashboard_alert_enabled: (config as any).dashboard_alert_enabled ?? true,
          email_reminder_enabled: (config as any).email_reminder_enabled ?? true,
        });
      } catch {
        setData({ ...DEFAULTS, loading: false });
      }
    };
    fetch();
  }, []);

  return data;
}
