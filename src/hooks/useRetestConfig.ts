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
    const load = async () => {
      try {
        const { data: config, error } = await supabase.rpc('get_public_retest_config' as any);

        if (error || !config) {
          setData({ ...DEFAULTS, loading: false });
          return;
        }

        const c = config as any;
        setData({
          loading: false,
          retest_enabled: c.retest_enabled ?? true,
          retest_days_threshold: c.retest_days_threshold ?? 15,
          dashboard_alert_enabled: c.dashboard_alert_enabled ?? true,
          email_reminder_enabled: c.email_reminder_enabled ?? true,
        });
      } catch {
        setData({ ...DEFAULTS, loading: false });
      }
    };
    load();
  }, []);

  return data;
}
