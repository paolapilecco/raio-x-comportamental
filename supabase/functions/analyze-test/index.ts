import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScoreEntry {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
}

interface PromptRecord {
  prompt_type: string;
  content: string;
  title: string;
}

// ── Category-specific prompt contexts ──

interface CategoryContext {
  role: string;
  emphasis: string;
  sectionOverrides: Record<string, string>;
  extraInstructions: string;
}

function getCategoryContext(slug: string): CategoryContext {
  // Mapa de Vida has its own PDF/report, skip here
  if (slug === 'mapa-de-vida') {
    return {
      role: 'Você analisa a satisfação do usuário em cada área da vida e identifica onde ele precisa agir primeiro.',
      emphasis: 'Foco em EQUILÍBRIO entre as áreas e PRIORIZAÇÃO de ação.',
      sectionOverrides: {
        resumoPrincipal: 'Qual área da vida está mais desequilibrada e o que isso causa nas outras.',
        significadoPratico: 'Como esse desequilíbrio aparece na rotina real — exemplos concretos.',
        padraoIdentificado: 'Qual padrão de negligência ou compensação entre áreas.',
        direcaoAjuste: 'Qual área priorizar primeiro e por quê — uma ação concreta.',
        proximoPasso: 'Uma ação para esta semana na área mais crítica.',
      },
      extraInstructions: `- Mencione as ÁREAS DA VIDA específicas (saúde, finanças, relacionamento, etc.)
- Compare áreas fortes vs fracas — o que uma compensa na outra?
- O plano de ação deve ser POR ÁREA, não genérico`,
    };
  }

  if (slug === 'padrao-comportamental') {
    return {
      role: 'Você identifica os padrões invisíveis de comportamento que travam a pessoa sem ela perceber.',
      emphasis: 'Foco em PADRÕES REPETITIVOS e MECANISMOS AUTOMÁTICOS.',
      sectionOverrides: {
        resumoPrincipal: 'Qual padrão domina e como ele funciona por baixo das decisões conscientes.',
        significadoPratico: 'Em quais decisões do dia a dia esse padrão aparece — exemplos reais.',
        comoAparece: 'Situações concretas onde o padrão se ativa sem a pessoa perceber.',
        direcaoAjuste: 'Qual comportamento automático interromper primeiro.',
      },
      extraInstructions: `- Foque em MECANISMOS AUTOMÁTICOS — coisas que a pessoa faz no piloto automático
- Identifique o CICLO: gatilho → reação automática → consequência → reforço
- O ponto cego deve revelar algo que a pessoa genuinamente não vê`,
    };
  }

  // Execução & Produtividade
  if (slug.includes('execucao') || slug.includes('produtividade')) {
    return {
      role: 'Você analisa por que a pessoa não consegue executar com consistência, mesmo sabendo o que precisa fazer.',
      emphasis: 'Foco em EXECUÇÃO, CONSISTÊNCIA e PROCRASTINAÇÃO.',
      sectionOverrides: {
        resumoPrincipal: 'Onde exatamente a execução trava — o que acontece entre planejar e fazer.',
        significadoPratico: 'Como essa falha de execução aparece no trabalho, projetos e metas.',
        padraoIdentificado: 'O tipo de procrastinação ou bloqueio — nomeie o mecanismo específico.',
        comoAparece: 'Exemplos: prazos perdidos, projetos abandonados, ciclos de motivação que somem.',
        direcaoAjuste: 'A menor ação possível para quebrar o ciclo de inação.',
      },
      extraInstructions: `- NÃO diga "tenha mais disciplina" — explique o que CAUSA a falta de execução
- Identifique se o problema é INÍCIO (não começa), SUSTENTAÇÃO (não mantém) ou FINALIZAÇÃO (não termina)
- Gatilhos devem ser sobre SITUAÇÕES DE TRABALHO/ROTINA reais`,
    };
  }

  // Emoções & Reatividade
  if (slug.includes('emocional') || slug.includes('emocoes') || slug.includes('reatividade')) {
    return {
      role: 'Você analisa como as emoções controlam as decisões da pessoa e onde ela perde o controle.',
      emphasis: 'Foco em REAÇÕES EMOCIONAIS e REGULAÇÃO.',
      sectionOverrides: {
        resumoPrincipal: 'Qual emoção domina e como ela sequestra as decisões.',
        significadoPratico: 'Em quais situações a pessoa reage de forma desproporcional — exemplos.',
        padraoIdentificado: 'O tipo de reatividade — explosiva, supressiva, evitativa.',
        comoAparece: 'Exemplos de reações que a pessoa se arrepende depois.',
        direcaoAjuste: 'Uma técnica simples para o momento entre o gatilho e a reação.',
      },
      extraInstructions: `- Identifique a EMOÇÃO DOMINANTE (raiva, ansiedade, medo, tristeza)
- Diferencie entre SENTIR a emoção (normal) e SER CONTROLADO por ela (problema)
- Gatilhos devem ser emocionais: situações que disparam reações intensas`,
    };
  }

  // Relacionamentos & Apego
  if (slug.includes('relacionamento') || slug.includes('apego')) {
    return {
      role: 'Você analisa como a pessoa se conecta (ou se desconecta) dos outros e quais padrões repetitivos aparecem.',
      emphasis: 'Foco em PADRÕES RELACIONAIS e VÍNCULOS.',
      sectionOverrides: {
        resumoPrincipal: 'Qual padrão de conexão domina — como a pessoa se comporta nos vínculos.',
        significadoPratico: 'Como isso afeta namoro, amizades, família e trabalho em equipe.',
        padraoIdentificado: 'O estilo de apego ou padrão relacional — evitativo, ansioso, controlador.',
        comoAparece: 'Exemplos de conflitos repetitivos ou dificuldades recorrentes.',
        direcaoAjuste: 'Uma mudança concreta no próximo momento de tensão relacional.',
      },
      extraInstructions: `- Foque em PADRÕES QUE SE REPETEM em diferentes relações
- Identifique o PAPEL que a pessoa assume (salvador, vítima, controlador, evitador)
- O que a pessoa FAZ que afasta os outros ou cria dependência`,
    };
  }

  // Autoimagem & Identidade
  if (slug.includes('autoimagem') || slug.includes('identidade')) {
    return {
      role: 'Você analisa como a pessoa se vê e onde essa visão está distorcida ou limitante.',
      emphasis: 'Foco em AUTOCONCEPÇÃO e CRENÇAS LIMITANTES.',
      sectionOverrides: {
        resumoPrincipal: 'Como a pessoa se enxerga vs como ela realmente funciona.',
        significadoPratico: 'Onde essa autoimagem distorcida limita decisões e oportunidades.',
        padraoIdentificado: 'O tipo de distorção — se subestima, se idealiza, depende de validação.',
        comoAparece: 'Exemplos: evita desafios, se compara demais, não se candidata, aceita menos.',
        direcaoAjuste: 'Uma ação para testar uma crença limitante na prática.',
      },
      extraInstructions: `- Identifique a NARRATIVA INTERNA que a pessoa conta sobre si mesma
- Contraste: como ela se vê vs o que os dados mostram
- As armadilhas mentais devem ser FRASES que a pessoa repete para si mesma`,
    };
  }

  // Dinheiro & Decisão
  if (slug.includes('dinheiro') || slug.includes('financ')) {
    return {
      role: 'Você analisa a relação emocional da pessoa com dinheiro e como isso afeta suas decisões financeiras.',
      emphasis: 'Foco em COMPORTAMENTO FINANCEIRO e DECISÕES COM DINHEIRO.',
      sectionOverrides: {
        resumoPrincipal: 'Qual é a relação real da pessoa com dinheiro — medo, impulso, evitação.',
        significadoPratico: 'Como isso aparece: gastos impulsivos, medo de investir, autossabotagem financeira.',
        padraoIdentificado: 'O perfil financeiro comportamental — gastador emocional, acumulador ansioso, evitador.',
        comoAparece: 'Exemplos: compras por impulso, nunca guarda dinheiro, medo de cobrar.',
        direcaoAjuste: 'Uma mudança concreta na próxima decisão financeira.',
      },
      extraInstructions: `- Identifique se o problema é EMOCIONAL (gasta pra compensar) ou COGNITIVO (não sabe planejar)
- Conecte o padrão financeiro com o padrão emocional da pessoa
- Gatilhos devem ser situações financeiras reais: receber salário, ver promoção, pagar contas`,
    };
  }

  // Padrões Ocultos
  if (slug.includes('oculto') || slug.includes('hidden')) {
    return {
      role: 'Você identifica os padrões que a pessoa NÃO sabe que tem — os mecanismos invisíveis de autossabotagem.',
      emphasis: 'Foco em MECANISMOS INCONSCIENTES e AUTOENGANO.',
      sectionOverrides: {
        resumoPrincipal: 'O padrão que a pessoa jura que não tem — mas que aparece nos dados.',
        significadoPratico: 'As consequências que a pessoa atribui a "azar" ou "circunstâncias".',
        padraoIdentificado: 'O mecanismo oculto — o que a pessoa faz sem perceber que faz.',
        comoAparece: 'Exemplos onde a pessoa sabota o próprio progresso achando que está fazendo certo.',
        direcaoAjuste: 'Uma forma de "pegar" o padrão em ação no dia a dia.',
      },
      extraInstructions: `- Este relatório deve REVELAR algo que a pessoa não quer ouvir
- O ponto cego é o CENTRO deste relatório — deve ser desenvolvido com profundidade
- As armadilhas mentais são as JUSTIFICATIVAS que a pessoa usa para manter o padrão`,
    };
  }

  // Propósito & Sentido de Vida
  if (slug.includes('proposito') || slug.includes('sentido')) {
    return {
      role: 'Você analisa o nível de conexão da pessoa com um senso de direção e significado na vida.',
      emphasis: 'Foco em DIREÇÃO DE VIDA, SIGNIFICADO e ALINHAMENTO.',
      sectionOverrides: {
        resumoPrincipal: 'Qual é o nível real de conexão com propósito — conectado, perdido ou desalinhado.',
        significadoPratico: 'Como a falta de direção aparece: insatisfação, rotina vazia, sensação de "para quê?".',
        padraoIdentificado: 'O tipo de desconexão — vive no piloto automático, segue expectativas dos outros, medo de escolher.',
        comoAparece: 'Exemplos: troca de projetos frequente, insatisfação crônica, comparação com outros.',
        direcaoAjuste: 'Uma reflexão prática para identificar o que realmente importa vs o que é pressão externa.',
      },
      extraInstructions: `- NÃO use linguagem mística ou espiritual — foque em ESCOLHAS e ALINHAMENTO prático
- Diferencie entre NÃO TER propósito e NÃO SEGUIR o propósito que já sabe
- O próximo passo deve ser uma ação de AUTOCONHECIMENTO prático, não meditação genérica`,
    };
  }

  // Default fallback
  return {
    role: 'Você é um analista comportamental que interpreta dados de leituras para gerar diagnósticos claros e úteis.',
    emphasis: 'Foco em padrões concretos e direções práticas.',
    sectionOverrides: {},
    extraInstructions: '',
  };
}

