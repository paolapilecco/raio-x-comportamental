import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, answers } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return new Response(JSON.stringify({ error: "Respostas inválidas" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate each answer
    for (const a of answers) {
      if (typeof a.questionId !== "number" || typeof a.value !== "number") {
        return new Response(JSON.stringify({ error: "Formato de resposta inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Helper: notify professional via email (non-blocking)
    const notifyProfessional = async (ownerEmail: string, patientName: string, testName: string, dominantPattern: string, intensity: string, personId: string) => {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({
            templateName: "test-completed",
            to: ownerEmail,
            data: { patientName, testName, dominantPattern, intensity, detailUrl: `https://raio-x-comportamental.lovable.app/patient/${personId}` },
          }),
        });
      } catch (e) { console.error("Email notification error:", e); }
    };

    // 1. Validate token
    const { data: invite, error: inviteErr } = await supabase
      .from("test_invites")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (inviteErr || !invite) {
      return new Response(JSON.stringify({ error: "Link inválido, expirado ou já utilizado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch professional email, patient name, and test name for notification
    const [ownerRes, personRes, testModuleRes] = await Promise.all([
      supabase.auth.admin.getUserById(invite.owner_id),
      supabase.from("managed_persons").select("name").eq("id", invite.person_id).maybeSingle(),
      supabase.from("test_modules").select("name").eq("id", invite.test_module_id).maybeSingle(),
    ]);
    const ownerEmail = ownerRes.data?.user?.email || "";
    const patientName = personRes.data?.name || "Paciente";
    const testName = testModuleRes.data?.name || "Diagnóstico";

    // 2. Create session under the professional's user_id
    const { data: session, error: sessionErr } = await supabase
      .from("diagnostic_sessions")
      .insert({
        user_id: invite.owner_id,
        test_module_id: invite.test_module_id,
        person_id: invite.person_id,
      })
      .select("id")
      .single();

    if (sessionErr || !session) {
      console.error("Session create error:", sessionErr);
      return new Response(JSON.stringify({ error: "Erro ao criar sessão" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Insert answers
    const answerRows = answers.map((a: any) => ({
      session_id: session.id,
      question_id: a.questionId,
      answer_value: a.value,
    }));

    const { error: ansErr } = await supabase.from("diagnostic_answers").insert(answerRows);
    if (ansErr) {
      console.error("Answers insert error:", ansErr);
      return new Response(JSON.stringify({ error: "Erro ao salvar respostas" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Mark invite as used
    await supabase
      .from("test_invites")
      .update({ status: "used", completed_session_id: session.id })
      .eq("id", invite.id);

    // 5. Try to run AI analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Fetch questions for score calculation
    const { data: questions } = await supabase
      .from("questions")
      .select("sort_order, text, axes, type, options, option_scores")
      .eq("test_id", invite.test_module_id)
      .order("sort_order", { ascending: true });

    if (!questions) {
      // Complete session without analysis
      await supabase.from("diagnostic_sessions").update({ completed_at: new Date().toISOString() }).eq("id", session.id);
      return new Response(JSON.stringify({ success: true, sessionId: session.id, message: "Respostas salvas. Análise pendente." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate raw scores
    const allAxes = new Set<string>();
    questions.forEach((q: any) => (q.axes || []).forEach((a: string) => allAxes.add(a)));
    const axisKeys = Array.from(allAxes);

    const rawScores: Record<string, number> = {};
    const maxScores: Record<string, number> = {};
    axisKeys.forEach(k => { rawScores[k] = 0; maxScores[k] = 0; });

    answers.forEach((answer: any) => {
      const question = questions.find((q: any) => (q.sort_order || 0) === answer.questionId);
      if (!question) return;

      let scoreValue: number;
      let maxPerQuestion: number;

      if (question.option_scores && question.option_scores.length > 0) {
        const idx = Math.max(0, Math.min(answer.value - 1, question.option_scores.length - 1));
        scoreValue = question.option_scores[idx];
        maxPerQuestion = Math.max(...question.option_scores);
      } else if (question.type === "intensity") {
        scoreValue = answer.value;
        maxPerQuestion = 10;
      } else {
        scoreValue = Math.max(0, answer.value - 1);
        maxPerQuestion = 4;
      }

      (question.axes || []).forEach((axis: string) => {
        if (axis in rawScores) {
          rawScores[axis] += scoreValue;
          maxScores[axis] += maxPerQuestion;
        }
      });
    });

    const scores = axisKeys.map(key => ({
      key,
      label: key,
      score: rawScores[key],
      maxScore: maxScores[key],
      percentage: maxScores[key] > 0 ? Math.min(100, Math.round((rawScores[key] / maxScores[key]) * 100)) : 0,
    })).sort((a, b) => b.percentage - a.percentage);

    // Try AI analysis via analyze-test function
    try {
      const analyzeResp = await fetch(`${supabaseUrl}/functions/v1/analyze-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          test_module_id: invite.test_module_id,
          scores,
          slug: "", // Will be resolved inside
          answers: answers.map((a: any) => {
            const q = questions.find((dq: any) => (dq.sort_order || 0) === a.questionId);
            return {
              questionId: a.questionId,
              questionText: q?.text || "",
              questionType: q?.type || "likert",
              axes: q?.axes || [],
              value: a.value,
              mappedScore: 0,
              chosenOption: q?.options?.[a.value - 1] || `Valor ${a.value}`,
            };
          }),
        }),
      });

      if (analyzeResp.ok) {
        const aiData = await analyzeResp.json();
        const ai = aiData?.analysis;

        if (ai && !aiData?.useFallback) {
          const dominant = scores[0];
          const intensity = dominant.percentage >= 75 ? "alto" : dominant.percentage >= 50 ? "moderado" : "leve";

          await supabase.from("diagnostic_results").insert({
            session_id: session.id,
            dominant_pattern: dominant.key,
            secondary_patterns: scores.filter((s, i) => i > 0 && s.percentage >= 40).slice(0, 2).map(s => s.key),
            intensity,
            profile_name: ai.profileName || dominant.label,
            mental_state: ai.mentalState || "",
            state_summary: ai.summary || "",
            mechanism: ai.mechanism || "",
            triggers: ai.triggers || [],
            traps: ai.mentalTraps || [],
            self_sabotage_cycle: ai.selfSabotageCycle || [],
            blocking_point: ai.blockingPoint || "",
            contradiction: ai.contradiction || "",
            life_impact: ai.lifeImpact || [],
            exit_strategy: ai.exitStrategy || [],
            all_scores: scores,
            direction: ai.direction || "",
            combined_title: ai.combinedTitle || dominant.label,
            core_pain: ai.corePain || "",
            key_unlock_area: ai.keyUnlockArea || "",
            critical_diagnosis: ai.criticalDiagnosis || "",
            impact: ai.impact || "",
            what_not_to_do: ai.whatNotToDo || [],
          });

          await supabase.from("diagnostic_sessions").update({ completed_at: new Date().toISOString() }).eq("id", session.id);

          // Notify professional
          if (ownerEmail) {
            notifyProfessional(ownerEmail, patientName, testName, dominant.key, intensity, invite.person_id).catch(() => {});
          }

          return new Response(JSON.stringify({ success: true, sessionId: session.id, analyzed: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch (e) {
      console.error("AI analysis error:", e);
    }

    // Fallback: save basic result with scores only
    const dominant = scores[0];
    const intensity = dominant.percentage >= 75 ? "alto" : dominant.percentage >= 50 ? "moderado" : "leve";

    await supabase.from("diagnostic_results").insert({
      session_id: session.id,
      dominant_pattern: dominant.key,
      secondary_patterns: scores.filter((s, i) => i > 0 && s.percentage >= 40).slice(0, 2).map(s => s.key),
      intensity,
      profile_name: dominant.label,
      mental_state: "Análise pendente",
      state_summary: "Resultado calculado automaticamente. A profissional poderá complementar a análise.",
      mechanism: "",
      contradiction: "",
      blocking_point: "",
      direction: "",
      combined_title: dominant.label,
      all_scores: scores,
      core_pain: "",
      key_unlock_area: "",
      critical_diagnosis: "",
      impact: "",
      what_not_to_do: [],
    });

    await supabase.from("diagnostic_sessions").update({ completed_at: new Date().toISOString() }).eq("id", session.id);

    return new Response(JSON.stringify({ success: true, sessionId: session.id, analyzed: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("submit-public-test error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
