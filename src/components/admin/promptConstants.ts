import { Brain, FileText, Target, Crosshair, AlertTriangle, ArrowUpRight, Ban, Zap, Heart, Shield, DollarSign, Eye, Compass, Sparkles } from 'lucide-react';

export const iconMap: Record<string, any> = {
  brain: Brain, zap: Zap, heart: Heart, shield: Shield,
  'dollar-sign': DollarSign, eye: Eye, compass: Compass,
  target: Target, sparkles: Sparkles,
};

export const PROMPT_SECTIONS = [
  { type: 'interpretation', label: 'Interpretação', shortLabel: 'Interpret.', icon: Brain, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', description: 'Instruções base para interpretar as respostas do usuário. Define como a IA deve ler e cruzar os dados dos eixos.', defaultTitle: 'Prompt Base de Interpretação', rows: 6 },
  { type: 'diagnosis', label: 'Diagnóstico', shortLabel: 'Diagnóst.', icon: FileText, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/20', description: 'Prompt para gerar o diagnóstico final com base nos scores. Deve ser direto, específico e sem generalidades.', defaultTitle: 'Prompt do Diagnóstico Final', rows: 6 },
  { type: 'profile', label: 'Perfil', shortLabel: 'Perfil', icon: Target, color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20', description: 'Prompt para identificar o perfil comportamental dominante. Deve gerar um nome criativo e descritivo.', defaultTitle: 'Prompt de Identificação de Perfil', rows: 5 },
  { type: 'core_pain', label: 'Dor Central', shortLabel: 'Dor', icon: Crosshair, color: 'text-rose-500', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20', description: 'Prompt para identificar a dor central por trás dos padrões. Deve ser específico — nunca genérico.', defaultTitle: 'Prompt de Dor Central', rows: 5 },
  { type: 'triggers', label: 'Gatilhos', shortLabel: 'Gatilhos', icon: AlertTriangle, color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', description: 'Mapear gatilhos que ativam padrões e armadilhas mentais que os mantêm ativos.', defaultTitle: 'Prompt de Gatilhos e Armadilhas', rows: 5 },
  { type: 'direction', label: 'Direção', shortLabel: 'Direção', icon: ArrowUpRight, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', description: 'Sugerir ações práticas e caminhos de transformação. Deve ser concreto e com prazos.', defaultTitle: 'Prompt de Direção Prática', rows: 5 },
  { type: 'restrictions', label: 'Restrições', shortLabel: 'Restrições', icon: Ban, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', description: 'O que a IA NÃO deve fazer ao gerar resultados. Regras negativas obrigatórias.', defaultTitle: 'Regras Negativas / Restrições', rows: 5 },
];

export const AI_MODELS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', description: 'Equilíbrio entre velocidade e qualidade' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Bom custo-benefício, multimodal' },
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Mais rápido e econômico' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Máxima qualidade, mais lento' },
  { value: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', description: 'Última geração, raciocínio avançado' },
  { value: 'openai/gpt-5', label: 'GPT-5', description: 'Alta precisão, mais caro' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', description: 'Bom desempenho, custo moderado' },
  { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', description: 'Rápido e econômico' },
  { value: 'openai/gpt-5.2', label: 'GPT-5.2', description: 'Último modelo OpenAI' },
];

export const TONE_OPTIONS = ['empático e direto', 'clínico e técnico', 'casual e acolhedor', 'provocativo e desafiador', 'analítico e neutro', 'direto e assertivo'];
export const STYLE_OPTIONS = ['narrativo', 'bullet-points', 'estruturado', 'misto', 'conversacional'];
export const DEPTH_LABELS: Record<number, string> = { 1: 'Superficial', 2: 'Leve', 3: 'Moderado', 4: 'Profundo', 5: 'Máximo' };

export const PROMPT_TEMPLATES: Record<string, string> = {
  interpretation: `Você é um analista comportamental especializado em padrões de autossabotagem.

Analise os scores dos eixos abaixo e identifique:
1. O padrão dominante e como ele se manifesta no dia a dia
2. Padrões secundários que reforçam ou contradizem o dominante
3. Conflitos internos entre eixos com scores altos simultâneos
4. Contradições entre o que a pessoa percebe e como realmente age

REGRAS:
- Nunca use linguagem genérica como "busque equilíbrio" ou "tenha mais foco"
- Cada insight deve ser específico aos scores apresentados
- Conecte os eixos entre si — não analise isoladamente
- Use linguagem direta e impactante, sem rodeios`,

  diagnosis: `Com base nos padrões identificados, gere um diagnóstico que:

1. Nomeie o ciclo de autossabotagem específico (ex: "Ciclo de Paralisia por Antecipação")
2. Explique a CAUSA RAIZ — por que esse padrão se instalou
3. Descreva o mecanismo exato: gatilho → reação → consequência → reforço
4. Identifique o que a pessoa ACREDITA ser o problema vs. o que REALMENTE é

FORMATO:
- Diagnóstico em narrativa contínua, não em tópicos
- Máximo 3 parágrafos densos
- Tom: direto e revelador, sem amenizar`,

  profile: `Crie um perfil comportamental único que:

1. Tenha um NOME CRIATIVO e memorável (ex: "O Arquiteto de Planos Inacabados")
2. Descreva o estado mental predominante em uma frase
3. Liste 3-4 traços dominantes observáveis
4. Indique o nível de risco de autossabotagem (baixo/moderado/alto/crítico)

O nome deve capturar a essência do padrão — ser impactante e revelador.
Evite nomes genéricos como "Perfil Ansioso" ou "Tipo Procrastinador".`,

  core_pain: `Identifique a DOR CENTRAL — o medo ou ferida emocional que sustenta todos os padrões.

REGRAS:
- A dor central NÃO é um sintoma (procrastinação, ansiedade)
- É a CAUSA por trás dos sintomas (medo de inadequação, terror de rejeição)
- Deve ser específica ao perfil — não genérica
- Conecte a dor aos comportamentos observados nos scores
- Explique como essa dor se disfarça no cotidiano

Formato: Uma declaração direta seguida de explicação em 2-3 frases.`,

  triggers: `Mapeie os GATILHOS e ARMADILHAS MENTAIS:

GATILHOS (situações que ativam o padrão):
- Liste 3-5 gatilhos específicos e contextualizados
- Cada gatilho deve descrever uma SITUAÇÃO concreta, não abstrata
- Ex: "Quando recebe uma crítica construtiva no trabalho" (não "quando é criticado")

ARMADILHAS MENTAIS (narrativas que mantêm o ciclo):
- Liste 3-5 pensamentos automáticos típicos
- Cada armadilha deve ser uma FRASE que a pessoa realmente pensa
- Ex: "Se eu não fizer perfeito, melhor nem começar" (não "perfeccionismo")

CICLO DE AUTOSSABOTAGEM:
- Descreva em 3-5 etapas o ciclo completo do padrão`,

  direction: `Sugira uma DIREÇÃO PRÁTICA com ações específicas:

1. PRIMEIRA AÇÃO (para os próximos 7 dias):
   - Uma única ação concreta e executável
   - Com prazo e critério de sucesso claros

2. ÁREA-CHAVE DE DESTRAVAMENTO:
   - Qual é o ponto exato onde a mudança deve começar
   - Por que essa área e não outra

3. PONTO DE BLOQUEIO:
   - O que vai tentar impedir essa mudança
   - Como contornar essa resistência

REGRAS:
- Nada de "faça terapia" ou "pratique mindfulness"
- Ações devem ser específicas ao perfil identificado
- Inclua o que PARAR de fazer (não apenas o que começar)`,

  restrictions: `RESTRIÇÕES OBRIGATÓRIAS — O que a IA NÃO deve fazer:

1. NÃO use frases genéricas de autoajuda
2. NÃO minimize a severidade do padrão identificado
3. NÃO sugira soluções que não se conectem aos scores
4. NÃO use linguagem passiva ou condescendente
5. NÃO repita informações entre seções do relatório
6. NÃO diagnostique condições clínicas (depressão, TDAH, etc.)
7. NÃO use termos como "zona de conforto", "acredite em si", "saia da caixa"
8. NÃO gere conteúdo que pareça coaching genérico
9. NÃO ignore contradições nos scores — elas são a parte mais reveladora
10. NÃO produza respostas que poderiam se aplicar a qualquer pessoa`,
};

export interface TestPrompt {
  id: string;
  test_id: string;
  prompt_type: string;
  title: string;
  content: string;
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface TestModule {
  id: string;
  slug: string;
  name: string;
  icon: string;
}

export interface GlobalAiConfig {
  id: string;
  ai_enabled: boolean;
  ai_model: string;
  temperature: number;
  max_tokens: number;
  tone: string;
  depth_level: number;
  report_style: string;
}

export interface TestAiConfig {
  id: string;
  test_id: string;
  use_global_defaults: boolean;
  ai_enabled: boolean;
  temperature: number;
  max_tokens: number;
  tone: string;
  depth_level: number;
  report_style: string;
}