// ── Structured prompt builder ──

function buildStructuredSystemPrompt(prompts: PromptRecord[], categoryCtx: CategoryContext): string {
  const promptMap: Record<string, string> = {};
  prompts.forEach((p) => { promptMap[p.prompt_type] = p.content; });

  const sections: string[] = [];

  // Role definition — category-specific
  sections.push(`# PAPEL
${categoryCtx.role}
Você recebe dados reais de uma leitura comportamental e deve gerar um diagnóstico estruturado usando APENAS os dados fornecidos.
ÊNFASE DESTE TESTE: ${categoryCtx.emphasis}`);

  // Admin-configured prompt sections
  if (promptMap.interpretation) {
    sections.push(`# INSTRUÇÕES DE INTERPRETAÇÃO (definidas pelo administrador)
${promptMap.interpretation}`);
  }

  if (promptMap.diagnosis) {
    sections.push(`# DIAGNÓSTICO FINAL
${promptMap.diagnosis}`);
  }

  if (promptMap.profile) {
    sections.push(`# IDENTIFICAÇÃO DE PERFIL
${promptMap.profile}`);
  }

  if (promptMap.core_pain) {
    sections.push(`# DOR CENTRAL
${promptMap.core_pain}`);
  }

  if (promptMap.triggers) {
    sections.push(`# GATILHOS E ARMADILHAS
${promptMap.triggers}`);
  }

  if (promptMap.direction) {
    sections.push(`# DIREÇÃO PRÁTICA
${promptMap.direction}`);
  }

  if (promptMap.restrictions) {
    sections.push(`# RESTRIÇÕES OBRIGATÓRIAS
${promptMap.restrictions}`);
  }

  // Hard rules — always enforced regardless of admin prompts
  sections.push(`# REGRAS INVIOLÁVEIS

1. LINGUAGEM SIMPLES — COMO CONVERSA
   - Escreva como se estivesse explicando para um amigo inteligente que NÃO é psicólogo
   - Use palavras do dia a dia. Proibido: "resiliência", "protagonismo", "autoboicote", "ressignificar", "empoderamento", "assertividade", "proatividade", "autoconhecimento", "autossabotagem consciente", "padrão disfuncional"
   - Em vez de termos técnicos, DESCREVA o que acontece: "você trava quando precisa decidir" em vez de "paralisia decisória"
   - Frases curtas — máximo 1,5 linhas. Se a frase precisa de vírgula no meio, quebre em duas.
   - Proibido parágrafos com mais de 3 frases seguidas

2. ZERO PSICOLOGUÊS
   - Não use termos que só um terapeuta entenderia
   - Não use linguagem de autoajuda ("acredite no seu potencial", "honre sua jornada")
   - Não use linguagem acadêmica ("dinâmica relacional", "mecanismo compensatório")
   - Teste: se sua avó não entenderia a frase, reescreva

3. INTERPRETAR, NÃO INVENTAR
   - Use SOMENTE os dados fornecidos (scores, eixos, padrões)
   - Não invente situações ou exemplos pessoais
   - Cada afirmação deve ser rastreável a um score

4. ESPECIFICIDADE OBRIGATÓRIA
   - Proibido: "tenha mais foco", "acredite em si mesmo", "saia da zona de conforto"
   - Cada frase deve conter o padrão ESPECÍFICO do usuário
   - Se não conseguir ser específico, não escreva

5. FORMATO
   - Fale em segunda pessoa ("você")
   - Não mencione nomes de variáveis ou percentuais numéricos
   - Seja direto — desconforto é aceitável, generalidade não
   - Responda EXCLUSIVAMENTE em JSON válido

6. BREVIDADE
   - criticalDiagnosis / resumoPrincipal: máximo 2 frases curtas
   - corePain / significadoPratico: máximo 3 frases
   - mechanism / padraoIdentificado: máximo 3 frases
   - summary: máximo 1 parágrafo curto (3 frases)
   - triggers / gatilhos: máximo 4 itens, cada um com 1 frase curta
   - whatNotToDo / oQueEvitar: máximo 4 itens, cada um com 1 frase curta
   - exitStrategy: máximo 4 passos, ações curtas e executáveis
   - mentalTraps: máximo 4 frases curtas entre aspas

7. EXEMPLOS DE TOM CORRETO
   - ❌ "Você apresenta um padrão de evitação emocional que compromete sua capacidade de engajamento relacional"
   - ✅ "Você foge de conversas difíceis. Quando algo incomoda, você muda de assunto ou some."
   - ❌ "Há uma dinâmica de autossabotagem que se manifesta na procrastinação funcional"
   - ✅ "Você sabe o que precisa fazer, mas fica adiando. Quando finalmente faz, já está atrasado e faz mal feito."`);

  sections.push(`# CAMADA DE PROFUNDIDADE

Antes de gerar o diagnóstico:
1. Cruze o padrão dominante com os secundários — como um alimenta o outro?
2. Identifique onde o usuário diz uma coisa e faz outra (use as respostas)
3. A dor central NÃO é o padrão reformulado — é o mecanismo invisível por trás
4. Teste anti-genericidade: se a frase serve para qualquer pessoa, reescreva
5. Coerência: corePain → mechanism → contradiction → direction → firstAction`);
  return sections.join("\n\n---\n\n");
}

