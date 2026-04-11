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
// ▌ SECTION 2: Helpers
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

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

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

function classifyIntensity(pct: number): string {
  if (pct >= 75) return "ALTO";
  if (pct >= 50) return "MODERADO";
  return "LEVE";
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 3: Score Analysis
// ═══════════════════════════════════════════════════════════

function buildScoresSummary(sortedScores: ScoreEntry[]): string {
  return sortedScores
    .map((s) => `${s.key}: ${s.percentage}% — ${classifyIntensity(s.percentage)}`)
    .join("\n");
}

function buildDominantSection(dominant: ScoreEntry): string {
  return `PADRÃO DOMINANTE: ${dominant.key} (${dominant.percentage}%)`;
}

function buildSecondarySection(secondary: ScoreEntry[]): string {
  if (secondary.length === 0) return "PADRÕES SECUNDÁRIOS ATIVOS (score ≥ 40%): NENHUM";
  return `PADRÕES SECUNDÁRIOS ATIVOS (score ≥ 40%):\n${secondary
    .map((s) => `- ${s.key}: ${s.percentage}%`)
    .join("\n")}`;
}

function buildConflictsSection(scores: ScoreEntry[]): string {
  const highScores = scores.filter((s) => s.percentage >= 50);
  const conflicts: string[] = [];

  for (let i = 0; i < highScores.length; i++) {
    for (let j = i + 1; j < highScores.length; j++) {
      conflicts.push(
        `CONFLITO DETECTADO: ${highScores[i].key} (${highScores[i].percentage}%) × ${highScores[j].key} (${highScores[j].percentage}%)`
      );
    }
  }

  if (conflicts.length === 0) return "CONFLITOS DETECTADOS (dois eixos ≥ 50%): NENHUM";
  return `CONFLITOS DETECTADOS (dois eixos ≥ 50%):\n${conflicts.join("\n")}`;
}

function buildEvidencesSection(answers: StructuredAnswer[]): string {
  if (!answers || answers.length === 0) return "EVIDÊNCIAS COMPORTAMENTAIS: Dados não disponíveis";

  const extremes = answers.filter((a) => {
    const score = a.mappedScore ?? 0;
    return score >= 80;
  });

  if (extremes.length === 0) return "EVIDÊNCIAS COMPORTAMENTAIS (respostas com score ≥ 80): NENHUMA";

  const lines = extremes.map((a) => {
    const score = a.mappedScore ?? 0;
    const optionText = a.chosenOption ? `"${a.chosenOption}"` : `score ${score}`;
    return `- "${a.questionText}" → ${optionText} (score: ${score})`;
  });

  return `EVIDÊNCIAS COMPORTAMENTAIS (respostas com score ≥ 80):\n${lines.join("\n")}`;
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 4: Prompt Builders
// ═══════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Você é um especialista em análise comportamental e Terapia Neurocientífica. Gere um relatório diagnóstico baseado exclusivamente nos dados reais do usuário fornecidos abaixo. Nunca use linguagem genérica. Nunca invente padrões que os scores não confirmam. Retorne exclusivamente um JSON válido sem nenhum texto antes ou depois.`;

const OUTPUT_SCHEMA = `--- SCHEMA DE SAÍDA ---

Retorne APENAS este JSON, sem markdown, sem texto adicional:

{
  "profileName": "nome do perfil comportamental",
  "combinedTitle": "título do relatório que captura o padrão central",
  "perfilComportamental": "descrição do perfil em 3 frases",
  "diagnosis": "diagnóstico central em 3 frases",
  "chamaAtencao": "insight mais revelador em 2 frases",
  "padraoRepetido": "ciclo que se repete em 2 frases",
  "corePain": "dor central em 2 frases",
  "comoAparece": "como aparece na rotina em 2 frases",
  "gatilhos": ["gatilho 1", "gatilho 2", "gatilho 3"],
  "impactoPorArea": [
    {"area": "nome da área", "impacto": "impacto concreto"},
    {"area": "nome da área", "impacto": "impacto concreto"}
  ],
  "corrigirPrimeiro": "direção de mudança em 2 frases",
  "pararDeFazer": "comportamento a parar em 1 frase",
  "acaoInicial": "ação concreta dos próximos 7 dias + gancho reteste",
  "selfSabotageCycle": ["passo 1", "passo 2", "passo 3", "passo 4"],
  "microAcoes": ["ação 1", "ação 2", "ação 3"],
  "exitStrategy": ["passo 1", "passo 2", "passo 3"],
  "blindSpot": "ponto cego em 1 frase",
  "mentalCommand": "comando mental em 1 frase curta",
  "futureConsequence": "o que acontece se esse padrão continuar nos próximos meses — em 3 frases: (1) o que a pessoa tende a repetir, (2) o que ela tende a perder, (3) como esse padrão mantém estagnação. Direto, prático, sem motivacional, sem exagero dramático, sem psicologuês.",
  "summary": "resumo geral em 2 frases",
  "mechanism": "mecanismo central em 2 frases",
  "contradiction": "contradição interna em 1 frase",
  "impact": "impacto na vida em 1 frase",
  "direction": "direção de mudança resumida",
  "keyUnlockArea": "área chave de desbloqueio",
  "criticalDiagnosis": "diagnóstico crítico em 2 frases",
  "mentalState": "estado mental atual em 1 frase",
  "blockingPoint": "ponto de travamento em 1 frase",
  "triggers": ["gatilho 1", "gatilho 2", "gatilho 3"],
  "mentalTraps": ["armadilha 1", "armadilha 2"],
  "whatNotToDo": ["o que não fazer 1", "o que não fazer 2"],
  "lifeImpact": [{"pillar": "área", "impact": "impacto"}],
  "focoMudanca": "foco da mudança em 1 frase curta"
}`;

function buildUserPrompt(
  userContext: string,
  sortedScores: ScoreEntry[],
  dominant: ScoreEntry,
  secondary: ScoreEntry[],
  answers: StructuredAnswer[],
  prompts: PromptRecord[],
  template: ReportTemplate | null,
): string {
  const promptMap: Record<string, string> = {};
  prompts.forEach((p) => { promptMap[p.prompt_type] = p.content; });

  const sections: string[] = [];

  // 1. User context
  sections.push(userContext);

  // 2. User data
  sections.push("--- DADOS DO USUÁRIO ---");
  sections.push(`SCORES POR EIXO (ordem decrescente):\n${buildScoresSummary(sortedScores)}`);
  sections.push(buildDominantSection(dominant));
  sections.push(buildSecondarySection(secondary));
  sections.push(buildConflictsSection(sortedScores));
  sections.push(buildEvidencesSection(answers));

  // 3. Admin prompts — injected in order
  const promptTypes: [string, string][] = [
    ["interpretation", "INSTRUÇÕES DE ANÁLISE"],
    ["diagnosis", "INSTRUÇÕES DE DIAGNÓSTICO"],
    ["profile", "INSTRUÇÕES DE PERFIL"],
    ["core_pain", "INSTRUÇÕES DE DOR CENTRAL"],
    ["triggers", "INSTRUÇÕES DE GATILHOS"],
    ["direction", "INSTRUÇÕES DE DIREÇÃO"],
    ["restrictions", "RESTRIÇÕES ABSOLUTAS"],
  ];

  for (const [key, title] of promptTypes) {
    if (promptMap[key] && promptMap[key].trim().length > 0) {
      sections.push(`--- ${title} ---\n${promptMap[key]}`);
    }
  }

  // 4. Output rules from template (if configured)
  if (template?.output_rules) {
    const rules = template.output_rules;
    const ruleLines: string[] = [];
    if (rules.tone) ruleLines.push(`- TOM OBRIGATÓRIO: ${rules.tone}`);
    if (rules.maxSentencesPerBlock) ruleLines.push(`- MÁXIMO ${rules.maxSentencesPerBlock} frases por bloco`);
    if (rules.repetitionProhibited) ruleLines.push(`- REPETIÇÃO PROIBIDA entre seções`);
    if (rules.forbiddenLanguage?.length) ruleLines.push(`- TERMOS PROIBIDOS: ${rules.forbiddenLanguage.map((t) => `"${t}"`).join(", ")}`);
    if (ruleLines.length > 0) {
      sections.push(`--- REGRAS DE SAÍDA ---\n${ruleLines.join("\n")}`);
    }
  }

  // 5. JSON output schema
  sections.push(OUTPUT_SCHEMA);

  return sections.join("\n\n");
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 5: Result Normalization (no fallback content)
// ═══════════════════════════════════════════════════════════

function normalizeResult(result: Record<string, unknown>, dominant: ScoreEntry, sortedScores: ScoreEntry[]): Record<string, unknown> {
  // Ensure arrays exist (empty if not provided by AI)
  for (const f of ["triggers", "mentalTraps", "selfSabotageCycle", "whatNotToDo", "gatilhos", "pararDeFazer", "microAcoes", "exitStrategy"]) {
    if (!Array.isArray(result[f])) result[f] = [];
  }
  if (!Array.isArray(result.lifeImpact)) result.lifeImpact = [];
  if (!Array.isArray(result.impactoPorArea)) result.impactoPorArea = [];

  // Ensure strings exist (empty if not provided by AI — NO fallback content)
  const stringFields = [
    "profileName", "combinedTitle", "perfilComportamental", "diagnosis",
    "chamaAtencao", "padraoRepetido", "corePain", "comoAparece",
    "corrigirPrimeiro", "acaoInicial", "blindSpot", "mentalCommand",
    "futureConsequence",
    "summary", "mechanism", "contradiction", "impact", "direction",
    "keyUnlockArea", "criticalDiagnosis", "mentalState", "blockingPoint",
    "focoMudanca",
  ];
  for (const f of stringFields) {
    if (typeof result[f] !== "string") result[f] = "";
  }

  // pararDeFazer: accept string or array
  if (typeof result.pararDeFazer === "string") {
    result.pararDeFazer = result.pararDeFazer ? [result.pararDeFazer as string] : [];
  }

  // combinedTitle fallback to dominant label only
  if (!result.combinedTitle) result.combinedTitle = dominant.label || "";

  // Quantitative anchor for frontend validation
  result._quantitativeAnchor = {
    topAxis: sortedScores[0]?.label || "",
    topPercentage: sortedScores[0]?.percentage || 0,
    secondaryAxes: sortedScores.slice(1, 3).map((s) => ({ label: s.label, percentage: s.percentage })),
  };

  return result;
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 6: Main Handler
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

    // ── Build prompts ──
    const profile = profileRes.data;
    const userContext = profile
      ? `Usuário: ${profile.name || "Anônimo"}${profile.age ? `, ${profile.age} anos` : ""}`
      : "Usuário anônimo";

    const userPrompt = buildUserPrompt(
      userContext,
      sortedScores,
      dominant,
      secondary,
      structuredAnswers || [],
      promptsRes.data as PromptRecord[],
      reportTemplate,
    );

    // ── Fetch AI config ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return fallbackResponse();

    let aiModel = "google/gemini-3-flash-preview";
    let aiTemperature = 0.55;
    let aiMaxTokens = 6000;

    try {
      const [testConfigRes, globalConfigRes] = await Promise.all([
        adminClient.from("test_ai_config").select("use_global_defaults, ai_enabled, temperature, max_tokens").eq("test_id", test_module_id).maybeSingle(),
        adminClient.from("global_ai_config").select("ai_model, temperature, max_tokens, system_prompt").limit(1).maybeSingle(),
      ]);

      if (globalConfigRes.data?.ai_model) aiModel = globalConfigRes.data.ai_model;

      if (testConfigRes.data && !testConfigRes.data.use_global_defaults) {
        if (testConfigRes.data.temperature != null) aiTemperature = Number(testConfigRes.data.temperature);
        if (testConfigRes.data.max_tokens != null) aiMaxTokens = Number(testConfigRes.data.max_tokens);
      } else if (globalConfigRes.data) {
        if (globalConfigRes.data.temperature != null) aiTemperature = Number(globalConfigRes.data.temperature);
        if (globalConfigRes.data.max_tokens != null) aiMaxTokens = Number(globalConfigRes.data.max_tokens);
      }
    } catch { /* use defaults */ }

    // ── Refine instruction ──
    let refineInstruction = "";
    const refineLevel = refine_level ?? 0;
    if (refineLevel >= 1) {
      refineInstruction = "\n\nINSTRUÇÃO DE REFINAMENTO: A resposta anterior foi genérica. Seja mais específico, use os dados reais do usuário, e garanta que cada bloco traz informação nova.";
    }

    // ── Fetch global system_prompt ──
    let globalSystemPrompt = "";
    try {
      const gConfig = await adminClient.from("global_ai_config").select("system_prompt").limit(1).maybeSingle();
      if (gConfig.data?.system_prompt) globalSystemPrompt = gConfig.data.system_prompt;
    } catch { /* use empty */ }

    // ── Call AI ──
    const fullSystemPrompt = [globalSystemPrompt, SYSTEM_PROMPT, refineInstruction].filter(Boolean).join("\n\n");
    const aiBody = {
      model: aiModel,
      messages: [
        { role: "system", content: fullSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: aiTemperature,
      max_tokens: aiMaxTokens,
    };

    console.log(`[analyze-test] Model: ${aiModel}, Temp: ${aiTemperature}, MaxTokens: ${aiMaxTokens}, Slug: ${slug}`);

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
      await aiResponse.text();
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

    // ── Validate minimum fields ──
    const hasMinimumFields = result.chamaAtencao || result.diagnosis || result.criticalDiagnosis || result.profileName;
    if (!hasMinimumFields) {
      console.error("AI response missing required fields");
      return fallbackResponse();
    }

    // ── Normalize (no hardcoded fallback) ──
    const normalized = normalizeResult(result, dominant, sortedScores);

    return jsonResponse({ analysis: normalized });
  } catch (e) {
    console.error("analyze-test error:", e);
    return errorResponse("Erro interno do servidor", 500);
  }
});
