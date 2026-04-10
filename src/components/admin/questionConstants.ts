/**
 * Question Constants
 * Interfaces, types, constants, and utilities for question management
 */

export interface Question {
  id: string;
  test_id: string;
  text: string;
  context: string | null;
  type: 'likert' | 'behavior_choice' | 'frequency' | 'intensity';
  axes: string[];
  weight: number;
  sort_order: number;
  options: string[] | null;
  option_scores: number[] | null;
}

export type QuestionType = 'likert' | 'behavior_choice' | 'frequency' | 'intensity';

export const typeLabels: Record<string, string> = {
  likert: 'Likert (Concordância)',
  behavior_choice: 'Escolha Comportamental',
  frequency: 'Frequência',
  intensity: 'Intensidade',
};

export const typeDescriptions: Record<string, string> = {
  likert: 'Afirmação com escala de 1 a 5 (Discordo totalmente → Concordo totalmente)',
  behavior_choice: 'Cenário com opções de resposta personalizadas',
  frequency: 'Pergunta de comportamento com escala temporal (Nunca → Sempre)',
  intensity: 'Pergunta com escala de intensidade (Nenhuma → Extrema)',
};

export const defaultOptionsForType: Record<string, string[]> = {
  likert: ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'],
  frequency: ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'],
  intensity: ['Nenhuma', 'Leve', 'Moderada', 'Alta', 'Extrema'],
  behavior_choice: ['', '', '', ''],
};

export const defaultScoresForType: Record<string, number[]> = {
  likert: [0, 25, 50, 75, 100],
  frequency: [0, 25, 50, 75, 100],
  intensity: [0, 25, 50, 75, 100],
  behavior_choice: [0, 33, 66, 100],
};

export const GENERIC_TERMS = [
  'melhorar', 'equilibrio', 'equilíbrio', 'buscar', 'tentar', 'procurar',
  'se sentir bem', 'ser feliz', 'ter sucesso', 'zona de conforto',
];

/**
 * Validate question text against quality standards
 */
export function validateQuestion(text: string, type: QuestionType): { warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) return { warnings, errors };

  // Likert must be an affirmation — no question marks
  if (type === 'likert' && trimmed.includes('?')) {
    errors.push('Likert deve ser uma AFIRMAÇÃO (sem interrogação). Ex: "Eu começo tarefas mas não termino"');
  }

  // Frequency should be a question
  if (type === 'frequency' && !trimmed.includes('?')) {
    warnings.push('Frequência geralmente usa pergunta. Ex: "Com que frequência você adia decisões?"');
  }

  // Detect open-ended patterns
  if (/^(por que|como você|o que você|qual|explique|descreva)/i.test(trimmed)) {
    errors.push('Evite perguntas abertas (por que, como, o que). Use afirmações ou cenários.');
  }

  // Detect generic / self-help language
  const foundGeneric = GENERIC_TERMS.filter(t => trimmed.toLowerCase().includes(t));
  if (foundGeneric.length > 0) {
    warnings.push(`Linguagem genérica detectada: "${foundGeneric.join('", "')}". Seja mais específico.`);
  }

  // Too short
  if (trimmed.length < 15) {
    warnings.push('Texto muito curto. Afirmações precisam de contexto suficiente para análise.');
  }

  return { warnings, errors };
}

export const emptyQuestion = {
  text: '',
  context: '' as string,
  type: 'likert' as QuestionType,
  axes: [''],
  weight: 1,
  sort_order: 0,
  options: null as string[] | null,
  option_scores: null as number[] | null,
};
