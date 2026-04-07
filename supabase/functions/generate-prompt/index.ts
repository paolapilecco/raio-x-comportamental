import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SECTION_PURPOSES: Record<string, string> = {
  interpretation: "Interpretar os scores dos eixos e identificar padrões dominantes, conflitos internos e contradições entre percepção e ação.",
  diagnosis: "Gerar o diagnóstico final nomeando o ciclo, causa raiz, mecanismo exato e diferença entre problema percebido vs real.",
  profile: "Criar um perfil comportamental com nome criativo, estado mental, traços dominantes e nível de risco.",
  core_pain: "Identificar a dor central (medo/ferida emocional) que sustenta todos os padrões — não sintomas, mas a causa.",
  triggers: "Mapear gatilhos situacionais concretos, armadilhas mentais (pensamentos automáticos) e o ciclo de autossabotagem.",
  direction: "Sugerir direção prática com ação imediata, área-chave de destravamento e ponto de bloqueio.",
  restrictions: "Definir regras negativas obrigatórias — o que a IA NÃO deve fazer ao gerar os resultados.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { testId, sectionType } = await req.json();

    if (!testId || typeof testId !== "string" || testId.length > 100) {
      return new Response(JSON.stringify({ error: "ID do teste inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const validSections = Object.keys(SECTION_PURPOSES);
    if (!sectionType || !validSections.includes(sectionType)) {
      return new Response(JSON.stringify({ error: "Tipo de seção inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch test module info
    const { data: testModule } = await supabase
      .from("test_modules")
      .select("id, name, slug, description, category, icon")
      .eq("id", testId)
      .single();

    if (!testModule) {
      return new Response(JSON.stringify({ error: "Teste não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch questions, report template, and existing prompts in parallel
    const [questionsRes, templateRes, promptsRes] = await Promise.all([
      supabase.from("questions").select("text, type, axes, weight, options, context").eq("test_id", testId).order("sort_order").limit(50),
      supabase.from("report_templates").select("sections, output_rules").eq("test_id", testId).maybeSingle(),
      supabase.from("test_prompts").select("prompt_type, content, is_active").eq("test_id", testId).eq("is_active", true),
    ]);

    const questions = questionsRes.data || [];
    const template = templateRes.data;
    const existingPrompts = promptsRes.data || [];

    // Build context summary
    const questionsSummary = questions.length > 0
      ? questions.slice(0, 30).map((q, i) => `${i + 1}. [${q.type}] "${q.text}" (eixos: ${(q.axes || []).join(", ")}${q.context ? `, contexto: ${q.context}` : ""})`).join("\n")
      : "Nenhuma pergunta cadastrada ainda.";

    const axes = [...new Set(questions.flatMap(q => q.axes || []))];
    const questionTypes = [...new Set(questions.map(q => q.type))];

    const templateInfo = template
      ? `Seções do relatório: ${JSON.stringify(template.sections)}\nRegras de saída: ${JSON.stringify(template.output_rules)}`
      : "Nenhum template de relatório configurado.";

    const otherPrompts = existingPrompts
      .filter(p => p.prompt_type !== sectionType && p.content.trim())
      .map(p => `[${p.prompt_type}]: ${p.content.slice(0, 200)}...`)
      .join("\n\n");

    const systemPrompt = `Você é um especialista em engenharia de prompts para diagnósticos comportamentais e psicométricos.

Sua tarefa é gerar um prompt altamente específico para a seção "${sectionType}" (${SECTION_PURPOSES[sectionType]}) de um teste diagnóstico.

REGRAS ABSOLUTAS:
1. O prompt gerado deve ser 100% específico para ESTE teste — nunca genérico
2. Referencie os eixos reais, tipos de pergunta e temas das questões cadastradas
3. O tom deve ser profissional e direto
4. Inclua regras claras do que fazer e do que NÃO fazer
5. Estruture com seções numeradas
6. Máximo 500 palavras
7. Considere as regras de saída do template se existirem
8. Não repita instruções que já existam em outros prompts do mesmo teste
9. Retorne APENAS o texto do prompt — sem explicações, sem markdown extra`;

    const userPrompt = `CONTEXTO COMPLETO DO TESTE:

Nome: ${testModule.name}
Slug: ${testModule.slug}
Categoria: ${testModule.category}
Descrição: ${testModule.description}

EIXOS IDENTIFICADOS: ${axes.length > 0 ? axes.join(", ") : "nenhum ainda"}
TIPOS DE PERGUNTA: ${questionTypes.length > 0 ? questionTypes.join(", ") : "nenhum ainda"}
TOTAL DE PERGUNTAS: ${questions.length}

PERGUNTAS CADASTRADAS:
${questionsSummary}

TEMPLATE DO RELATÓRIO:
${templateInfo}

OUTROS PROMPTS JÁ CONFIGURADOS:
${otherPrompts || "Nenhum outro prompt configurado ainda."}

---

SEÇÃO A GERAR: ${sectionType}
FUNÇÃO DESTA SEÇÃO: ${SECTION_PURPOSES[sectionType]}

Gere o prompt otimizado para esta seção, considerando todo o contexto acima.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "Erro ao gerar prompt" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    if (!content.trim()) {
      return new Response(JSON.stringify({ error: "A IA não retornou conteúdo" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean markdown fences if present
    let cleaned = content.trim();
    const fenceMatch = cleaned.match(/^```(?:\w+)?\s*\n?([\s\S]*?)\n?```$/);
    if (fenceMatch) cleaned = fenceMatch[1].trim();

    return new Response(JSON.stringify({ prompt: cleaned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-prompt error:", e);
    return new Response(JSON.stringify({ error: "Erro interno ao gerar prompt" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
