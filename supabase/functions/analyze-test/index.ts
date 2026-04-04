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

// ── Structured prompt builder ──

function buildStructuredSystemPrompt(prompts: PromptRecord[]): string {
  const promptMap: Record<string, string> = {};
  prompts.forEach((p) => { promptMap[p.prompt_type] = p.content; });

  const sections: string[] = [];

  // Role definition — non-negotiable
  sections.push(`# PAPEL
Você é um analista comportamental de alto nível. Sua função é INTERPRETAR — não descrever, não resumir, não motivar.
Você recebe dados reais de um teste comportamental e deve gerar um diagnóstico estruturado usando APENAS os dados fornecidos.`);

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

1. INTERPRETAR, NÃO INVENTAR
   - Use SOMENTE os dados fornecidos (scores, eixos, padrões)
   - Não invente situações, exemplos pessoais ou contextos que não existam nos dados
   - Cada afirmação deve ser rastreável a um score ou combinação de scores

2. ESPECIFICIDADE OBRIGATÓRIA
   - Proibido usar frases genéricas: "tenha mais foco", "acredite em si mesmo", "saia da zona de conforto"
   - Cada frase deve conter o PADRÃO ESPECÍFICO do usuário
   - Se não conseguir ser específico, não escreva

3. ESTRUTURA DA RESPOSTA
   - Fale em segunda pessoa ("você")
   - Não mencione nomes de variáveis, eixos técnicos ou percentuais numéricos
   - Use linguagem acessível mas com profundidade psicológica
   - Seja direto — desconforto é aceitável, generalidade não é

4. PROIBIÇÕES
   - Não seja motivacional
   - Não suavize o diagnóstico
   - Não repita a descrição dos eixos como diagnóstico
   - Não use bullet points genéricos
   - Não diga "você pode melhorar" sem dizer COMO especificamente

5. FORMATO: Responda EXCLUSIVAMENTE em JSON válido com a estrutura exata especificada`);

  return sections.join("\n\n---\n\n");
}

function buildUserPrompt(
  userContext: string,
  slug: string,
  intensity: string,
  scoresSummary: string,
  dominant: ScoreEntry,
  secondary: ScoreEntry[],
  contradictions: string
): string {
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

---

Gere o diagnóstico completo em JSON com esta estrutura EXATA:
{
  "criticalDiagnosis": "Diagnóstico crítico em 2-3 frases. O que está acontecendo de verdade — sem filtros.",
  "corePain": "A dor central por trás de tudo. Deve responder: qual é o problema REAL, qual padrão causa o travamento, qual comportamento sustenta isso.",
  "profileName": "Nome do perfil comportamental (3-5 palavras criativas e específicas)",
  "mentalState": "Estado mental atual em uma frase direta",
  "summary": "Resumo de 2-3 parágrafos descrevendo o funcionamento comportamental REAL — como os padrões se alimentam mutuamente",
  "mechanism": "Descrição do mecanismo principal que sustenta o padrão — a engrenagem que mantém o ciclo",
  "contradiction": "A contradição interna mais relevante entre o que a pessoa acredita e como age",
  "blindSpot": {
    "perceivedProblem": "O que o usuário acredita que é o problema",
    "realProblem": "O que realmente está acontecendo por trás"
  },
  "impact": "O impacto principal e concreto na vida do usuário",
  "keyUnlockArea": "A área-chave de destravamento — específica, não genérica. Ex: 'tolerância ao desconforto antes da ação'",
  "direction": "A direção de transformação — concreta, com ação clara",
  "combinedTitle": "Título combinado dos padrões (ex: 'Perfeccionismo com Evitação Emocional')",
  "blockingPoint": "O ponto exato onde o usuário trava — o momento específico no ciclo",
  "triggers": ["3-5 gatilhos ESPECÍFICOS baseados nos dados — não genéricos"],
  "mentalTraps": ["3-5 armadilhas mentais concretas que o padrão gera"],
  "selfSabotageCycle": ["3-5 etapas do ciclo de autossabotagem em ORDEM causal"],
  "whatNotToDo": ["3-5 coisas específicas que o usuário NÃO deve fazer — baseadas no padrão detectado"],
  "lifeImpact": [{"pillar": "área da vida", "impact": "impacto concreto e específico"}],
  "exitStrategy": [{"step": 1, "title": "título do passo", "action": "ação detalhada e específica com prazo ou critério de sucesso"}],
  "firstAction": "A PRIMEIRA ação concreta que o usuário deve tomar nos próximos 3 dias — específica o suficiente para ser executável"
}`;
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

    const { test_module_id, scores, slug, refine_level } = await req.json() as {
      test_module_id: string;
      scores: ScoreEntry[];
      slug: string;
      refine_level?: number; // 0 = normal, 1+ = progressively stricter
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
      return new Response(JSON.stringify({ error: "Erro ao carregar configuração do teste" }), {
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

    const userPrompt = buildUserPrompt(
      userContext, slug, intensity, scoresSummary, dominant, secondary, contradictions
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

    // Fetch AI model from global config
    let aiModel = "google/gemini-3-flash-preview";
    try {
      const { data: globalConfig } = await adminClient
        .from("global_ai_config")
        .select("ai_model")
        .limit(1)
        .maybeSingle();
      if (globalConfig?.ai_model) aiModel = globalConfig.ai_model;
    } catch { /* use default */ }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt + (refineLevel > 0 ? refineInstruction : "") },
          { role: "user", content: userPrompt },
        ],
      }),
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

    // Validate required structured fields
    const required = ["criticalDiagnosis", "corePain", "profileName", "mentalState", "summary", "mechanism", "contradiction", "direction"];
    const missing = required.filter((f) => !result[f]);
    if (missing.length > 0) {
      console.error("AI response missing fields:", missing);
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure arrays and objects
    ["triggers", "mentalTraps", "selfSabotageCycle", "whatNotToDo"].forEach((f) => {
      if (!Array.isArray(result[f])) result[f] = [];
    });
    if (!Array.isArray(result.lifeImpact)) result.lifeImpact = [];
    if (!Array.isArray(result.exitStrategy)) result.exitStrategy = [];
    if (!result.blindSpot || typeof result.blindSpot !== "object") {
      result.blindSpot = { perceivedProblem: "", realProblem: "" };
    }
    if (!result.firstAction) result.firstAction = "";
    if (!result.keyUnlockArea) result.keyUnlockArea = "";
    if (!result.blockingPoint) result.blockingPoint = "";
    if (!result.impact) result.impact = "";
    if (!result.combinedTitle) result.combinedTitle = `${dominant.label}`;

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
