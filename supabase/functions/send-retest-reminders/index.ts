import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INACTIVITY_DAYS = 15;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find the cutoff date (15 days ago)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - INACTIVITY_DAYS);
    const cutoffISO = cutoff.toISOString();

    // Get all completed sessions grouped by user+module, only the latest per combo
    // Using a raw approach: get all completed sessions, then process in JS
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

    // Find the latest session per user+module
    const latestByUserModule = new Map<string, typeof sessions[0]>();
    for (const s of sessions) {
      const key = `${s.user_id}__${s.test_module_id}`;
      if (!latestByUserModule.has(key)) {
        latestByUserModule.set(key, s);
      }
    }

    // Filter to those older than cutoff
    const stale = Array.from(latestByUserModule.values()).filter(
      (s) => new Date(s.completed_at!) < cutoff
    );

    if (stale.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "Nenhum usuário inativo" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which reminders were already sent (by checking email_logs)
    // We use a dedup key: template_name=retest-overdue + template_data contains session_id
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

    // Get user emails and module names
    const userIds = [...new Set(stale.map((s) => s.user_id))];
    const moduleIds = [...new Set(stale.map((s) => s.test_module_id))];

    // Fetch auth users via profiles (since we can't query auth.users)
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

    // Get user emails from auth.users via admin API
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

      // Send via the existing send-email function
      const { error: sendErr } = await supabase.functions.invoke("send-email", {
        body: {
          templateName: "retest-overdue",
          to: email,
          data: {
            name: profile?.name || "",
            moduleName: mod?.name || "Análise Comportamental",
            daysSince: String(daysSince),
            testUrl: `https://raio-x-comportamental.lovable.app/diagnostic/${mod?.slug || ""}`,
            dedup_key: dedupKey,
            user_id: session.user_id,
            module_id: session.test_module_id,
            session_id: session.id,
          },
        },
      });

      if (sendErr) {
        console.error(`Error sending to ${email}:`, sendErr);
      } else {
        sentCount++;
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