interface StructuredAnswer {
  questionId: number;
  questionText: string;
  questionType: string;
  axes: string[];
  value: number;
  chosenOption: string | null;
}

function buildAnswersSummary(answers: StructuredAnswer[]): string {
  if (!answers || answers.length === 0) return "Respostas brutas não disponíveis.";

  // Group answers by axis for pattern detection
  const byAxis: Record<string, { question: string; value: number; option: string | null }[]> = {};
  answers.forEach(a => {
    a.axes.forEach(axis => {
      if (!byAxis[axis]) byAxis[axis] = [];
      byAxis[axis].push({ question: a.questionText, value: a.value, option: a.chosenOption });
    });
  });

  const lines: string[] = [];

  // High-signal answers (extremes: 1 or 5 on likert, reveal strong positions)
  const extremes = answers.filter(a => a.value === 1 || a.value >= 5);
  if (extremes.length > 0) {
    lines.push("### RESPOSTAS EXTREMAS (sinais fortes):");
    extremes.forEach(a => {
      const label = a.value >= 5 ? "CONCORDÂNCIA TOTAL" : "DISCORDÂNCIA TOTAL";
      const optionText = a.chosenOption ? ` → "${a.chosenOption}"` : "";
      lines.push(`- [${label}] "${a.questionText}" (eixos: ${a.axes.join(", ")})${optionText}`);
    });
  }

  // Behavior choice answers (direct behavioral evidence)
  const behaviorChoices = answers.filter(a => a.questionType === 'behavior_choice' && a.chosenOption);
  if (behaviorChoices.length > 0) {
    lines.push("\n### ESCOLHAS COMPORTAMENTAIS (comportamento real):");
    behaviorChoices.forEach(a => {
      lines.push(`- "${a.questionText}" → escolheu: "${a.chosenOption}" (eixos: ${a.axes.join(", ")})`);
    });
  }

  // Inconsistency detection: same axis, opposing answers
  lines.push("\n### INCONSISTÊNCIAS DETECTADAS:");
  let hasInconsistency = false;
  Object.entries(byAxis).forEach(([axis, items]) => {
    const values = items.map(i => i.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max - min >= 3 && items.length >= 2) {
      hasInconsistency = true;
      const high = items.find(i => i.value === max);
      const low = items.find(i => i.value === min);
      lines.push(`- Eixo "${axis}": resposta alta (${max}) em "${high?.question}" vs baixa (${min}) em "${low?.question}" — possível autoengano ou ambivalência`);
    }
  });
  if (!hasInconsistency) {
    lines.push("- Nenhuma inconsistência extrema detectada nos mesmos eixos.");
  }

  return lines.join("\n");
}

