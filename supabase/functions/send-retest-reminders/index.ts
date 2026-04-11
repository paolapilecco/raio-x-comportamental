import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Load dynamic config
    const { data: configRow } = await supabase
      .from("retest_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    const cfg = {
      retest_enabled: configRow?.retest_enabled ?? true,
      retest_days_threshold: configRow?.retest_days_threshold ?? 15,
      email_reminder_enabled: configRow?.email_reminder_enabled ?? true,
      email_subject: configRow?.email_subject ?? "Sua análise já está desatualizada",
      email_heading: configRow?.email_heading ?? "Seu padrão continua ativo.",
      email_body_intro: configRow?.email_body_intro ?? "Seu último resultado ainda define seu comportamento atual. Nada indica que isso mudou.",
      email_body_cta: configRow?.email_body_cta ?? "Refaça sua análise e veja se você evoluiu ou só adiou.",
    };

    if (!cfg.retest_enabled || !cfg.email_reminder_enabled) {
      return new Response(JSON.stringify({ sent: 0, message: "Envio desativado pela configuração" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const INACTIVITY_DAYS = cfg.retest_days_threshold;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - INACTIVITY_DAYS);
    const cutoffISO = cutoff.toISOString();

    const { data: sessions, error: sessErr } = await supabase
      .from("diagnostic_sessions")
      .select("id, user_id, test_module_id, completed_at")
      .not("completed_at", "is", null)
      .not("test_module_id", "is", null)
      .order("completed_at", { ascending: false });

    if (sessErr) {
      console.error("Error fetching sessions:", sessErr);
      return new Response(JSON.stringify({ error: "Erro interno" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "Nenhuma sessão encontrada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latestByUserModule = new Map<string, typeof sessions[0]>();
    for (const s of sessions) {
      const key = `${s.user_id}__${s.test_module_id}`;
      if (!latestByUserModule.has(key)) {
        latestByUserModule.set(key, s);
      }
    }

    const stale = Array.from(latestByUserModule.values()).filter(
      (s) => new Date(s.completed_at!) < cutoff
    );

    if (stale.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "Nenhum usuário inativo" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingLogs } = await supabase
      .from("email_logs")
      .select("template_data")
      .eq("template_name", "retest-overdue")
      .eq("status", "sent");

    const alreadySent = new Set<string>();
    if (existingLogs) {
      for (const log of existingLogs) {
        const td = log.template_data as Record<string, any> | null;
        if (td?.dedup_key) {
          alreadySent.add(td.dedup_key);
        }
      }
    }

    const userIds = [...new Set(stale.map((s) => s.user_id))];
    const moduleIds = [...new Set(stale.map((s) => s.test_module_id))];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name")
      .in("user_id", userIds);

    const profileMap = new Map<string, { name: string }>();
    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.user_id, { name: p.name });
      }
    }

    const userEmails = new Map<string, string>();
    for (const uid of userIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(uid);
      if (userData?.user?.email) {
        userEmails.set(uid, userData.user.email);
      }
    }

    const { data: modulesData } = await supabase
      .from("test_modules")
      .select("id, name, slug")
      .in("id", moduleIds as string[]);

    const moduleMap = new Map<string, { name: string; slug: string }>();
    if (modulesData) {
      for (const m of modulesData) {
        moduleMap.set(m.id, { name: m.name, slug: m.slug });
      }
    }

    let sentCount = 0;

    for (const session of stale) {
      const dedupKey = `${session.user_id}__${session.test_module_id}__${session.id}`;
      if (alreadySent.has(dedupKey)) continue;

      const email = userEmails.get(session.user_id);
      if (!email) continue;

      const profile = profileMap.get(session.user_id);
      const mod = moduleMap.get(session.test_module_id!);
      const daysSince = Math.floor(
        (Date.now() - new Date(session.completed_at!).getTime()) / (1000 * 60 * 60 * 24)
      );

      const { error: sendErr } = await supabase.functions.invoke("send-email", {
        body: {
          templateName: "retest-overdue",
          to: email,
          subjectOverride: cfg.email_subject,
          data: {
            name: profile?.name || "",
            moduleName: mod?.name || "Análise Comportamental",
            daysSince: String(daysSince),
            testUrl: `https://raio-x-comportamental.lovable.app/diagnostic/${mod?.slug || ""}?origin=email_reminder`,
            dedup_key: dedupKey,
            user_id: session.user_id,
            module_id: session.test_module_id,
            session_id: session.id,
            // Dynamic content from config
            heading: cfg.email_heading,
            bodyIntro: cfg.email_body_intro,
            bodyCta: cfg.email_body_cta,
          },
        },
      });

      if (sendErr) {
        console.error(`Error sending to ${email}:`, sendErr);
      } else {
        sentCount++;
        // Track retest_email_sent event
        const eventKey = `res::${session.user_id}::${session.test_module_id || ''}::${session.id}`;
        await supabase.from("analytics_events").upsert({
          user_id: session.user_id,
          event_name: "retest_email_sent",
          module_id: session.test_module_id,
          metadata: { daysSince, dedupKey },
          event_key: eventKey,
        }, { onConflict: 'event_key', ignoreDuplicates: true }).then(() => {});
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, checked: stale.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-retest-reminders error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
