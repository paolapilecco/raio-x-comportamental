import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch central profile
    const { data: centralProfile } = await supabase
      .from("user_central_profile")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!centralProfile || centralProfile.tests_completed === 0) {
      return new Response(
        JSON.stringify({ error: "Perfil insuficiente. Complete pelo menos uma leitura." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all results for richer context
    const { data: sessions } = await supabase
      .from("diagnostic_sessions")
      .select("id, completed_at, test_module_id")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(10);

    const sessionIds = sessions?.map((s) => s.id) || [];
    const { data: results } = await supabase
      .from("diagnostic_results")
      .select("dominant_pattern, intensity, mental_state, state_summary, blocking_point, contradiction, triggers, traps, self_sabotage_cycle, all_scores")
      .in("session_id", sessionIds);

    // Build context for AI
    const dominantPatterns = (centralProfile.dominant_patterns as { key: string; score: number }[]) || [];
    const scores = (centralProfile.aggregated_scores as Record<string, number>) || {};

    const profileSummary = `
## Perfil Comportamental Central do Usuário
- Leituras completadas: ${centralProfile.tests_completed}
- Padrões dominantes: ${dominantPatterns.map((p) => `${p.key} (${p.score}%)`).join(", ")}
- Estado mental atual: ${centralProfile.mental_state || "não definido"}
- Dor central: ${centralProfile.core_pain || "não definida"}
- Área-chave de destravamento: ${centralProfile.key_unlock_area || "não definida"}
- Scores agregados: ${Object.entries(scores).map(([k, v]) => `${k}: ${v}%`).join(", ")}

## Histórico de Resultados (últimas ${results?.length || 0} leituras)
${(results || []).map((r, i) => `
### Leitura ${i + 1}
- Padrão dominante: ${r.dominant_pattern} (${r.intensity})
- Estado mental: ${r.mental_state}
- Resumo: ${r.state_summary}
- Ponto de bloqueio: ${r.blocking_point}
- Contradição: ${r.contradiction}
- Gatilhos: ${(r.triggers || []).join("; ")}
- Armadilhas: ${(r.traps || []).join("; ")}
- Ciclo de autossabotagem: ${(r.self_sabotage_cycle || []).join(" → ")}
`).join("")}
`;

    const systemPrompt = `Você é um analista comportamental. Sua tarefa é gerar uma interpretação personalizada do perfil comportamental de um usuário com base em dados reais.

REGRAS:
- Linguagem SIMPLES — como se estivesse explicando para um amigo inteligente que não é psicólogo
- Frases curtas (máximo 1,5 linhas). Se precisa de vírgula, quebre em duas frases.
- PROIBIDO: "resiliência", "protagonismo", "ressignificar", "empoderamento", "assertividade", "dinâmica relacional", "mecanismo compensatório"
- Em vez de termos técnicos, DESCREVA o que acontece
- Fale diretamente com o usuário (segunda pessoa)
- Não mencione nomes de variáveis ou campos técnicos
- Responda EXCLUSIVAMENTE em JSON válido com a estrutura especificada
- Teste: se sua avó não entenderia a frase, reescreva`;

    const userPrompt = `Com base nos dados abaixo, gere uma análise comportamental profunda.

${profileSummary}

Responda em JSON com exatamente esta estrutura:
{
  "interpretacao_personalizada": "Texto de 3-4 parágrafos com interpretação profunda e personalizada do funcionamento comportamental do usuário",
  "padroes_invisiveis": ["lista de 3-5 padrões que o usuário provavelmente não percebe em si mesmo"],
  "contradicoes_profundas": ["lista de 2-4 contradições internas que criam conflito no comportamento"],
  "recomendacoes_praticas": ["lista de 4-6 recomendações específicas e acionáveis para o usuário"]
}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Configuração de IA não disponível" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch AI model from global config
    let aiModel = "google/gemini-3-flash-preview";
    try {
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
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
      console.error("AI gateway error:", aiResponse.status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "Erro ao gerar insights" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    console.log("AI raw content length:", content.length);

    // Robust JSON extraction
    let insights;
    try {
      let cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      const jsonStart = cleaned.search(/[\{\[]/);
      const jsonEnd = cleaned.lastIndexOf(jsonStart !== -1 && cleaned[jsonStart] === '[' ? ']' : '}');

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No JSON found in response");
      }

      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

      try {
        insights = JSON.parse(cleaned);
      } catch {
        cleaned = cleaned
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]")
          .replace(/[\x00-\x1F\x7F]/g, "");
        insights = JSON.parse(cleaned);
      }
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw content:", content.substring(0, 500));
      insights = {
        interpretacao_personalizada: content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim(),
        padroes_invisiveis: [],
        contradicoes_profundas: [],
        recomendacoes_praticas: [],
      };
    }

    // Validate structure
    if (!insights.interpretacao_personalizada) insights.interpretacao_personalizada = "";
    if (!Array.isArray(insights.padroes_invisiveis)) insights.padroes_invisiveis = [];
    if (!Array.isArray(insights.contradicoes_profundas)) insights.contradicoes_profundas = [];
    if (!Array.isArray(insights.recomendacoes_praticas)) insights.recomendacoes_praticas = [];

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-insights error:", e);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
