import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: corsHeaders });
    }

    const { diagnosticResultId, testModuleId } = await req.json();

    if (!diagnosticResultId || !testModuleId) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), { status: 400, headers: corsHeaders });
    }

    // Get diagnostic result
    const { data: result } = await supabase
      .from("diagnostic_results")
      .select("dominant_pattern, profile_name, state_summary, all_scores")
      .eq("id", diagnosticResultId)
      .single();

    if (!result) {
      return new Response(JSON.stringify({ error: "Resultado não encontrado" }), { status: 404, headers: corsHeaders });
    }

    // Get actions with notes
    const { data: actions } = await supabase
      .from("action_plan_tracking")
      .select("action_text, completed, notes, day_number")
      .eq("diagnostic_result_id", diagnosticResultId)
      .eq("user_id", user.id)
      .order("day_number");

    if (!actions?.length) {
      return new Response(JSON.stringify({ error: "Nenhuma ação encontrada" }), { status: 404, headers: corsHeaders });
    }

    // Get test module name
    const { data: mod } = await supabase
      .from("test_modules")
      .select("name")
      .eq("id", testModuleId)
      .single();

    const completedActions = actions.filter(a => a.completed);
    const pendingActions = actions.filter(a => !a.completed);
    const actionsWithNotes = actions.filter(a => a.notes && a.notes.trim());

    // Build AI prompt
    const prompt = `Você é um analista comportamental do Raio-X Mental. Gere um feedback CURTO e DIRETO sobre o progresso do usuário.

CONTEXTO DO DIAGNÓSTICO:
- Teste: ${mod?.name || "Comportamental"}
- Padrão dominante: ${result.dominant_pattern}
- Perfil: ${result.profile_name}
- Resumo: ${result.state_summary}

PROGRESSO DAS AÇÕES:
- Total: ${actions.length}
- Concluídas: ${completedActions.length}
- Pendentes: ${pendingActions.length}

AÇÕES CONCLUÍDAS:
${completedActions.map(a => `✅ ${a.action_text}`).join("\n") || "Nenhuma"}

AÇÕES PENDENTES:
${pendingActions.map(a => `⬜ ${a.action_text}`).join("\n") || "Nenhuma"}

ANOTAÇÕES DO USUÁRIO:
${actionsWithNotes.map(a => `- Ação: "${a.action_text}"\n  Anotação: "${a.notes}"`).join("\n\n") || "Nenhuma anotação registrada"}

REGRAS DO FEEDBACK:
1. Máximo 5 frases
2. Seja direto — sem enrolação
3. Cite especificamente o que o usuário fez ou deixou de fazer (baseado nas ações e anotações)
4. Se houver anotações, use-as para entender o que está funcionando ou travando
5. Conecte o progresso ao padrão dominante "${result.dominant_pattern}"
6. Se o usuário não fez quase nada, seja confrontador mas construtivo
7. Se fez tudo, reconheça mas aponte o próximo passo
8. NÃO use frases genéricas como "continue assim" ou "você está no caminho certo"
9. Escreva em português brasileiro
10. Não use emojis nem formatação markdown

Gere o feedback:`;

    // Call AI
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Configuração de IA ausente" }), { status: 500, headers: corsHeaders });
    }

    const aiResponse = await fetch("https://ai.lovable.dev/api/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um analista comportamental direto e confrontador. Gere feedbacks curtos baseados em dados reais." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI API error:", await aiResponse.text());
      return new Response(JSON.stringify({ error: "Erro ao gerar feedback" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await aiResponse.json();
    const feedback = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (!feedback) {
      return new Response(JSON.stringify({ error: "Feedback vazio" }), { status: 500, headers: corsHeaders });
    }

    // Save feedback
    await supabase.from("progress_ai_feedback").insert({
      user_id: user.id,
      diagnostic_result_id: diagnosticResultId,
      test_module_id: testModuleId,
      feedback_text: feedback,
      actions_completed: completedActions.length,
      actions_total: actions.length,
    });

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-progress error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