function buildUserPrompt(
  userContext: string,
  slug: string,
  intensity: string,
  scoresSummary: string,
  dominant: ScoreEntry,
  secondary: ScoreEntry[],
  contradictions: string,
  answersSummary: string,
  categoryCtx: CategoryContext
): string {
  const ov = categoryCtx.sectionOverrides;
  return `${userContext}
Teste: ${slug}
Intensidade geral: ${intensity}

## DADOS DOS EIXOS (base obrigatória para toda interpretação):
${scoresSummary}

## PADRÃO DOMINANTE: ${dominant.label} (intensidade: ${dominant.percentage > 75 ? 'alta' : dominant.percentage > 50 ? 'moderada' : 'leve'})
${secondary.length > 0
    ? `## PADRÕES SECUNDÁRIOS: ${secondary.map((s) => `${s.label} (${s.percentage > 75 ? 'alta' : s.percentage > 50 ? 'moderada' : 'leve'})`).join(", ")}`
    : "Sem padrões secundários significativos."}

## CRUZAMENTOS E CONTRADIÇÕES DETECTADOS:
${contradictions}

## EVIDÊNCIAS DAS RESPOSTAS DO USUÁRIO:
${answersSummary}

---

Gere o diagnóstico em JSON com esta estrutura EXATA de 9 seções. LEMBRE-SE: linguagem simples, como conversa. Nada de psicologuês. Cada seção deve ser CURTA e NÃO repetir ideias de outra seção:
{
  "resumoPrincipal": "${ov.resumoPrincipal || '2-3 frases diretas e simples. O que está acontecendo com essa pessoa.'}",
  "significadoPratico": "${ov.significadoPratico || 'O que isso causa na vida real — 2-3 frases concretas. DIFERENTE do resumo.'}",
  "padraoIdentificado": "${ov.padraoIdentificado || 'Nome curto e claro do padrão (3-5 palavras) + 1-2 frases explicando como funciona.'}",
  "comoAparece": "${ov.comoAparece || '2-3 exemplos do dia a dia — situações reais, não conceitos abstratos.'}",
  "gatilhos": ["3-4 situações reais e específicas que ativam o padrão — frases curtas"],
  "impactoVida": [{"area": "área da vida", "efeito": "o que acontece de concreto — 1 frase simples"}],
  "direcaoAjuste": "${ov.direcaoAjuste || 'A primeira mudança concreta — tão clara que não precise pensar duas vezes.'}",
  "oQueEvitar": ["3-4 coisas específicas para PARAR de fazer agora — escritas como conselho de amigo"],
  "proximoPasso": "${ov.proximoPasso || 'UMA ação simples para os próximos 3 dias — qualquer pessoa entende na primeira leitura.'}",

  "profileName": "Nome criativo do perfil (3-5 palavras)",
  "combinedTitle": "Título combinado dos padrões",
  "blindSpot": {"perceivedProblem": "O que a pessoa acha que é o problema (linguagem simples)", "realProblem": "O que realmente acontece (linguagem simples)"},
  "criticalDiagnosis": "Copie o conteúdo de resumoPrincipal",
  "corePain": "Copie o conteúdo de significadoPratico",
  "mentalState": "Estado mental atual em 1 frase simples",
  "summary": "Copie o conteúdo de resumoPrincipal",
  "mechanism": "Copie o conteúdo de padraoIdentificado",
  "contradiction": "A contradição interna principal — 1 frase clara e simples",
  "impact": "Impacto geral — 1 frase direta",
  "direction": "Copie o conteúdo de direcaoAjuste",
  "keyUnlockArea": "Copie o conteúdo de direcaoAjuste",
  "blockingPoint": "Onde exatamente a pessoa trava — 1 frase simples",
  "triggers": ["mesmos gatilhos acima"],
  "mentalTraps": ["3-4 pensamentos que a pessoa repete pra si mesma e que mantêm o padrão — entre aspas, linguagem natural"],
  "selfSabotageCycle": ["3-4 etapas do ciclo em ordem — frases curtas e claras"],
  "whatNotToDo": ["mesmos itens de oQueEvitar"],
  "lifeImpact": [{"pillar": "área", "impact": "efeito concreto"}],
  "exitStrategy": [{"step": 1, "title": "título curto", "action": "ação clara e executável"}],
  "actionPlan": [{"area": "área com nota < 7", "score": 5, "actions": ["ação concreta e simples"]}],
  "firstAction": "Copie o conteúdo de proximoPasso"
}

