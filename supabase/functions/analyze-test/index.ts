import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 1: Constants & Types
// ═══════════════════════════════════════════════════════════

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

interface ReportTemplate {
  sections: TemplateSection[];
  output_rules: OutputRules;
}

interface TemplateSection {
  key: string;
  name: string;
  maxSize: number;
  required: boolean;
}

interface OutputRules {
  tone?: string;
  simplicityLevel?: number;
  maxSentencesPerBlock?: number;
  maxTotalBlocks?: number;
  repetitionProhibited?: boolean;
  requiredBlocks?: string[];
  forbiddenLanguage?: string[];
}

interface CategoryContext {
  role: string;
  emphasis: string;
  sectionOverrides: Record<string, string>;
  extraInstructions: string;
}

interface StructuredAnswer {
  questionId: number;
  questionText: string;
  questionType: string;
  axes: string[];
  value: number;
  mappedScore?: number;
  chosenOption: string | null;
}

interface RequestBody {
  test_module_id: string;
  scores: ScoreEntry[];
  slug: string;
  refine_level?: number;
  answers?: StructuredAnswer[];
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 2: Helpers — Error & Rate Limiting
// ═══════════════════════════════════════════════════════════

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function fallbackResponse(): Response {
  return jsonResponse({ useFallback: true });
}

/** Simple in-memory rate limiter per user (resets on cold start) */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 analyses per minute per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 3: Category Context (data-driven)
// ═══════════════════════════════════════════════════════════

const NEURO_BASE = `
VOCABULÁRIO NEUROCIENTÍFICO (use naturalmente, sem jargão pesado):
- TÉTRADE EMOCIONAL: Todo estado emocional é formado por 4 pilares — CRENÇAS (o que a pessoa acredita ser verdade), LINGUAGEM INTERNA (o que ela diz para si mesma), FOCO (para onde direciona a atenção) e FISIOLOGIA (como o corpo responde). Identifique qual pilar da Tétrade está mais desregulado.
- METAPROGRAMAS: Filtros mentais automáticos que determinam como a pessoa processa informação — Proativo vs Reativo (age ou espera?), Referência Interna vs Externa (decide por si ou precisa de aprovação?), Associador vs Desassociador (se conecta ou se distancia emocionalmente?). Identifique os metaprogramas dominantes nas respostas.
- PSICOADAPTAÇÃO: O cérebro se adapta ao sofrimento e transforma o padrão disfuncional em "normal". A pessoa não muda porque o desconforto virou familiar — o cérebro prefere o sofrimento CONHECIDO ao desconforto DESCONHECIDO da mudança. Explique onde a psicoadaptação mantém o padrão ativo.
- ANCORAGEM: Estímulos (situações, pessoas, lugares) que ativam automaticamente um estado emocional ou comportamento. Identifique as ÂNCORAS NEGATIVAS (o que dispara o padrão ruim) e sugira ÂNCORAS DE RECURSO (o que pode disparar um estado melhor).
- ESTADOS COM/SEM RECURSOS: A pessoa alterna entre estados "com recursos" (calma, clareza, energia) e "sem recursos" (ansiedade, confusão, paralisia). O padrão se ativa quando ela entra em estado sem recursos. Identifique o que a tira do estado de recursos.`;

interface CategoryDef {
  match: (slug: string) => boolean;
  role: string;
  emphasis: string;
  overrides: Record<string, string>;
  extra: string;
}

const CATEGORY_DEFS: CategoryDef[] = [
  {
    match: (s) => s === "mapa-de-vida",
    role: "Você analisa a satisfação do usuário em cada área da vida e identifica onde ele precisa agir primeiro, usando princípios de neurociência comportamental.",
    emphasis: "Foco em EQUILÍBRIO entre as áreas, PRIORIZAÇÃO de ação e identificação de ÂNCORAS de desequilíbrio.",
    overrides: {
      resumoPrincipal: "Qual área da vida está mais desequilibrada e o que isso causa nas outras. Identifique o metaprograma dominante (proativo/reativo) em cada área.",
      significadoPratico: "Como esse desequilíbrio aparece na rotina real — use o conceito de Tétrade para explicar: qual crença, linguagem interna, foco ou fisiologia mantém o desequilíbrio.",
      padraoIdentificado: "Qual padrão de negligência ou compensação entre áreas. A psicoadaptação fez esse desequilíbrio parecer \"normal\"?",
      direcaoAjuste: "Qual área priorizar primeiro e por quê — crie uma ÂNCORA DE RECURSO para essa área.",
      proximoPasso: "Uma ação para esta semana na área mais crítica que quebre a psicoadaptação.",
    },
    extra: `- Mencione as ÁREAS DA VIDA específicas (saúde, finanças, relacionamento, etc.)
- Compare áreas fortes vs fracas — o que uma compensa na outra?
- O plano de ação deve ser POR ÁREA, não genérico
- Identifique onde a PSICOADAPTAÇÃO fez o desequilíbrio parecer aceitável
- Sugira uma ÂNCORA DE RECURSO prática para a área mais crítica`,
  },
  {
    match: (s) => s === "padrao-comportamental",
    role: "Você identifica os padrões invisíveis de comportamento (circuitos neurais automatizados) que travam a pessoa sem ela perceber.",
    emphasis: "Foco em PADRÕES REPETITIVOS, MECANISMOS AUTOMÁTICOS e METAPROGRAMAS dominantes.",
    overrides: {
      resumoPrincipal: "Qual padrão domina e como ele funciona por baixo das decisões conscientes. Identifique o metaprograma dominante (proativo/reativo, interno/externo).",
      significadoPratico: "Em quais decisões do dia a dia esse padrão aparece — quais ÂNCORAS NEGATIVAS ativam o ciclo.",
      comoAparece: "Situações concretas onde o padrão se ativa sem a pessoa perceber. Use a Tétrade: qual pilar (crença, linguagem, foco ou fisiologia) está disparando?",
      direcaoAjuste: "Qual comportamento automático interromper primeiro — crie uma ÂNCORA DE RECURSO substituta.",
    },
    extra: `- Foque em MECANISMOS AUTOMÁTICOS — coisas que a pessoa faz no piloto automático
- Identifique o CICLO: gatilho (âncora) → reação automática → consequência → reforço (psicoadaptação)
- O ponto cego deve revelar algo que a pessoa genuinamente não vê
- Identifique se a pessoa opera com metaprograma REATIVO (espera acontecer) ou PROATIVO (age antes)
- Explique onde a PSICOADAPTAÇÃO tornou o padrão "invisível"`,
  },
  {
    match: (s) => s.includes("execucao") || s.includes("produtividade"),
    role: "Você analisa por que a pessoa não consegue executar com consistência, usando neurociência para explicar o mecanismo de travamento.",
    emphasis: "Foco em EXECUÇÃO, CONSISTÊNCIA, PROCRASTINAÇÃO e o metaprograma Proativo/Reativo.",
    overrides: {
      resumoPrincipal: "Onde exatamente a execução trava — qual pilar da Tétrade (crença, foco, linguagem interna ou fisiologia) está bloqueando a ação.",
      significadoPratico: "Como essa falha de execução aparece no trabalho. Quais ÂNCORAS NEGATIVAS associam \"começar\" a desconforto.",
      padraoIdentificado: "O tipo de procrastinação ou bloqueio — nomeie o mecanismo específico. A pessoa é Reativa (espera motivação) ou o problema é Desassociação (se desconecta da consequência)?",
      comoAparece: "Exemplos: prazos perdidos, projetos abandonados, ciclos de motivação que somem. A psicoadaptação faz isso parecer \"normal\"?",
      direcaoAjuste: "A menor ação possível para quebrar o ciclo de inação — uma ÂNCORA DE RECURSO para associar \"começar\" a algo positivo.",
    },
    extra: `- NÃO diga "tenha mais disciplina" — explique o que CAUSA a falta de execução usando neurociência
- Identifique se o problema é INÍCIO (não começa), SUSTENTAÇÃO (não mantém) ou FINALIZAÇÃO (não termina)
- Gatilhos devem ser sobre SITUAÇÕES DE TRABALHO/ROTINA reais
- Identifique o metaprograma: PROATIVO (age sem esperar) vs REATIVO (precisa de pressão externa)
- Explique como a PSICOADAPTAÇÃO transformou a procrastinação em rotina "aceitável"`,
  },
  {
    match: (s) => s.includes("emocional") || s.includes("emocoes") || s.includes("reatividade"),
    role: "Você analisa como as emoções controlam as decisões da pessoa, usando a Tétrade Emocional para mapear o mecanismo.",
    emphasis: "Foco em REAÇÕES EMOCIONAIS, REGULAÇÃO e os 4 pilares da TÉTRADE.",
    overrides: {
      resumoPrincipal: "Qual emoção domina e como ela sequestra as decisões. Mapeie pela Tétrade: qual CRENÇA alimenta, qual LINGUAGEM INTERNA reforça, para onde vai o FOCO e como o CORPO reage.",
      significadoPratico: "Em quais situações a pessoa reage de forma desproporcional — quais são as ÂNCORAS NEGATIVAS que disparam a reatividade.",
      padraoIdentificado: "O tipo de reatividade — explosiva, supressiva, evitativa. A pessoa é Associadora (sente tudo intensamente) ou Desassociadora (se desconecta para não sentir)?",
      comoAparece: "Exemplos de reações que a pessoa se arrepende depois. Qual estado \"sem recursos\" ela entra.",
      direcaoAjuste: "Uma técnica simples para o momento entre o gatilho e a reação — uma ÂNCORA DE RECURSO para acessar estado com recursos.",
    },
    extra: `- Identifique a EMOÇÃO DOMINANTE (raiva, ansiedade, medo, tristeza)
- Diferencie entre SENTIR a emoção (normal) e SER CONTROLADO por ela (problema)
- Gatilhos devem ser emocionais: situações que disparam reações intensas
- Use a TÉTRADE para explicar: qual dos 4 pilares está mais desregulado
- Identifique o metaprograma ASSOCIADOR (sente demais) vs DESASSOCIADOR (anestesia emoções)
- Sugira ÂNCORAS DE RECURSO para acessar calma nos momentos de crise`,
  },
  {
    match: (s) => s.includes("relacionamento") || s.includes("apego"),
    role: "Você analisa como a pessoa se conecta (ou se desconecta) dos outros e quais metaprogramas relacionais dominam.",
    emphasis: "Foco em PADRÕES RELACIONAIS, VÍNCULOS e o metaprograma Referência Interna/Externa.",
    overrides: {
      resumoPrincipal: "Qual padrão de conexão domina — a pessoa tem Referência Interna (decide sozinha, se isola) ou Externa (depende do outro para validação)?",
      significadoPratico: "Como isso afeta namoro, amizades, família. Quais ÂNCORAS NEGATIVAS (situações, pessoas, memórias) disparam o padrão relacional.",
      padraoIdentificado: "O estilo de apego ou padrão relacional. A psicoadaptação fez esse padrão parecer \"jeito de ser\"?",
      comoAparece: "Exemplos de conflitos repetitivos. Qual pilar da Tétrade está mais ativo nos conflitos (crença sobre si, linguagem interna, foco no outro ou reação do corpo)?",
      direcaoAjuste: "Uma mudança concreta no próximo momento de tensão relacional — uma ÂNCORA DE RECURSO para manter estado com recursos durante conflitos.",
    },
    extra: `- Foque em PADRÕES QUE SE REPETEM em diferentes relações
- Identifique o PAPEL que a pessoa assume (salvador, vítima, controlador, evitador)
- O que a pessoa FAZ que afasta os outros ou cria dependência
- Identifique o metaprograma: REFERÊNCIA INTERNA (não precisa de ninguém) vs EXTERNA (precisa de aprovação constante)
- Explique como a PSICOADAPTAÇÃO normalizou o padrão relacional disfuncional`,
  },
  {
    match: (s) => s.includes("autoimagem") || s.includes("identidade"),
    role: "Você analisa como a pessoa se vê e onde essa visão está distorcida, usando a Tétrade para mapear as crenças centrais.",
    emphasis: "Foco em AUTOCONCEPÇÃO, CRENÇAS CENTRAIS e o pilar CRENÇAS da Tétrade.",
    overrides: {
      resumoPrincipal: "Como a pessoa se enxerga vs como ela realmente funciona. Qual CRENÇA central (pilar 1 da Tétrade) sustenta essa distorção.",
      significadoPratico: "Onde essa autoimagem distorcida limita decisões. Qual LINGUAGEM INTERNA (pilar 2 da Tétrade) reforça: \"eu não consigo\", \"eu não mereço\", \"eu não sou suficiente\".",
      padraoIdentificado: "O tipo de distorção — se subestima, se idealiza, depende de validação. A pessoa tem Referência Interna (se julga sozinha) ou Externa (precisa que outros validem)?",
      comoAparece: "Exemplos: evita desafios, se compara demais, não se candidata, aceita menos. A psicoadaptação tornou essa identidade \"confortável\"?",
      direcaoAjuste: "Uma ação para testar uma crença limitante na prática — crie uma ÂNCORA DE RECURSO que contradiga a crença central.",
    },
    extra: `- Identifique a NARRATIVA INTERNA que a pessoa conta sobre si mesma (pilar LINGUAGEM da Tétrade)
- Contraste: como ela se vê vs o que os dados mostram
- As armadilhas mentais devem ser FRASES que a pessoa repete para si mesma
- Identifique qual CRENÇA CENTRAL (Tétrade) está na raiz da distorção
- Explique como a PSICOADAPTAÇÃO transformou essa crença em "identidade"`,
  },
  {
    match: (s) => s.includes("dinheiro") || s.includes("financ"),
    role: "Você analisa a relação emocional da pessoa com dinheiro usando neurociência — quais âncoras e crenças controlam as decisões financeiras.",
    emphasis: "Foco em COMPORTAMENTO FINANCEIRO, ÂNCORAS com dinheiro e CRENÇAS da Tétrade sobre abundância/escassez.",
    overrides: {
      resumoPrincipal: "Qual é a relação real da pessoa com dinheiro — medo, impulso, evitação. Qual CRENÇA central (Tétrade) governa: \"dinheiro é difícil\", \"não mereço ter\", \"se ganhar vou perder\".",
      significadoPratico: "Como isso aparece: gastos impulsivos, medo de investir. Quais ÂNCORAS NEGATIVAS associam dinheiro a estresse, culpa ou medo.",
      padraoIdentificado: "O perfil financeiro comportamental. A PSICOADAPTAÇÃO fez o padrão financeiro parecer \"meu jeito de lidar com dinheiro\"?",
      comoAparece: "Exemplos: compras por impulso, nunca guarda dinheiro, medo de cobrar. Identifique se a pessoa é DESASSOCIADORA (não olha para os números) ou ASSOCIADORA demais (ansiedade com cada centavo).",
      direcaoAjuste: "Uma mudança concreta na próxima decisão financeira — crie uma ÂNCORA DE RECURSO que associe dinheiro a segurança em vez de estresse.",
    },
    extra: `- Identifique se o problema é EMOCIONAL (gasta pra compensar) ou COGNITIVO (não sabe planejar)
- Conecte o padrão financeiro com o padrão emocional da pessoa
- Gatilhos devem ser situações financeiras reais: receber salário, ver promoção, pagar contas
- Use a TÉTRADE para mapear: qual CRENÇA sobre dinheiro, qual LINGUAGEM INTERNA ("não dá pra mim"), onde está o FOCO (escassez ou oportunidade)
- Explique como a PSICOADAPTAÇÃO normalizou a relação disfuncional com dinheiro`,
  },
  {
    match: (s) => s.includes("oculto") || s.includes("hidden"),
    role: "Você identifica os padrões que a pessoa NÃO sabe que tem — os circuitos neurais que operam abaixo da consciência.",
    emphasis: "Foco em MECANISMOS INCONSCIENTES, AUTOENGANO e PSICOADAPTAÇÃO profunda.",
    overrides: {
      resumoPrincipal: "O padrão que a pessoa jura que não tem — mas que aparece nos dados. Use os METAPROGRAMAS para revelar: como ela filtra a realidade sem perceber.",
      significadoPratico: "As consequências que a pessoa atribui a \"azar\" ou \"circunstâncias\". A PSICOADAPTAÇÃO é tão profunda que o padrão se tornou \"personalidade\".",
      padraoIdentificado: "O mecanismo oculto — qual pilar da TÉTRADE (crença inconsciente, linguagem interna automática, foco seletivo ou tensão corporal) está operando.",
      comoAparece: "Exemplos onde a pessoa sabota o próprio progresso achando que está fazendo certo. Quais ÂNCORAS NEGATIVAS operam sem percepção consciente.",
      direcaoAjuste: "Uma forma de \"pegar\" o padrão em ação no dia a dia — interromper a ANCORAGEM automática.",
    },
    extra: `- Este relatório deve REVELAR algo que a pessoa não quer ouvir
- O ponto cego é o CENTRO deste relatório — deve ser desenvolvido com profundidade
- As armadilhas mentais são as JUSTIFICATIVAS que a pessoa usa para manter o padrão
- A PSICOADAPTAÇÃO é o conceito central aqui — o padrão se tornou "eu sou assim"
- Use METAPROGRAMAS para mostrar como a pessoa filtra a realidade para não ver o padrão
- Identifique ÂNCORAS NEGATIVAS inconscientes que mantêm o ciclo ativo`,
  },
  {
    match: (s) => s.includes("proposito") || s.includes("sentido"),
    role: "Você analisa o nível de conexão da pessoa com um senso de direção e significado, usando neurociência para explicar por que o cérebro evita escolher.",
    emphasis: "Foco em DIREÇÃO DE VIDA, SIGNIFICADO, ALINHAMENTO e o metaprograma Proativo/Reativo.",
    overrides: {
      resumoPrincipal: "Qual é o nível real de conexão com propósito — conectado, perdido ou desalinhado. A pessoa é PROATIVA (cria direção) ou REATIVA (espera que a vida mostre)?",
      significadoPratico: "Como a falta de direção aparece. Qual pilar da TÉTRADE está travando: CRENÇA (\"não sei o que quero\"), FOCO (disperso em muitas coisas) ou LINGUAGEM INTERNA (\"para quê?\").",
      padraoIdentificado: "O tipo de desconexão — vive no piloto automático, segue expectativas dos outros, medo de escolher. A PSICOADAPTAÇÃO transformou a falta de propósito em \"rotina normal\"?",
      comoAparece: "Exemplos: troca de projetos frequente, insatisfação crônica, comparação com outros. Referência INTERNA (sabe mas não segue) ou EXTERNA (faz o que esperam)?",
      direcaoAjuste: "Uma reflexão prática para identificar o que realmente importa — crie uma ÂNCORA DE RECURSO que conecte a pessoa ao que dá energia.",
    },
    extra: `- NÃO use linguagem mística ou espiritual — foque em ESCOLHAS e ALINHAMENTO prático
- Diferencie entre NÃO TER propósito e NÃO SEGUIR o propósito que já sabe
- O próximo passo deve ser uma ação de AUTOCONHECIMENTO prático, não meditação genérica
- Identifique o metaprograma: PROATIVO (cria direção) vs REATIVO (espera a vida mostrar)
- Use a TÉTRADE para mapear: qual CRENÇA sobre propósito, qual LINGUAGEM INTERNA, onde está o FOCO
- Explique como a PSICOADAPTAÇÃO normalizou viver sem direção`,
  },
];

function getCategoryContext(slug: string): CategoryContext {
  const def = CATEGORY_DEFS.find((d) => d.match(slug));
  if (def) {
    return {
      role: def.role,
      emphasis: def.emphasis,
      sectionOverrides: def.overrides,
      extraInstructions: def.extra + "\n" + NEURO_BASE,
    };
  }
  return {
    role: "Você é um analista comportamental com base neurocientífica que interpreta dados de leituras para gerar diagnósticos claros e úteis.",
    emphasis: "Foco em padrões concretos, direções práticas e mecanismos neurais.",
    sectionOverrides: {},
    extraInstructions: NEURO_BASE,
  };
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 4: Prompt Builders
// ═══════════════════════════════════════════════════════════

const HARD_RULES = `# REGRAS INVIOLÁVEIS

1. LINGUAGEM SIMPLES — COMO CONVERSA
   - Escreva como se estivesse explicando para um amigo inteligente que NÃO é psicólogo
   - Use palavras do dia a dia. Proibido: "resiliência", "protagonismo", "autoboicote", "ressignificar", "empoderamento", "assertividade", "proatividade", "autoconhecimento", "autossabotagem consciente", "padrão disfuncional", "dinâmica relacional", "mecanismo compensatório"
   - Em vez de termos técnicos, DESCREVA o que acontece: "você trava quando precisa decidir" em vez de "paralisia decisória"
   - Frases curtas — máximo 1,5 linhas. Se precisa de vírgula, quebre em duas.
   - Proibido parágrafos com mais de 2 frases seguidas

2. ZERO PSICOLOGUÊS
   - Proibido termos de terapeuta ou coach: "zona de conforto", "crenças limitantes", "inner child", "self", "mindset"
   - Proibido linguagem de autoajuda: "acredite no seu potencial", "honre sua jornada", "você é capaz"
   - Proibido linguagem motivacional: "você pode mais", "é hora de brilhar", "transforme sua vida"
   - Teste: se uma pessoa de 16 anos não entenderia, reescreva

3. INTERPRETAR, NÃO INVENTAR
   - Use SOMENTE os dados fornecidos (scores, eixos, respostas)
   - Cada afirmação deve ser rastreável a um score ou resposta real
   - Não invente situações, exemplos pessoais ou histórias

4. ESPECIFICIDADE OBRIGATÓRIA
   - Proibido frases genéricas: "tenha mais foco", "acredite em si", "busque equilíbrio"
   - Cada frase deve conter o padrão ESPECÍFICO deste usuário
   - Se a frase serve para qualquer pessoa, delete e reescreva

5. COERÊNCIA COM O TESTE
   - O relatório DEVE refletir o tipo de teste feito. Teste emocional fala de emoções. Teste financeiro fala de dinheiro.
   - NÃO misture linguagem de um tipo de teste com outro
   - O vocabulário, os exemplos e as ações devem ser do UNIVERSO do teste aplicado
   - O tom muda conforme o teste: financeiro é prático, emocional é acolhedor, execução é objetivo

6. FORMATO E BREVIDADE
   - Fale em segunda pessoa ("você")
   - Não mencione nomes de variáveis ou percentuais numéricos
   - Seja direto — desconforto é aceitável, generalidade não
   - Responda EXCLUSIVAMENTE em JSON válido
   - MÁXIMO 2 frases por bloco (chamaAtencao, padraoRepetido, comoAparece, corrigirPrimeiro, acaoInicial)
   - Listas (gatilhos, pararDeFazer): máximo 4 itens, 1 frase cada
   - exitStrategy: máximo 4 passos curtos
   - mentalTraps: máximo 4 frases curtas entre aspas

7. ZERO REPETIÇÃO
   - Cada seção DEVE trazer informação NOVA
   - Se duas seções dizem a mesma coisa com palavras diferentes, reescreva uma delas
   - chamaAtencao ≠ padraoRepetido ≠ comoAtrapalha — são ângulos DIFERENTES do mesmo problema
   - corrigirPrimeiro (DIREÇÃO: o que mudar) ≠ acaoInicial (AÇÃO: o que fazer hoje)
   - Se ao reler você encontrar repetição, corte e substitua

8. ADAPTAÇÃO POR CATEGORIA
   - Cada categoria de teste tem seu próprio estilo, vocabulário e foco
   - Teste de execução: linguagem objetiva, exemplos de trabalho e projetos
   - Teste emocional: linguagem acolhedora mas direta, exemplos de reações e sentimentos
   - Teste relacional: linguagem sobre vínculos, exemplos de conflitos e conexões
   - Teste financeiro: linguagem prática, exemplos de gastos e decisões com dinheiro
   - Teste de propósito: linguagem reflexiva mas concreta, exemplos de direção e escolhas
   - NUNCA use o mesmo estilo para testes diferentes

9. EXEMPLOS DE TOM CORRETO
   - ❌ "Você apresenta um padrão de evitação emocional que compromete sua capacidade de engajamento relacional"
   - ✅ "Você foge de conversas difíceis. Quando algo incomoda, muda de assunto ou some."
   - ❌ "Há uma dinâmica de autossabotagem que se manifesta na procrastinação funcional"
   - ✅ "Você sabe o que precisa fazer, mas adia. Quando finalmente faz, já está atrasado."
    - ❌ "Busque desenvolver sua inteligência emocional para melhorar seus relacionamentos"
    - ✅ "Na próxima discussão, espere 5 segundos antes de responder. Só isso."

10. COMPLETUDE OBRIGATÓRIA — ZERO RESPOSTA APENAS EXPLICATIVA
    - Se um bloco só EXPLICA sem dar DIREÇÃO PRÁTICA, está incompleto
    - TODA saída deve conter os 3 elementos: DIAGNÓSTICO (o que acontece) + EXPLICAÇÃO SIMPLES (por que acontece) + AÇÃO EXECUTÁVEL (o que fazer)
    - chamaAtencao = diagnóstico. padraoRepetido/comoAparece = explicação. corrigirPrimeiro/acaoInicial = ação
    - Se corrigirPrimeiro ou acaoInicial estiverem vagos ou ausentes, o relatório FALHOU
    - Teste: releia cada bloco e pergunte "a pessoa sabe O QUE FAZER depois de ler isso?" — se não, reescreva`;

const ANALYSIS_OBJECTIVE = `# OBJETIVO DA ANÁLISE

Identificar o PADRÃO COMPORTAMENTAL DOMINANTE do usuário com base nas respostas.

REGRAS DE DADOS:
- Cada resposta tem um "mappedScore" de 0% a 100% que indica a intensidade REAL da concordância
- 0% = discordância total, 25% = discordância leve, 50% = neutro, 75% = concordância, 100% = concordância total
- USE o mappedScore para determinar a intensidade — NÃO invente interpretações que contradigam os números
- Se o mappedScore de uma resposta é 0-25%, o usuário DISCORDA daquilo — não diga que ele concorda
- Se o mappedScore é 75-100%, o usuário CONCORDA fortemente — isso é evidência direta

REGRAS DE DETECÇÃO DE PADRÕES:
- NÃO analise respostas isoladas — busque o que se REPETE ao longo de várias respostas
- Detecte REPETIÇÃO de comportamento: se 3+ respostas apontam para o mesmo mecanismo, esse é o padrão
- O EIXO COM MAIOR SCORE é o padrão dominante — o diagnóstico DEVE girar em torno dele
- Priorize estes padrões específicos quando detectados:
  • EVITAÇÃO: foge de situações desconfortáveis, adia decisões, evita conflitos
  • FUGA PARA TAREFAS FÁCEIS: troca o que importa por tarefas pequenas que dão sensação de produtividade
  • MEDO DE JULGAMENTO: deixa de agir por medo do que os outros vão pensar
  • PERFECCIONISMO PARALISANTE: não começa ou não termina porque nunca está bom o suficiente
  • ABANDONO APÓS PERDA DE EMPOLGAÇÃO: começa com energia, mas abandona quando a motivação inicial some
- Se nenhum desses se encaixa, nomeie o padrão real encontrado nas respostas

SAÍDA OBRIGATÓRIA: Nome do padrão + explicação direta baseada no comportamento observado nas respostas.`;

const NEURO_INTERPRETATION = `# INTERPRETAÇÃO NEUROCIENTÍFICA DO COMPORTAMENTO

Todo padrão identificado é resultado de um CIRCUITO NEURAL AUTOMATIZADO — não é falta de disciplina, preguiça ou fraqueza.

REGRAS DE INTERPRETAÇÃO:
- O comportamento é REPETIÇÃO DE PADRÃO APRENDIDO — o cérebro gravou esse caminho e repete no automático
- O cérebro SEMPRE busca 3 coisas:
  1. EVITAR DESCONFORTO IMEDIATO — foge da dor antes que ela chegue
  2. BUSCAR ALÍVIO RÁPIDO — troca o difícil pelo fácil para sentir algo bom agora
  3. REPETIR O QUE JÁ CONHECE — mesmo que dê errado, o familiar é "seguro" para o cérebro (PSICOADAPTAÇÃO)

TÉTRADE EMOCIONAL — Use para explicar o estado da pessoa:
- Todo comportamento é sustentado por 4 pilares: CRENÇAS + LINGUAGEM INTERNA + FOCO + FISIOLOGIA
- Identifique qual pilar está mais desregulado e explique em linguagem simples
- Ex: "Seu corpo trava (fisiologia) porque sua mente já decidiu que vai dar errado (crença)"

METAPROGRAMAS — Use para descrever como a pessoa filtra a realidade:
- Proativo/Reativo: "Você espera as coisas acontecerem em vez de agir" (reativo)
- Interno/Externo: "Você precisa que alguém diga que está bom pra acreditar" (externo)
- Associador/Desassociador: "Você sente tudo intensamente" (associador) ou "Você se desconecta pra não sentir" (desassociador)

PSICOADAPTAÇÃO — Explique por que a pessoa não muda:
- O cérebro se adaptou ao padrão disfuncional e agora o trata como "normal"
- A pessoa não muda porque o sofrimento CONHECIDO é preferível ao desconforto DESCONHECIDO da mudança
- Use: "Isso virou tão normal pra você que nem parece um problema"

ANCORAGEM — Use para explicar gatilhos e sugerir mudanças:
- ÂNCORAS NEGATIVAS: estímulos que disparam o padrão ruim automaticamente
- ÂNCORAS DE RECURSO: estímulos que podem disparar um estado melhor
- Sugira criar âncoras de recurso na direção prática

OBRIGATÓRIO NA EXPLICAÇÃO:
- Diga POR QUE o cérebro faz isso — qual ameaça ele está evitando
- Diga qual RECOMPENSA está sendo buscada (alívio, validação, controle, conforto)
- Use linguagem simples: "Seu cérebro aprendeu que..." / "Isso acontece porque sua mente associou..."
- NUNCA diga "você escolhe fazer isso" — o padrão é AUTOMÁTICO até ser percebido
- NUNCA trate como falha moral — é um mecanismo de proteção que já não serve mais
- MANTENHA LINGUAGEM SIMPLES: use os conceitos neurocientíficos para EXPLICAR, não para impressionar`;

const INTERVENTION_BLOCK = `# INTERVENÇÃO COMPORTAMENTAL

A ação prática (acaoInicial, corrigirPrimeiro, exitStrategy) deve ser uma INTERVENÇÃO que QUEBRA o circuito neural automático.

REGRAS DA INTERVENÇÃO:
1. DEVE QUEBRAR O CICLO AUTOMÁTICO — forçar o cérebro a fazer algo DIFERENTE do padrão habitual
2. DEVE GERAR DESCONFORTO CONTROLADO — não confortável, mas suportável. O desconforto é o sinal de que o cérebro está criando novo caminho
3. DEVE SER EXECUTÁVEL IMEDIATAMENTE — sem preparação, sem "quando estiver pronto"

FORMATO OBRIGATÓRIO:
- AÇÃO SIMPLES: uma frase, um comportamento (ex: "Diga não para o próximo pedido que receber")
- TEMPO DEFINIDO: quando e por quanto tempo (ex: "Amanhã, por 10 minutos")
- COMPORTAMENTO CLARO: o que fazer, não o que pensar (ex: "Feche o celular e sente na cadeira" — não "reflita sobre suas prioridades")

OBJETIVO: forçar uma NOVA RESPOSTA NEURAL. O cérebro só muda quando é obrigado a responder diferente.

EXEMPLOS:
- Padrão de evitação → "Hoje, faça a primeira coisa da sua lista ANTES de abrir o celular. 15 minutos."
- Medo de julgamento → "Publique algo sem revisar mais de uma vez. Hoje."  
- Perfeccionismo → "Entregue uma tarefa 70% pronta. Propositalmente imperfeita. Amanhã."
- Fuga para tarefas fáceis → "Bloqueie 30 minutos para a tarefa que mais te incomoda. Timer ligado. Agora."
- Abandono após empolgação → "Continue o projeto que abandonou por último. 20 minutos. Sem trocar para outro."

PROIBIDO:
- "Reflita sobre seus padrões" (não é ação)
- "Busque autoconhecimento" (genérico)  
- "Tente ser mais disciplinado" (moralismo)
- "Observe seus gatilhos" (passivo)
- Qualquer ação que não gere desconforto controlado

## COMANDO MENTAL DE REPROGRAMAÇÃO (mentalCommand)

Além da ação prática, gere UMA FRASE de reprogramação mental que o usuário deve repetir ANTES de executar a ação.

OBJETIVO:
- Enfraquecer o padrão neural antigo
- Reforçar o novo comportamento
- Preparar o cérebro para agir diferente

REGRAS:
- Frase em PRIMEIRA PESSOA ("Eu...")
- CURTA: máximo 10 palavras
- DIRETA: sem floreio, sem motivação genérica
- Deve CONTRADIZER a crença que mantém o padrão
- Deve ser ESPECÍFICA ao padrão identificado

EXEMPLOS POR PADRÃO:
- Evitação → "Eu não preciso estar pronto pra começar."
- Perfeccionismo → "Feito imperfeito vale mais que perfeito adiado."
- Medo de julgamento → "A opinião dos outros não paga minhas contas."
- Fuga para tarefas fáceis → "O fácil me engana. O difícil me move."
- Abandono → "Eu termino o que começo, mesmo sem vontade."

PROIBIDO:
- "Eu sou capaz" (genérico)
- "Eu mereço o melhor" (autoajuda)
- "Eu confio no processo" (vazio)
- Qualquer frase que sirva para qualquer pessoa`;

const DEPTH_LAYER = `# CAMADA DE PROFUNDIDADE

Antes de gerar o diagnóstico:
1. Cruze o padrão dominante com os secundários — como um alimenta o outro?
2. Identifique onde o usuário diz uma coisa e faz outra (use as respostas)
3. A dor central NÃO é o padrão reformulado — é o mecanismo invisível por trás
4. Teste anti-genericidade: se a frase serve para qualquer pessoa, reescreva
5. Coerência: corePain → mechanism → contradiction → direction → firstAction`;

function buildStructuredSystemPrompt(
  prompts: PromptRecord[],
  categoryCtx: CategoryContext,
  template?: ReportTemplate | null,
): string {
  const promptMap: Record<string, string> = {};
  prompts.forEach((p) => { promptMap[p.prompt_type] = p.content; });

  const sections: string[] = [];

  sections.push(`# PAPEL\n${categoryCtx.role}\nVocê recebe dados reais de uma leitura comportamental e deve gerar um diagnóstico estruturado usando APENAS os dados fornecidos.\nÊNFASE DESTE TESTE: ${categoryCtx.emphasis}`);

  const promptTypes = [
    ["interpretation", "INSTRUÇÕES DE INTERPRETAÇÃO (definidas pelo administrador)"],
    ["diagnosis", "DIAGNÓSTICO FINAL"],
    ["profile", "IDENTIFICAÇÃO DE PERFIL"],
    ["core_pain", "DOR CENTRAL"],
    ["triggers", "GATILHOS E ARMADILHAS"],
    ["direction", "DIREÇÃO PRÁTICA"],
    ["restrictions", "RESTRIÇÕES OBRIGATÓRIAS"],
  ];
  for (const [key, title] of promptTypes) {
    if (promptMap[key]) sections.push(`# ${title}\n${promptMap[key]}`);
  }

  sections.push(HARD_RULES, ANALYSIS_OBJECTIVE, NEURO_INTERPRETATION, INTERVENTION_BLOCK, DEPTH_LAYER);

  // Inject admin-configured output rules from report_templates
  if (template?.output_rules) {
    const rules = template.output_rules;
    const ruleLines: string[] = [];
    if (rules.tone) ruleLines.push(`- TOM OBRIGATÓRIO: ${rules.tone}`);
    if (rules.simplicityLevel) {
      const levelDesc: Record<number, string> = {
        1: "Pode usar termos técnicos quando necessário",
        2: "Poucos termos técnicos, sempre explicados",
        3: "Linguagem moderada, acessível mas precisa",
        4: "Linguagem simples do dia a dia, sem jargão",
        5: "Ultra-simples: qualquer pessoa de 14 anos deve entender",
      };
      ruleLines.push(`- NÍVEL DE SIMPLICIDADE: ${levelDesc[rules.simplicityLevel] || "Linguagem simples"}`);
    }
    if (rules.maxSentencesPerBlock) ruleLines.push(`- MÁXIMO ${rules.maxSentencesPerBlock} frases por bloco — sem exceção`);
    if (rules.maxTotalBlocks) ruleLines.push(`- MÁXIMO ${rules.maxTotalBlocks} blocos no relatório total`);
    if (rules.repetitionProhibited) ruleLines.push(`- REPETIÇÃO PROIBIDA: cada bloco DEVE trazer informação nova.`);
    if (rules.forbiddenLanguage?.length) ruleLines.push(`- TERMOS PROIBIDOS: ${rules.forbiddenLanguage.map((t) => `"${t}"`).join(", ")}`);
    if (rules.requiredBlocks?.length) ruleLines.push(`- BLOCOS OBRIGATÓRIOS: ${rules.requiredBlocks.join(", ")}`);
    if (ruleLines.length > 0) sections.push(`# REGRAS DE SAÍDA CONFIGURADAS PELO ADMINISTRADOR\n\n${ruleLines.join("\n")}`);
  }

  return sections.join("\n\n---\n\n");
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 5: Data Processing
// ═══════════════════════════════════════════════════════════

function buildAnswersSummary(answers: StructuredAnswer[]): string {
  if (!answers || answers.length === 0) return "Respostas brutas não disponíveis.";

  const byAxis: Record<string, { question: string; mappedScore: number; option: string | null }[]> = {};
  answers.forEach((a) => {
    const score = a.mappedScore ?? a.value;
    a.axes.forEach((axis) => {
      if (!byAxis[axis]) byAxis[axis] = [];
      byAxis[axis].push({ question: a.questionText, mappedScore: score, option: a.chosenOption });
    });
  });

  const lines: string[] = [];

  // High-signal answers (extremes: 0-20 or 80-100)
  const extremes = answers.filter((a) => {
    const score = a.mappedScore ?? 0;
    return score <= 20 || score >= 80;
  });
  if (extremes.length > 0) {
    lines.push("### EVIDÊNCIAS COMPORTAMENTAIS (respostas extremas — sinais fortes):");
    extremes.forEach((a) => {
      const score = a.mappedScore ?? 0;
      const label = score >= 80 ? "CONCORDÂNCIA FORTE" : "DISCORDÂNCIA FORTE";
      const optionText = a.chosenOption ? ` → "${a.chosenOption}"` : "";
      lines.push(`- [${label} — ${score}%] "${a.questionText}" (eixos: ${a.axes.join(", ")})${optionText}`);
    });
  }

  // Behavior choice answers
  const behaviorChoices = answers.filter((a) => a.questionType === "behavior_choice" && a.chosenOption);
  if (behaviorChoices.length > 0) {
    lines.push("\n### ESCOLHAS COMPORTAMENTAIS (comportamento real):");
    behaviorChoices.forEach((a) => {
      const score = a.mappedScore ?? a.value;
      lines.push(`- "${a.questionText}" → escolheu: "${a.chosenOption}" (score: ${score}%, eixos: ${a.axes.join(", ")})`);
    });
  }

  // All answers
  lines.push("\n### TODAS AS RESPOSTAS (com score mapeado):");
  answers.forEach((a) => {
    const score = a.mappedScore ?? a.value;
    const optionText = a.chosenOption ? ` → "${a.chosenOption}"` : "";
    lines.push(`- [${score}%] "${a.questionText}"${optionText} (eixos: ${a.axes.join(", ")})`);
  });

  // Inconsistency detection
  lines.push("\n### INCONSISTÊNCIAS DETECTADAS:");
  let hasInconsistency = false;
  Object.entries(byAxis).forEach(([axis, items]) => {
    const scores = items.map((i) => i.mappedScore);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    if (max - min >= 60 && items.length >= 2) {
      hasInconsistency = true;
      const high = items.find((i) => i.mappedScore === max);
      const low = items.find((i) => i.mappedScore === min);
      lines.push(`- Eixo "${axis}": resposta alta (${max}%) em "${high?.question}" vs baixa (${min}%) em "${low?.question}" — possível autoengano ou ambivalência`);
    }
  });
  if (!hasInconsistency) lines.push("- Nenhuma inconsistência extrema detectada nos mesmos eixos.");

  return lines.join("\n");
}

function classifyIntensity(pct: number): string {
  if (pct >= 75) return "ALTO";
  if (pct >= 50) return "MODERADO";
  return "LEVE";
}

function detectContradictions(scores: ScoreEntry[]): string {
  const scoreMap: Record<string, number> = {};
  scores.forEach((s) => { scoreMap[s.key] = s.percentage; });

  const contradictions: string[] = [];
  const sortedScores = [...scores].sort((a, b) => b.percentage - a.percentage);

  // Detect explicit conflicts: two axes both ≥ 50%
  const highScores = sortedScores.filter((s) => s.percentage >= 50);
  for (let i = 0; i < highScores.length; i++) {
    for (let j = i + 1; j < highScores.length; j++) {
      const a = highScores[i];
      const b = highScores[j];
      if (a.percentage >= 50 && b.percentage >= 50) {
        contradictions.push(`- CONFLITO DETECTADO: ${a.key} (${a.percentage}%) × ${b.key} (${b.percentage}%) — ambos eixos ativos simultaneamente, investigar tensão entre "${a.label}" e "${b.label}"`);
      }
    }
  }

  if (sortedScores.length >= 3) {
    const top = sortedScores[0];
    const bottom = sortedScores[sortedScores.length - 1];
    if (top.percentage - bottom.percentage >= 40) {
      contradictions.push(`- Grande disparidade: ${top.key}: ${top.percentage}% (${classifyIntensity(top.percentage)}) vs ${bottom.key}: ${bottom.percentage}% (${classifyIntensity(bottom.percentage)}) — padrão concentrado em poucos eixos`);
    }
  }

  const knownPairs: [string, string, string][] = [
    ["excessive_self_criticism", "validation_dependency", "Alta autocrítica combinada com dependência de validação"],
    ["paralyzing_perfectionism", "unstable_execution", "Perfeccionismo alto com execução instável"],
    ["discomfort_escape", "functional_overload", "Fuga do desconforto com sobrecarga funcional"],
    ["excessive_self_criticism", "low_routine_sustenance", "Autocrítica alta com baixa sustentação de rotina"],
    ["emotional_self_sabotage", "validation_dependency", "Autossabotagem emocional com dependência de validação"],
  ];
  for (const [keyA, keyB, desc] of knownPairs) {
    if ((scoreMap[keyA] ?? 0) >= 50 && (scoreMap[keyB] ?? 0) >= 50) {
      const alreadyCovered = contradictions.some((c) => c.includes(keyA) && c.includes(keyB));
      if (!alreadyCovered) contradictions.push(`- CONFLITO CONHECIDO: ${desc} — ${keyA}: ${scoreMap[keyA]}% × ${keyB}: ${scoreMap[keyB]}%`);
    }
  }

  if (contradictions.length === 0) {
    contradictions.push("- Sem conflitos extremos detectados. Analisar nuances entre os eixos com scores intermediários.");
  }

  return contradictions.join("\n");
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 6: JSON Output Schema Builder
// ═══════════════════════════════════════════════════════════

function buildJsonOutputSchema(
  ov: Record<string, string>,
  template?: ReportTemplate | null,
  categoryCtx?: CategoryContext,
): string {
  const maxSentences = template?.output_rules?.maxSentencesPerBlock || 2;

  const SHARED_FIELDS = `
  "profileName": "Nome criativo do perfil (3-5 palavras)",
  "combinedTitle": "Título curto e impactante do diagnóstico",
  "blindSpot": {"perceivedProblem": "O que a pessoa acha que é o problema", "realProblem": "O que realmente acontece"},
  "criticalDiagnosis": "Copie chamaAtencao ou resumoPrincipal",
  "corePain": "Resuma o impacto em 1 frase",
  "mentalState": "Estado mental atual em 1 frase",
  "summary": "Copie chamaAtencao ou resumoPrincipal",
  "mechanism": "Copie padraoRepetido ou padraoIdentificado",
  "contradiction": "A contradição interna principal — 1 frase",
  "impact": "Resuma o impacto em 1 frase",
  "direction": "Copie corrigirPrimeiro ou direcaoAjuste",
  "keyUnlockArea": "Copie corrigirPrimeiro ou direcaoAjuste",
  "blockingPoint": "Onde a pessoa trava — 1 frase",
  "triggers": ["mesmos gatilhos acima"],
  "mentalTraps": ["2-3 pensamentos que mantêm o padrão — entre aspas"],
  "selfSabotageCycle": ["3-4 etapas do ciclo em ordem — frases curtas"],
  "whatNotToDo": ["mesmos itens de pararDeFazer"],
  "lifeImpact": [{"pillar": "área", "impact": "efeito concreto em 1 frase"}],
  "exitStrategy": [{"step": 1, "title": "título curto", "action": "ação executável"}],
  "actionPlan": [{"area": "área com nota < 7", "score": 5, "actions": ["ação concreta"]}],
  "firstAction": "Copie acaoInicial ou proximoPasso",
  "focoMudanca": "Resuma em 1 frase curta QUAL área ou comportamento precisa de atenção prioritária. Deve ser DIFERENTE e MAIS CURTO que corrigirPrimeiro. Ex: 'Finalização de tarefas' ou 'Reação ao tédio nos projetos'.",
  "microAcoes": [
    {"acao": "Ação específica 1 — verbo no imperativo + objeto + prazo.", "detalhe": "Instrução complementar opcional."},
    {"acao": "Ação específica 2.", "detalhe": ""},
    {"acao": "Ação específica 3.", "detalhe": ""}
  ],
  "mentalCommand": "Uma frase curta e direta de reprogramação mental em 1ª pessoa, máx 10 palavras.",
  "mecanismoNeural": {
    "neurotransmissor": "Qual neurotransmissor está mais envolvido e como atua — 1 frase.",
    "cicloNeural": "Como o circuito neural se formou — 2 frases máximo.",
    "neuroplasticidade": "Como a neuroplasticidade permite mudar — 1-2 frases."
  }`;

  const FINAL_RULES = `
REGRAS FINAIS:
- MÁXIMO ${maxSentences} frases por bloco. Sem exceção.
- NÃO repita a mesma ideia entre seções.
- ZERO palavras rebuscadas.
- actionPlan: só para áreas abaixo de 70%.
- Se não houver áreas abaixo de 70%, retorne actionPlan como [].
- corrigirPrimeiro/direcaoAjuste: deve conter QUAL comportamento mudar e EM QUAL situação.
- focoMudanca: RESUMO CURTO (1-5 palavras) da área prioritária. NÃO pode ser igual a corrigirPrimeiro.
- microAcoes: 3 ações ESPECÍFICAS e EXECUTÁVEIS com verbo imperativo.
- acaoInicial/proximoPasso: deve conter QUANDO fazer + COMO fazer + por QUANTO TEMPO.
- pararDeFazer: cada item deve ter SITUAÇÃO + COMPORTAMENTO específico.
- mecanismoNeural: use linguagem SIMPLES para explicar neurociência.
${categoryCtx?.extraInstructions ? `\nINSTRUÇÕES ESPECÍFICAS DESTE TIPO DE TESTE:\n${categoryCtx.extraInstructions}` : ""}`;

  // Dynamic schema from template
  if (template?.sections && Array.isArray(template.sections) && template.sections.length > 0) {
    const LIST_KEYS = new Set(["gatilhos", "pararDeFazer", "mentalTraps", "selfSabotageCycle", "whatNotToDo", "oQueEvitar"]);
    const sectionLines = template.sections.map((sec) => {
      const instruction = ov[sec.key] || `Conteúdo para "${sec.name}" — máximo ${sec.maxSize || maxSentences} frases.`;
      if (LIST_KEYS.has(sec.key)) return `  "${sec.key}": ["${instruction}"]`;
      if (sec.key === "impactoPorArea") {
        return `  "impactoPorArea": [
    {"area": "Rotina", "efeito": "1 frase"},
    {"area": "Trabalho", "efeito": "1 frase"},
    {"area": "Emocional", "efeito": "1 frase"},
    {"area": "Relações", "efeito": "1 frase"},
    {"area": "Autoconfiança", "efeito": "1 frase"}
  ]`;
      }
      return `  "${sec.key}": "${instruction}"`;
    });

    return `Gere o diagnóstico em JSON com esta estrutura personalizada. Máximo ${maxSentences} frases por bloco. Linguagem simples, direta. Cada seção traz informação NOVA — ZERO repetição:
{
${sectionLines.join(",\n")},

${SHARED_FIELDS}
}
${FINAL_RULES}`;
  }

  // Default 8-section fallback
  return `Gere o diagnóstico em JSON com esta estrutura EXATA de 8 seções. Máximo ${maxSentences} frases por bloco. Linguagem simples, direta. Cada seção traz informação NOVA — ZERO repetição:
{
  "chamaAtencao": "${ov.resumoPrincipal || "O que mais salta aos olhos no resultado — 1-2 frases diretas, sem introdução."}",
  "padraoRepetido": "${ov.padraoIdentificado || "O padrão que mais se repete — nome curto + 1 frase explicando o mecanismo."}",
  "comoAparece": "${ov.comoAparece || "1-2 exemplos concretos do dia a dia onde isso aparece."}",
  "gatilhos": ["2-3 situações reais e específicas que disparam o padrão — 1 frase cada"],
  "impactoPorArea": [
    {"area": "Rotina", "efeito": "1 frase sobre como o padrão afeta a rotina diária"},
    {"area": "Trabalho", "efeito": "1 frase sobre impacto no trabalho/projetos"},
    {"area": "Emocional", "efeito": "1 frase sobre o custo emocional"},
    {"area": "Relações", "efeito": "1 frase sobre efeito nos relacionamentos"},
    {"area": "Autoconfiança", "efeito": "1 frase sobre impacto na autoimagem"}
  ],
  "corrigirPrimeiro": "${ov.direcaoAjuste || "O comportamento ESPECÍFICO que precisa mudar. Diga QUAL comportamento, em QUAL situação. 1-2 frases."}",
  "pararDeFazer": ["2-3 coisas para PARAR imediatamente — cada item com SITUAÇÃO + COMPORTAMENTO"],
  "acaoInicial": "${ov.proximoPasso || "UMA AÇÃO EXECUTÁVEL com QUANDO + COMO + QUANTO TEMPO. DEVE ser diferente de corrigirPrimeiro."}",

${SHARED_FIELDS}
}

${FINAL_RULES}
- corrigirPrimeiro = DIREÇÃO (QUAL comportamento mudar, EM QUAL situação). acaoInicial = AÇÃO (QUANDO + COMO + QUANTO TEMPO). São OBRIGATORIAMENTE diferentes.`;
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
  categoryCtx: CategoryContext,
  template?: ReportTemplate | null,
): string {
  const ov = categoryCtx.sectionOverrides;
  return `${userContext}
Teste: ${slug}
Intensidade geral: ${intensity}

## DADOS DOS EIXOS (base obrigatória para toda interpretação):
${scoresSummary}

## PADRÃO DOMINANTE: ${dominant.label} (intensidade: ${dominant.percentage > 75 ? "alta" : dominant.percentage > 50 ? "moderada" : "leve"})
${secondary.length > 0
    ? `## PADRÕES SECUNDÁRIOS: ${secondary.map((s) => `${s.label} (${s.percentage > 75 ? "alta" : s.percentage > 50 ? "moderada" : "leve"})`).join(", ")}`
    : "Sem padrões secundários significativos."}

## CRUZAMENTOS E CONTRADIÇÕES DETECTADOS:
${contradictions}

## EVIDÊNCIAS DAS RESPOSTAS DO USUÁRIO:
${answersSummary}

---

${buildJsonOutputSchema(ov, template, categoryCtx)}`;
}

function buildRefineInstruction(refineLevel: number): string {
  if (refineLevel <= 0) return "";
  const levels: string[] = [];
  if (refineLevel >= 1) levels.push(`- PROIBIDO usar frases como "tenha mais foco", "acredite em si", "busque equilíbrio", "saia da zona de conforto"
- Cada frase DEVE conter uma referência direta ao padrão específico detectado nos dados
- O diagnóstico crítico deve incluir uma CAUSA raiz e uma CONSEQUÊNCIA observável
- A contradição deve ser entre dois comportamentos CONCRETOS, não entre conceitos abstratos`);
  if (refineLevel >= 2) levels.push(`- A dor central deve explicar o MECANISMO que sustenta o problema — não apenas nomeá-lo
- O ponto cego deve surpreender — não pode ser óbvio
- A primeira ação deve ser executável em 72h com critério de sucesso mensurável
- As restrições (o que não fazer) devem ser contra-intuitivas, não óbvias`);
  if (refineLevel >= 3) levels.push(`- Use linguagem que gere IMPACTO EMOCIONAL — o usuário deve se sentir lido com precisão cirúrgica
- Cada seção deve conter pelo menos uma frase que o usuário NÃO esperaria ler
- O resumo deve funcionar como um espelho — o usuário deve reconhecer seus comportamentos reais`);

  return `\n\n---\n\n# INSTRUÇÃO DE REFINAMENTO (nível ${refineLevel})\n\nA resposta anterior foi considerada GENÉRICA. Aplique:\n\n${levels.join("\n")}`;
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 7: Result Normalization
// ═══════════════════════════════════════════════════════════

function normalizeResult(result: Record<string, unknown>, dominant: ScoreEntry, sortedScores: ScoreEntry[]): Record<string, unknown> {
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

  // Ensure arrays
  for (const f of ["triggers", "mentalTraps", "selfSabotageCycle", "whatNotToDo", "gatilhos", "oQueEvitar"]) {
    if (!Array.isArray(result[f])) result[f] = [];
  }
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
  if (!Array.isArray(result.microAcoes)) result.microAcoes = [];
  if (!result.focoMudanca) result.focoMudanca = "";

  // Quantitative anchor for frontend validation
  const topAxis = sortedScores[0];
  if (topAxis?.label) {
    console.log(`[Validation] Top axis: "${topAxis.label}" (${topAxis.percentage}%) | AI combinedTitle: "${result.combinedTitle}"`);
    result._quantitativeAnchor = {
      topAxis: topAxis.label,
      topPercentage: topAxis.percentage,
      secondaryAxes: sortedScores.slice(1, 3).map((s) => ({ label: s.label, percentage: s.percentage })),
    };
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 8: Main Handler
// ═══════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Não autorizado", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse("Não autorizado", 401);

    // ── Rate limit ──
    if (!checkRateLimit(user.id)) {
      return errorResponse("Limite de requisições atingido. Aguarde um minuto.", 429);
    }

    // ── Parse & validate input ──
    const body: RequestBody = await req.json();
    const { test_module_id, scores, slug, refine_level, answers: structuredAnswers } = body;

    if (!test_module_id || !scores || !Array.isArray(scores)) {
      return errorResponse("Dados inválidos", 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ── Fetch config (parallel) ──
    const [promptsRes, templateRes, profileRes] = await Promise.all([
      adminClient.from("test_prompts").select("prompt_type, title, content").eq("test_id", test_module_id).eq("is_active", true),
      adminClient.from("report_templates").select("sections, output_rules").eq("test_id", test_module_id).maybeSingle(),
      userClient.from("profiles").select("name, age").eq("user_id", user.id).maybeSingle(),
    ]);

    if (promptsRes.error) {
      console.error("Error fetching prompts:", promptsRes.error);
      return errorResponse("Erro ao carregar configuração do diagnóstico", 500);
    }

    if (!promptsRes.data || promptsRes.data.length === 0) {
      return fallbackResponse();
    }

    let reportTemplate: ReportTemplate | null = null;
    if (templateRes.data) {
      reportTemplate = {
        sections: Array.isArray(templateRes.data.sections) ? templateRes.data.sections as TemplateSection[] : [],
        output_rules: (templateRes.data.output_rules && typeof templateRes.data.output_rules === "object") ? templateRes.data.output_rules as OutputRules : {},
      };
    }

    // ── Build analysis data ──
    const sortedScores = [...scores]
      .map((s) => ({ ...s, percentage: Math.min(100, Math.max(0, s.percentage)) }))
      .sort((a, b) => b.percentage - a.percentage);

    const dominant = sortedScores[0];
    const secondary = sortedScores.filter((s, i) => i > 0 && s.percentage >= 40).slice(0, 3);
    const intensity = dominant.percentage >= 75 ? "alto" : dominant.percentage >= 50 ? "moderado" : "leve";

    // Format: key: percentage% (CLASSIFICAÇÃO) — all axes
    const scoresSummary = sortedScores
      .map((s) => `- ${s.key}: ${s.percentage}% (${classifyIntensity(s.percentage)}) — "${s.label}"`)
      .join("\n");

    const contradictions = detectContradictions(sortedScores);
    const categoryCtx = getCategoryContext(slug);

    const systemPrompt = buildStructuredSystemPrompt(promptsRes.data as PromptRecord[], categoryCtx, reportTemplate);

    const profile = profileRes.data;
    const userContext = profile
      ? `Usuário: ${profile.name || "Anônimo"}${profile.age ? `, ${profile.age} anos` : ""}`
      : "Usuário anônimo";

    const answersSummary = buildAnswersSummary(structuredAnswers || []);
    const userPrompt = buildUserPrompt(userContext, slug, intensity, scoresSummary, dominant, secondary, contradictions, answersSummary, categoryCtx, reportTemplate);

    const refineLevel = refine_level ?? 0;
    const refineInstruction = buildRefineInstruction(refineLevel);

    // ── Call AI ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return fallbackResponse();

    // Fetch AI config
    let aiModel = "google/gemini-3-flash-preview";
    let aiTemperature: number | undefined;
    let aiMaxTokens: number | undefined;

    try {
      const [testConfigRes, globalConfigRes] = await Promise.all([
        adminClient.from("test_ai_config").select("use_global_defaults, ai_enabled, temperature, max_tokens").eq("test_id", test_module_id).maybeSingle(),
        adminClient.from("global_ai_config").select("ai_model, temperature, max_tokens").limit(1).maybeSingle(),
      ]);

      if (globalConfigRes.data?.ai_model) aiModel = globalConfigRes.data.ai_model;

      if (testConfigRes.data && !testConfigRes.data.use_global_defaults) {
        aiTemperature = testConfigRes.data.temperature;
        aiMaxTokens = testConfigRes.data.max_tokens;
      } else if (globalConfigRes.data) {
        aiTemperature = globalConfigRes.data.temperature;
        aiMaxTokens = globalConfigRes.data.max_tokens;
      }
    } catch { /* use defaults */ }

    const clampedTemp = aiTemperature !== undefined ? Math.min(0.6, Math.max(0.5, aiTemperature)) : 0.55;

    const aiBody: Record<string, unknown> = {
      model: aiModel,
      messages: [
        { role: "system", content: systemPrompt + refineInstruction },
        { role: "user", content: userPrompt },
      ],
      temperature: clampedTemp,
    };
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
      const status = aiResponse.status;
      await aiResponse.text(); // consume body
      if (status === 429) return errorResponse("Limite de requisições. Tente novamente em instantes.", 429);
      if (status === 402) return errorResponse("Créditos de IA esgotados.", 402);
      console.error("AI error:", status);
      return fallbackResponse();
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // ── Parse JSON ──
    let result: Record<string, unknown>;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      result = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      return fallbackResponse();
    }

    // ── Validate ──
    const hasNewTemplate = result.resumoPrincipal && result.significadoPratico;
    const hasLegacy = result.criticalDiagnosis && result.corePain;
    if (!hasNewTemplate && !hasLegacy) {
      console.error("AI response missing required fields");
      return fallbackResponse();
    }

    // ── Normalize ──
    const normalized = normalizeResult(result, dominant, sortedScores);

    return jsonResponse({ analysis: normalized });
  } catch (e) {
    console.error("analyze-test error:", e);
    return errorResponse("Erro interno do servidor", 500);
  }
});
