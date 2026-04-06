import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Static fallback labels (used while DB loads or if no data)
const DEFAULT_AXIS_LABELS: Record<string, string> = {
  unstable_execution: 'Execução',
  emotional_self_sabotage: 'Autossabotagem',
  functional_overload: 'Sobrecarga',
  discomfort_escape: 'Fuga',
  paralyzing_perfectionism: 'Perfeccionismo',
  validation_dependency: 'Validação',
  excessive_self_criticism: 'Autocrítica',
  low_routine_sustenance: 'Rotina',
};

async function fetchAxisLabels(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('pattern_definitions')
    .select('pattern_key, label');

  if (error || !data || data.length === 0) {
    return DEFAULT_AXIS_LABELS;
  }

  const labels: Record<string, string> = {};
  data.forEach((row) => {
    if (!labels[row.pattern_key]) {
      labels[row.pattern_key] = row.label;
    }
  });

  // Merge with defaults so we never miss a key
  return { ...DEFAULT_AXIS_LABELS, ...labels };
}

export function useAxisLabels() {
  const { data: axisLabels = DEFAULT_AXIS_LABELS } = useQuery({
    queryKey: ['axis-labels'],
    queryFn: fetchAxisLabels,
    staleTime: 10 * 60 * 1000,
  });

  return axisLabels;
}

export { DEFAULT_AXIS_LABELS };