REGRAS FINAIS:
- NÃO repita a mesma ideia entre seções. Cada uma traz informação NOVA.
- Frases curtas (máx 1,5 linhas). Sem parágrafos longos.
- ZERO palavras rebuscadas. Se existe uma palavra simples, use ela.
- actionPlan: só para áreas abaixo de 70%. Ações com verbo no imperativo.
- Se não houver áreas abaixo de 70%, retorne actionPlan como [].`;
}

function detectContradictions(scores: ScoreEntry[]): string {
  const scoreMap: Record<string, number> = {};
  scores.forEach((s) => { scoreMap[s.key] = s.percentage; });

  const contradictions: string[] = [];

  // High self-criticism + high validation dependency
  if ((scoreMap['excessive_self_criticism'] ?? 0) >= 60 && (scoreMap['validation_dependency'] ?? 0) >= 60) {
    contradictions.push("- Alta autocrítica combinada com dependência de validação: se critica internamente mas precisa de aprovação externa para agir");
  }

  // High perfectionism + low execution
  if ((scoreMap['paralyzing_perfectionism'] ?? 0) >= 60 && (scoreMap['unstable_execution'] ?? 0) >= 60) {
    contradictions.push("- Perfeccionismo alto com execução instável: exige perfeição de si mesmo mas não consegue manter consistência");
  }

  // High discomfort escape + high functional overload
  if ((scoreMap['discomfort_escape'] ?? 0) >= 60 && (scoreMap['functional_overload'] ?? 0) >= 60) {
    contradictions.push("- Fuga do desconforto com sobrecarga funcional: evita o que incomoda mas se sobrecarrega com atividades compensatórias");
  }

  // High self-criticism + low routine
  if ((scoreMap['excessive_self_criticism'] ?? 0) >= 60 && (scoreMap['low_routine_sustenance'] ?? 0) >= 60) {
    contradictions.push("- Autocrítica alta com baixa sustentação de rotina: se cobra intensamente mas não sustenta as mudanças que exige de si");
  }

  // Emotional sabotage + validation dependency
  if ((scoreMap['emotional_self_sabotage'] ?? 0) >= 60 && (scoreMap['validation_dependency'] ?? 0) >= 60) {
    contradictions.push("- Autossabotagem emocional com dependência de validação: sabota relações mas depende delas para se sentir válido");
  }

  if (contradictions.length === 0) {
    contradictions.push("- Sem contradições extremas detectadas. Analisar nuances entre os eixos com scores intermediários.");
  }

  return contradictions.join("\n");
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { test_module_id, scores, slug, refine_level, answers: structuredAnswers } = await req.json() as {
      test_module_id: string;
      scores: ScoreEntry[];
      slug: string;
      refine_level?: number;
      answers?: StructuredAnswer[];
    };

    if (!test_module_id || !scores || !Array.isArray(scores)) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active prompts for THIS specific test
    const { data: prompts, error: promptsError } = await adminClient
      .from("test_prompts")
      .select("prompt_type, title, content")
      .eq("test_id", test_module_id)
      .eq("is_active", true);

    if (promptsError) {
      console.error("Error fetching prompts:", promptsError);
      return new Response(JSON.stringify({ error: "Erro ao carregar configuração do diagnóstico" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No prompts → fallback to local analysis
    if (!prompts || prompts.length === 0) {
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user profile for context
    const { data: profile } = await userClient
      .from("profiles")
      .select("name, age")
      .eq("user_id", user.id)
      .maybeSingle();

    // Build analysis data
    const sortedScores = [...scores].sort((a, b) => b.percentage - a.percentage);
    const dominant = sortedScores[0];
    const secondary = sortedScores.filter((s, i) => i > 0 && s.percentage >= 40).slice(0, 3);
    const intensity = dominant.percentage >= 75 ? "alto" : dominant.percentage >= 50 ? "moderado" : "leve";

    const scoresSummary = sortedScores
      .map((s) => `- ${s.label}: intensidade ${s.percentage >= 75 ? 'ALTA' : s.percentage >= 50 ? 'MODERADA' : 'LEVE'} (${s.percentage}%)`)
      .join("\n");

    const contradictions = detectContradictions(sortedScores);

    // Build structured prompts
    const systemPrompt = buildStructuredSystemPrompt(prompts as PromptRecord[]);

    const userContext = profile
      ? `Usuário: ${profile.name || "Anônimo"}${profile.age ? `, ${profile.age} anos` : ""}`
      : "Usuário anônimo";

    const answersSummary = buildAnswersSummary(structuredAnswers || []);

    const userPrompt = buildUserPrompt(
      userContext, slug, intensity, scoresSummary, dominant, secondary, contradictions, answersSummary
    );

    // Build refine instruction if needed
    const refineLevel = refine_level ?? 0;
    const refineInstruction = refineLevel > 0 ? `

