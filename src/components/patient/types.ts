export interface PersonData {
  id: string;
  name: string;
  cpf: string;
  phone: string | null;
  birth_date: string;
  age: number | null;
  is_active: boolean;
  created_at: string;
}

export interface TestEntry {
  id: string;
  session_id: string;
  dominant_pattern: string;
  combined_title: string;
  intensity: string;
  profile_name: string;
  all_scores: any;
  created_at: string;
  test_module_id: string | null;
  state_summary: string;
}

export interface Note {
  id: string;
  content: string;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  test_module_id: string | null;
  remind_at: string;
  status: string;
}

export interface TestModule {
  id: string;
  slug: string;
  name: string;
}

export interface InviteData {
  id: string;
  token: string;
  test_module_id: string;
  status: string;
  expires_at: string;
}

export const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };
export const intensityLabel: Record<string, string> = { leve: 'Leve', moderado: 'Moderado', alto: 'Alto' };
export const COLORS = ['hsl(var(--primary))', 'hsl(0,65%,52%)', 'hsl(38,72%,50%)', 'hsl(152,45%,45%)', 'hsl(270,50%,55%)'];
