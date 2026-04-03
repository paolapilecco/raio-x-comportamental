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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client for auth validation
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

    // Service client to read admin-only test_prompts
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Parse request
    const { test_module_id, scores, slug } = await req.json() as {
      test_module_id: string;
      scores: ScoreEntry[];
      slug: string;
    };

    if (!test_module_id || !scores || !Array.isArray(scores)) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active prompts for this test
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

    // If no prompts configured, return empty so frontend uses fallback
    if (!prompts || prompts.length === 0) {
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt map
    const promptMap: Record<string, string> = {};
    prompts.forEach((p: { prompt_type: string; content: string }) => {
      promptMap[p.prompt_type] = p.content;
    });

    // Fetch user profile for context
    const { data: profile } = await userClient
      .from("profiles")
      .select("name, age")
      .eq("user_id", user.id)
      .maybeSingle();

    // Build scores summary
    const dominant = scores[0];
    const secondary = scores.filter((s, i) => i > 0 && s.percentage >= 40).slice(0, 2);
    const intensity = dominant.percentage >= 75 ? "alto" : dominant.percentage >= 50 ? "moderado" : "leve";

    const scoresSummary = scores
      .map((s) => `- ${s.label}: ${s.percentage}%`)
      .join("\n");

    // Build the system prompt from admin-configured prompts
    const sections: string[] = [];

    if (promptMap.interpretation) {
      sections.push(`## INSTRUÇÕES DE INTERPRETAÇÃO\n${promptMap.interpretation}`);
    }
    if (promptMap.diagnosis) {
      sections.push(`## DIAGNÓSTICO FINAL\n${promptMap.diagnosis}`);
    }
    if (promptMap.profile) {
      sections.push(`## IDENTIFICAÇÃO DE PERFIL\n${promptMap.profile}`);
    }
    if (promptMap.core_pain) {
      sections.push(`## DOR CENTRAL\n${promptMap.core_pain}`);
    }
    if (promptMap.triggers) {
      sections.push(`## GATILHOS E ARMADILHAS\n${promptMap.triggers}`);
    }
    if (promptMap.direction) {
      sections.push(`## DIREÇÃO PRÁTICA\n${promptMap.direction}`);
    }
    if (promptMap.restrictions) {
      sections.push(`## RESTRIÇÕES (O QUE NÃO FAZER)\n${promptMap.restrictions}`);
    }

    const systemPrompt = `Você é um analista comportamental de alto nível. Sua tarefa é analisar os resultados de um teste comportamental e gerar um diagnóstico completo e personalizado.

${sections.join("\n\n")}

REGRAS TÉCNICAS:
- Responda EXCLUSIVAMENTE em JSON válido com a estrutura especificada
- Seja direto, profundo e específico — sem generalidades
- Fale diretamente com o usuário (segunda pessoa)
- Não mencione variáveis técnicas, scores numéricos ou nomes de eixos
- Use linguagem acessível mas com profundidade psicológica
- Adapte a linguagem à idade do usuário quando disponível`;

    const userContext = profile
      ? `Usuário: ${profile.name || "Anônimo"}${profile.age ? `, ${profile.age} anos` : ""}`
      : "Usuário anônimo";

    const userPrompt = `${userContext}
Teste: ${slug}
Intensidade geral: ${intensity}

## Scores por eixo:
${scoresSummary}

## Padrão dominante: ${dominant.label} (${dominant.percentage}%)
${secondary.length > 0 ? `## Padrões secundários: ${secondary.map((s) => `${s.label} (${s.percentage}%)`).join(", ")}` : "Sem padrões secundários significativos."}

Gere um diagnóstico completo em JSON com esta estrutura:
{
  "profileName": "Nome do perfil comportamental (3-5 palavras criativas)",
  "mentalState": "Estado mental atual em uma frase",
  "summary": "Resumo de 2-3 parágrafos descrevendo o funcionamento comportamental",
  "mechanism": "Descrição do mecanismo principal que sustenta o padrão",
  "contradiction": "A contradição interna mais relevante",
  "impact": "O impacto principal na vida do usuário",
  "direction": "A direção de transformação recomendada",
  "combinedTitle": "Título combinado dos padrões (ex: 'Perfeccionismo com Evitação')",
  "corePain": "A dor central por trás dos padrões",
  "keyUnlockArea": "A área-chave para destravamento",
  "criticalDiagnosis": "Diagnóstico crítico em 2-3 frases diretas",
  "blockingPoint": "O ponto exato onde o usuário trava",
  "triggers": ["lista de 3-5 gatilhos específicos"],
  "mentalTraps": ["lista de 3-5 armadilhas mentais"],
  "selfSabotageCycle": ["3-5 etapas do ciclo de autossabotagem em ordem"],
  "whatNotToDo": ["lista de 3-5 coisas que o usuário NÃO deve fazer"],
  "lifeImpact": [{"pillar": "área da vida", "impact": "impacto específico"}],
  "exitStrategy": [{"step": 1, "title": "título do passo", "action": "ação detalhada"}]
}`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
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

    // Parse JSON from response
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

    // Validate required fields exist
    const required = ["profileName", "mentalState", "summary", "mechanism", "contradiction", "direction"];
    const missing = required.filter((f) => !result[f]);
    if (missing.length > 0) {
      console.error("AI response missing fields:", missing);
      return new Response(JSON.stringify({ useFallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure arrays are arrays
    ["triggers", "mentalTraps", "selfSabotageCycle", "whatNotToDo"].forEach((f) => {
      if (!Array.isArray(result[f])) result[f] = [];
    });
    if (!Array.isArray(result.lifeImpact)) result.lifeImpact = [];
    if (!Array.isArray(result.exitStrategy)) result.exitStrategy = [];

    return new Response(JSON.stringify({ analysis: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-test error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