---

# INSTRUÇÃO DE REFINAMENTO (nível ${refineLevel})

A resposta anterior foi considerada GENÉRICA ou VAGA. Aplique estas exigências adicionais:

${refineLevel >= 1 ? `- PROIBIDO usar frases como "tenha mais foco", "acredite em si", "busque equilíbrio", "saia da zona de conforto"
- Cada frase DEVE conter uma referência direta ao padrão específico detectado nos dados
- O diagnóstico crítico deve incluir uma CAUSA raiz e uma CONSEQUÊNCIA observável
- A contradição deve ser entre dois comportamentos CONCRETOS, não entre conceitos abstratos` : ""}
${refineLevel >= 2 ? `- A dor central deve explicar o MECANISMO que sustenta o problema — não apenas nomeá-lo
- O ponto cego deve surpreender — não pode ser óbvio
- A primeira ação deve ser executável em 72h com critério de sucesso mensurável
- As restrições (o que não fazer) devem ser contra-intuitivas, não óbvias` : ""}
${refineLevel >= 3 ? `- Use linguagem que gere IMPACTO EMOCIONAL — o usuário deve se sentir lido com precisão cirúrgica
- Cada seção deve conter pelo menos uma frase que o usuário NÃO esperaria ler
- O resumo deve funcionar como um espelho — o usuário deve reconhecer seus comportamentos reais` : ""}
` : "";

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch AI config: test-specific first, then global fallback
    let aiModel = "google/gemini-3-flash-preview";
    let aiTemperature: number | undefined;
    let aiMaxTokens: number | undefined;

    try {
      // Check for test-specific config
      const { data: testConfig } = await adminClient
        .from("test_ai_config")
        .select("use_global_defaults, ai_enabled, temperature, max_tokens, tone, depth_level, report_style")
        .eq("test_id", test_module_id)
        .maybeSingle();

      // Fetch global config
      const { data: globalConfig } = await adminClient
        .from("global_ai_config")
        .select("ai_model, temperature, max_tokens, tone, depth_level, report_style")
        .limit(1)
        .maybeSingle();

      if (globalConfig?.ai_model) aiModel = globalConfig.ai_model;

      // Use test-specific params when use_global_defaults is false
      if (testConfig && !testConfig.use_global_defaults) {
        aiTemperature = testConfig.temperature;
        aiMaxTokens = testConfig.max_tokens;
      } else if (globalConfig) {
        aiTemperature = globalConfig.temperature;
        aiMaxTokens = globalConfig.max_tokens;
      }
    } catch { /* use defaults */ }

    const aiBody: Record<string, unknown> = {
      model: aiModel,
      messages: [
        { role: "system", content: systemPrompt + (refineLevel > 0 ? refineInstruction : "") },
        { role: "user", content: userPrompt },
      ],
    };
    if (aiTemperature !== undefined) aiBody.temperature = aiTemperature;
    if (aiMaxTokens !== undefined) aiBody.max_tokens = aiMaxTokens;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiBody),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON
    let result;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      result = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate: accept either new template or legacy fields
    const hasNewTemplate = result.resumoPrincipal && result.significadoPratico;
    const hasLegacy = result.criticalDiagnosis && result.corePain;
    
    if (!hasNewTemplate && !hasLegacy) {
      console.error("AI response missing required fields");
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cross-fill between new and legacy fields
    if (!result.criticalDiagnosis) result.criticalDiagnosis = result.resumoPrincipal || "";
    if (!result.corePain) result.corePain = result.significadoPratico || "";
    if (!result.mechanism) result.mechanism = result.padraoIdentificado || "";
    if (!result.mentalState) result.mentalState = result.comoAparece || "";
    if (!result.direction) result.direction = result.direcaoAjuste || "";
    if (!result.keyUnlockArea) result.keyUnlockArea = result.direcaoAjuste || "";
    if (!result.summary) result.summary = result.resumoPrincipal || "";
    if (!result.profileName) result.profileName = "";
    if (!result.contradiction) result.contradiction = "";

    // Ensure arrays and objects
    ["triggers", "mentalTraps", "selfSabotageCycle", "whatNotToDo", "gatilhos", "oQueEvitar"].forEach((f) => {
      if (!Array.isArray(result[f])) result[f] = [];
    });
    if (!Array.isArray(result.lifeImpact)) result.lifeImpact = [];
    if (!Array.isArray(result.impactoVida)) result.impactoVida = [];
    if (!Array.isArray(result.exitStrategy)) result.exitStrategy = [];
    if (!result.blindSpot || typeof result.blindSpot !== "object") {
      result.blindSpot = { perceivedProblem: "", realProblem: "" };
    }
    if (!result.firstAction) result.firstAction = result.proximoPasso || "";
    if (!result.blockingPoint) result.blockingPoint = "";
    if (!result.impact) result.impact = "";
    if (!result.combinedTitle) result.combinedTitle = `${dominant.label}`;
    if (!Array.isArray(result.actionPlan)) result.actionPlan = [];

    return new Response(JSON.stringify({ analysis: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-test error:", e);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
