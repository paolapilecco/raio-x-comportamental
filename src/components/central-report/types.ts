import type { PatternKey } from '@/types/diagnostic';

export interface AIInsights {
  interpretacao_personalizada: string;
  padroes_invisiveis: string[];
  contradicoes_profundas: string[];
  recomendacoes_praticas: string[];
}

export interface CentralProfile {
  dominant_patterns: { key: string; score: number }[];
  aggregated_scores: Record<string, number>;
  tests_completed: number;
  mental_state: string | null;
  core_pain: string | null;
  key_unlock_area: string | null;
  profile_name: string | null;
  last_test_at: string | null;
}

export interface HistoryEntry {
  all_scores: { key: string; percentage: number; label: string }[];
  created_at: string;
  dominant_pattern: string;
  intensity: string;
  test_module_id?: string | null;
}

export interface LifeMapEntry {
  date: string;
  scores: Record<string, number>;
  created_at: string;
}

export interface ManagedPerson {
  id: string;
  name: string;
  cpf: string;
  phone: string | null;
  birth_date: string;
  age: number | null;
}

export interface PersonSummary {
  person: ManagedPerson;
  testsCount: number;
  lastTestDate: string | null;
  dominantPattern: string | null;
  keyActions: string[];
}

export const LIFE_MAP_MODULE_ID = 'a17d95eb-fa4b-4fbc-802c-29f7d97d9d22';

export const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };
