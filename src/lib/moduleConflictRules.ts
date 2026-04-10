/**
 * Module Conflict Rules
 * 
 * Dynamic conflict pairs, contradiction rules, pain maps, blind spots
 * and profile definitions per test module.
 * 
 * The "padrao-comportamental" module has full rules.
 * Other modules have empty arrays — fill them as needed.
 */

// ── Types ──

export interface ConflictPair {
  axisA: string;
  axisB: string;
  description: string;
}

export interface ContradictionRule {
  type: string;
  label: string;
  perceptionAxis: string;
  behaviorAxis: string;
  perceptionHigh: boolean;
  behaviorHigh: boolean;
  description: string;
}

export interface PainRule {
  condition: (scores: Record<string, number>, conflictCount: number) => boolean;
  pain: string;
  unlock: string;
}

export interface BlindSpotRule {
  condition: (scores: Record<string, number>, conflictCount: number, selfDeception: number) => boolean;
  perceived: string;
  real: string;
}

export interface ProfileRule {
  id: string;
  name: string;
  description: string;
  dominantTraits: string[];
  condition: (scores: Record<string, number>, conflictCount: number) => { match: boolean; strength: number };
}

export interface PatternUnlockEntry {
  pain: string;
  unlock: string;
}

export interface BlindSpotFallback {
  perceivedProblem: string;
  realProblem: string;
}

export interface ModuleRules {
  conflictPairs: ConflictPair[];
  contradictionRules: ContradictionRule[];
  painRules: PainRule[];
  blindSpotRules: BlindSpotRule[];
  profileDefinitions: ProfileRule[];
  patternUnlockMap: Record<string, PatternUnlockEntry>;
  blindSpotFallbackMap: Record<string, BlindSpotFallback>;
}

// ── Helper ──

const EMPTY_MODULE: ModuleRules = {
  conflictPairs: [],
  contradictionRules: [],
  painRules: [],
  blindSpotRules: [],
  profileDefinitions: [],
  patternUnlockMap: {},
  blindSpotFallbackMap: {},
};

// ── Padrão Comportamental (full rules) ──

const PADRAO_COMPORTAMENTAL: ModuleRules = {
  conflictPairs: [
    { axisA: 'paralyzing_perfectionism', axisB: 'unstable_execution', description: 'Exige perfeição mas não sustenta execução — ciclo de paralisia e frustração constante.' },
    { axisA: 'validation_dependency', axisB: 'excessive_self_criticism', description: 'Busca aprovação externa mas se autocritica impiedosamente — nunca se sente suficiente.' },
    { axisA: 'functional_overload', axisB: 'discomfort_escape', description: 'Acumula responsabilidades mas foge do desconforto — colapso inevitável por esgotamento.' },
    { axisA: 'emotional_self_sabotage', axisB: 'low_routine_sustenance', description: 'Sabota emocionalmente e não sustenta rotinas — recomeça do zero repetidamente.' },
    { axisA: 'paralyzing_perfectionism', axisB: 'discomfort_escape', description: 'Perfeccionismo gera desconforto que leva à fuga — nada é iniciado ou concluído.' },
    { axisA: 'validation_dependency', axisB: 'emotional_self_sabotage', description: 'Depende de validação mas sabota relações — ciclo de rejeição autoimposta.' },
    { axisA: 'excessive_self_criticism', axisB: 'unstable_execution', description: 'Autocrítica paralisa a ação — quanto mais se cobra, menos executa.' },
    { axisA: 'functional_overload', axisB: 'low_routine_sustenance', description: 'Acumula tarefas mas não sustenta rotina — produtividade caótica sem consistência.' },
    { axisA: 'meaning_orientation', axisB: 'avoidance', description: 'Busca sentido mas evita confrontar o vazio — propósito superficial por medo.' },
    { axisA: 'identity_alignment', axisB: 'external_pressure', description: 'Quer alinhamento interno mas cede à pressão externa — vive a identidade dos outros.' },
    { axisA: 'emotional_engagement', axisB: 'internal_conflict', description: 'Deseja engajamento emocional mas conflito interno bloqueia — sentir vira ameaça.' },
    { axisA: 'self_expression', axisB: 'fulfillment_level', description: 'Quer se expressar mas não se sente realizado — expressão sem raiz.' },
  ],

  contradictionRules: [
    {
      type: 'self_deception', label: 'Autoengano',
      perceptionAxis: 'paralyzing_perfectionism', behaviorAxis: 'unstable_execution',
      perceptionHigh: true, behaviorHigh: true,
      description: 'Você se vê como alguém criterioso e exigente, mas seu comportamento real mostra inconsistência na execução. A imagem que você tem de si não corresponde aos resultados que produz.',
    },
    {
      type: 'false_confidence', label: 'Falsa confiança',
      perceptionAxis: 'validation_dependency', behaviorAxis: 'validation_dependency',
      perceptionHigh: false, behaviorHigh: true,
      description: 'Você acredita ser independente nas suas decisões, mas seus comportamentos revelam uma busca constante por aprovação externa.',
    },
    {
      type: 'hidden_avoidance', label: 'Evitação mascarada',
      perceptionAxis: 'functional_overload', behaviorAxis: 'discomfort_escape',
      perceptionHigh: true, behaviorHigh: true,
      description: 'Você mantém uma aparência de produtividade intensa, mas usa a ocupação como escudo para evitar o que realmente importa.',
    },
    {
      type: 'paralyzed_ambition', label: 'Ambição paralisada',
      perceptionAxis: 'excessive_self_criticism', behaviorAxis: 'low_routine_sustenance',
      perceptionHigh: true, behaviorHigh: true,
      description: 'Você tem padrões altíssimos para si mesmo, mas não consegue sustentar as rotinas necessárias para alcançá-los.',
    },
    {
      type: 'emotional_disconnect', label: 'Desconexão emocional',
      perceptionAxis: 'emotional_self_sabotage', behaviorAxis: 'emotional_self_sabotage',
      perceptionHigh: false, behaviorHigh: true,
      description: 'Você se percebe como emocionalmente estável, mas seus padrões de comportamento revelam ciclos de autossabotagem emocional que você não reconhece.',
    },
  ],

  painRules: [
    {
      condition: (s) => (s['emotional_self_sabotage'] || 0) >= 65 && (s['validation_dependency'] || 0) >= 55,
      pain: 'Medo profundo de não ser suficiente — cada conquista precisa de validação para parecer real.',
      unlock: 'Construir uma referência interna de valor que não dependa de resultados ou opiniões.',
    },
    {
      condition: (s) => (s['paralyzing_perfectionism'] || 0) >= 65 && (s['unstable_execution'] || 0) >= 55,
      pain: 'Terror de ser exposto como medíocre — a perfeição é um escudo contra a vulnerabilidade.',
      unlock: 'Aceitar a imperfeição como parte do processo — entregar "bom o suficiente" é um ato de coragem.',
    },
    {
      condition: (s) => (s['functional_overload'] || 0) >= 65 && (s['discomfort_escape'] || 0) >= 55,
      pain: 'Usar a ocupação para não confrontar o vazio — parar significa encarar o que você evita.',
      unlock: 'Criar espaço de desconforto intencional — 15min diários sem produtividade, sem distração.',
    },
    {
      condition: (s) => (s['excessive_self_criticism'] || 0) >= 65 && (s['low_routine_sustenance'] || 0) >= 55,
      pain: 'A autocrítica consome a energia que deveria ir para a ação — quanto mais se cobra, menos faz.',
      unlock: 'Substituir a autocrítica por auto-observação: notar sem julgar, agir sem exigir perfeição.',
    },
    {
      condition: (_, c) => c >= 2,
      pain: 'Múltiplos conflitos internos fragmentam sua energia — você está lutando contra si mesmo em várias frentes.',
      unlock: 'Identificar o conflito primário e resolver um de cada vez — priorizar a contradição mais dolorosa.',
    },
    {
      condition: (s) => (s['discomfort_escape'] || 0) >= 70,
      pain: 'Aversão profunda ao desconforto — qualquer fricção gera fuga, mantendo você em zona de conforto permanente.',
      unlock: 'Microexposições diárias: fazer uma coisa desconfortável por dia durante 5 minutos.',
    },
    {
      condition: (s) => (s['low_routine_sustenance'] || 0) >= 70 && (s['unstable_execution'] || 0) >= 60,
      pain: 'Incapacidade de sustentar — você funciona em sprints que esgotam e recomeços que frustram.',
      unlock: 'Reduzir pela metade o que você planeja e dobrar o tempo de manutenção.',
    },
    {
      condition: (s) => (s['validation_dependency'] || 0) >= 65 && (s['unstable_execution'] || 0) >= 55,
      pain: 'Você só age quando tem validação — sem aprovação, a execução trava completamente.',
      unlock: 'Completar uma tarefa por dia sem mostrar para ninguém durante 14 dias.',
    },
    {
      condition: (s) => (s['emotional_self_sabotage'] || 0) >= 65 && (s['discomfort_escape'] || 0) >= 55,
      pain: 'Sabota no momento em que precisa avançar — a emoção sequestra a ação antes que ela aconteça.',
      unlock: 'Tolerância ao desconforto emocional: identificar a emoção, nomeá-la em voz alta e agir nos próximos 90 segundos.',
    },
    {
      condition: (s) => (s['excessive_self_criticism'] || 0) >= 65 && (s['paralyzing_perfectionism'] || 0) >= 55,
      pain: 'A cobrança interna é tão alta que nenhum resultado parece suficiente — tudo vira frustração.',
      unlock: 'Definir "feito" antes de começar qualquer tarefa — escrever o critério mínimo e parar quando atingir.',
    },
    {
      condition: (s) => (s['functional_overload'] || 0) >= 65 && (s['validation_dependency'] || 0) >= 50,
      pain: 'Acumula responsabilidades para provar valor — a sobrecarga é uma estratégia de aceitação.',
      unlock: 'Recusar uma demanda por semana que você normalmente aceitaria.',
    },
  ],

  blindSpotRules: [
    {
      condition: (s) => (s['paralyzing_perfectionism'] || 0) >= 60 && (s['unstable_execution'] || 0) >= 55,
      perceived: 'Você acredita que precisa se organizar melhor e criar um plano perfeito antes de agir.',
      real: 'Mas o problema real é que o planejamento virou uma forma de evitar a execução.',
    },
    {
      condition: (s) => (s['discomfort_escape'] || 0) >= 60 && (s['low_routine_sustenance'] || 0) >= 55,
      perceived: 'Você acredita que falta disciplina e força de vontade para manter uma rotina.',
      real: 'Mas o problema real é que você abandona no momento exato em que o desconforto aparece.',
    },
    {
      condition: (s) => (s['validation_dependency'] || 0) >= 60 && (s['excessive_self_criticism'] || 0) >= 55,
      perceived: 'Você acredita que é exigente consigo mesmo porque tem padrões altos.',
      real: 'Mas o problema real é que você usa a autocrítica como escudo — se você se criticar primeiro, a rejeição dos outros dói menos.',
    },
    {
      condition: (s) => (s['functional_overload'] || 0) >= 60 && (s['emotional_self_sabotage'] || 0) >= 50,
      perceived: 'Você acredita que está sobrecarregado porque tem muitas responsabilidades.',
      real: 'Mas o problema real é que você acumula tarefas para não ter tempo de confrontar o que realmente te incomoda.',
    },
    {
      condition: (s) => (s['emotional_self_sabotage'] || 0) >= 60 && (s['unstable_execution'] || 0) >= 50,
      perceived: 'Você acredita que precisa encontrar mais motivação para manter seus projetos.',
      real: 'Mas o problema real é que você destrói o que começa a funcionar.',
    },
    {
      condition: (s) => (s['excessive_self_criticism'] || 0) >= 60 && (s['low_routine_sustenance'] || 0) >= 50,
      perceived: 'Você acredita que precisa se cobrar mais para conseguir resultados.',
      real: 'Mas o problema real é que a cobrança excessiva está consumindo a energia que deveria ir para a ação.',
    },
    {
      condition: (_, c) => c >= 2,
      perceived: 'Você acredita que precisa "escolher um caminho" e se comprometer de verdade.',
      real: 'Mas o problema real é que você está em guerra consigo mesmo — partes suas querem coisas opostas ao mesmo tempo.',
    },
    {
      condition: (_, __, sd) => sd >= 45,
      perceived: 'Você acredita que se conhece bem e sabe o que precisa mudar.',
      real: 'Mas o problema real é que existe uma distância significativa entre como você se percebe e como realmente se comporta.',
    },
    {
      condition: (s) => (s['discomfort_escape'] || 0) >= 65,
      perceived: 'Você acredita que precisa de condições ideais para conseguir agir com consistência.',
      real: 'Mas o problema real é que você evita desconforto antes da ação.',
    },
    {
      condition: (s) => (s['validation_dependency'] || 0) >= 65,
      perceived: 'Você acredita que valoriza a opinião dos outros porque é humilde e aberto a feedback.',
      real: 'Mas o problema real é que você transferiu para os outros a autoridade sobre seu próprio valor.',
    },
  ],

  profileDefinitions: [
    {
      id: 'evitativo', name: 'Perfil Evitativo',
      description: 'Você foge do desconforto antes mesmo de processá-lo. Tarefas difíceis, conversas incômodas e decisões arriscadas são sistematicamente adiadas.',
      dominantTraits: ['Procrastinação crônica', 'Troca de atividade sob pressão', 'Conforto como prioridade inconsciente'],
      condition: (s) => {
        const score = ((s['discomfort_escape'] || 0) * 0.5) + ((s['low_routine_sustenance'] || 0) * 0.3) + ((s['emotional_self_sabotage'] || 0) * 0.2);
        return { match: (s['discomfort_escape'] || 0) >= 55, strength: score };
      },
    },
    {
      id: 'inconsistente', name: 'Perfil Inconsistente',
      description: 'Você funciona em sprints intensos seguidos de abandonos abruptos.',
      dominantTraits: ['Ciclos de começo/abandono', 'Dependência de motivação', 'Rotina instável'],
      condition: (s) => {
        const score = ((s['unstable_execution'] || 0) * 0.5) + ((s['low_routine_sustenance'] || 0) * 0.35) + ((s['emotional_self_sabotage'] || 0) * 0.15);
        return { match: (s['unstable_execution'] || 0) >= 55, strength: score };
      },
    },
    {
      id: 'sobrecarregado', name: 'Perfil Sobrecarregado',
      description: 'Você acumula mais do que pode processar. Está sempre ocupado, mas raramente avança no que importa.',
      dominantTraits: ['Dificuldade em dizer não', 'Ocupação como escudo', 'Exaustão crônica disfarçada de produtividade'],
      condition: (s) => {
        const score = ((s['functional_overload'] || 0) * 0.5) + ((s['excessive_self_criticism'] || 0) * 0.25) + ((s['validation_dependency'] || 0) * 0.25);
        return { match: (s['functional_overload'] || 0) >= 55, strength: score };
      },
    },
    {
      id: 'autocritico', name: 'Perfil Autocrítico',
      description: 'Sua voz interna é mais dura que qualquer crítica externa. O perfeccionismo não é sobre qualidade — é sobre medo de exposição.',
      dominantTraits: ['Cobrança interna desproporcional', 'Perfeccionismo paralisante', 'Culpa por descansar'],
      condition: (s) => {
        const score = ((s['excessive_self_criticism'] || 0) * 0.4) + ((s['paralyzing_perfectionism'] || 0) * 0.4) + ((s['emotional_self_sabotage'] || 0) * 0.2);
        return { match: ((s['excessive_self_criticism'] || 0) >= 55 || (s['paralyzing_perfectionism'] || 0) >= 55), strength: score };
      },
    },
    {
      id: 'dependente_estimulo', name: 'Perfil Dependente de Estímulo',
      description: 'Você só age quando há pressão externa: prazo, cobrança, urgência ou validação.',
      dominantTraits: ['Ação condicionada a urgência', 'Busca constante por aprovação', 'Dificuldade de automotivação'],
      condition: (s) => {
        const score = ((s['validation_dependency'] || 0) * 0.4) + ((s['low_routine_sustenance'] || 0) * 0.3) + ((s['discomfort_escape'] || 0) * 0.3);
        return { match: (s['validation_dependency'] || 0) >= 55, strength: score };
      },
    },
    {
      id: 'autossabotador', name: 'Perfil Autossabotador',
      description: 'Você destrói o que constrói. Quando as coisas começam a funcionar, algo dentro de você encontra um motivo para parar.',
      dominantTraits: ['Abandono na reta final', 'Criação inconsciente de obstáculos', 'Medo de manter conquistas'],
      condition: (s) => {
        const score = ((s['emotional_self_sabotage'] || 0) * 0.5) + ((s['unstable_execution'] || 0) * 0.25) + ((s['discomfort_escape'] || 0) * 0.25);
        return { match: (s['emotional_self_sabotage'] || 0) >= 55, strength: score };
      },
    },
    {
      id: 'fragmentado', name: 'Perfil Fragmentado',
      description: 'Múltiplos conflitos internos dividem sua energia em direções opostas.',
      dominantTraits: ['Conflitos internos simultâneos', 'Indecisão crônica', 'Energia dispersa'],
      condition: (_, conflictCount) => {
        const score = conflictCount * 25 + 20;
        return { match: conflictCount >= 2, strength: Math.min(score, 100) };
      },
    },
  ],

  patternUnlockMap: {
    paralyzing_perfectionism: {
      pain: 'A busca pela perfeição paralisa a ação — nada começa porque nada é bom o suficiente.',
      unlock: 'Entregar a primeira versão imperfeita de uma tarefa importante dentro de 48h.',
    },
    unstable_execution: {
      pain: 'Execução instável — começa muitas coisas mas sustenta poucas até o fim.',
      unlock: 'Manter apenas uma prioridade ativa por vez e só avançar para a próxima quando concluir.',
    },
    validation_dependency: {
      pain: 'Sem validação externa, a ação perde sentido — dependência de aprovação trava decisões.',
      unlock: 'Tomar uma decisão por dia sem consultar ninguém e registrar o resultado.',
    },
    excessive_self_criticism: {
      pain: 'A autocrítica consome a energia que deveria ir para a ação.',
      unlock: 'Substituir "eu deveria" por "o que posso fazer agora com o que tenho".',
    },
    functional_overload: {
      pain: 'Sobrecarga funcional — fazer demais para evitar confrontar o que realmente importa.',
      unlock: 'Eliminar 30% das atividades semanais e observar o que surge no espaço vazio.',
    },
    discomfort_escape: {
      pain: 'Fuga do desconforto — qualquer fricção aciona retirada automática.',
      unlock: 'Microexposição diária: permanecer 5 minutos em uma situação desconfortável antes de decidir sair.',
    },
    low_routine_sustenance: {
      pain: 'Incapacidade de manter — rotinas se dissolvem antes de gerar resultado.',
      unlock: 'Escolher um único hábito e mantê-lo por 21 dias — não adicionar nenhum outro até completar.',
    },
    emotional_self_sabotage: {
      pain: 'Sabotagem emocional no momento da ação — o sentimento destrói o plano.',
      unlock: 'Criar um protocolo de 90 segundos: quando a emoção surgir, nomeá-la, respirar 3x e executar a menor ação possível.',
    },
  },

  blindSpotFallbackMap: {
    paralyzing_perfectionism: {
      perceivedProblem: 'Você acredita que só precisa encontrar o método certo para ser produtivo.',
      realProblem: 'Mas o problema real é que a busca pelo método perfeito é o próprio mecanismo de procrastinação.',
    },
    unstable_execution: {
      perceivedProblem: 'Você acredita que começa muitas coisas porque tem muitos interesses.',
      realProblem: 'Mas o problema real é que você abandona antes que o resultado possa te julgar.',
    },
    functional_overload: {
      perceivedProblem: 'Você acredita que precisa aprender a delegar e gerenciar melhor seu tempo.',
      realProblem: 'Mas o problema real é que você precisa ser indispensável para se sentir seguro.',
    },
    low_routine_sustenance: {
      perceivedProblem: 'Você acredita que falta consistência porque ainda não encontrou a rotina certa.',
      realProblem: 'Mas o problema real é que toda rotina vai gerar tédio e desconforto em algum momento — e esse é exatamente o momento em que você abandona.',
    },
  },
};

// ── Module Registry ──
// Maps module slug → rules. Other modules start empty.

export const moduleConflictRules: Record<string, ModuleRules> = {
  'padrao-comportamental': PADRAO_COMPORTAMENTAL,
  'execucao-produtividade': { ...EMPTY_MODULE },
  'emocoes-reatividade': { ...EMPTY_MODULE },
  'relacionamentos-apego': { ...EMPTY_MODULE },
  'autoimagem-identidade': { ...EMPTY_MODULE },
  'dinheiro-decisao': { ...EMPTY_MODULE },
  'padroes-ocultos': { ...EMPTY_MODULE },
  'proposito-sentido': { ...EMPTY_MODULE },
  'mapa-de-vida': { ...EMPTY_MODULE },
};

/**
 * Get the rules for a given module slug.
 * Falls back to empty rules if unknown.
 */
export function getModuleRules(moduleSlug: string | undefined): ModuleRules {
  if (!moduleSlug) return EMPTY_MODULE;
  return moduleConflictRules[moduleSlug] || EMPTY_MODULE;
}
