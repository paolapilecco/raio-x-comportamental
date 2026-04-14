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

    const INACTIVITY_DAYS = 3;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - INACTIVITY_DAYS);

    // Find users with recent analytics events indicating stalls
    const { data: events } = await supabase
      .from("analytics_events")
      .select("user_id, event_name, metadata, created_at")
      .in("event_name", ["retest_alert_viewed"])
      .gte("created_at", cutoff.toISOString())
      .order("created_at", { ascending: false });

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "Nenhum evento de reengajamento" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate: one email per user per type
    const userTypeMap = new Map<string, { userId: string; type: string; createdAt: string }>();
    for (const ev of events) {
      const meta = ev.metadata as Record<string, any> | null;
      const type = meta?.type as string;
      if (!type) continue;
      const key = `${ev.user_id}__${type}`;
      if (!userTypeMap.has(key)) {
        userTypeMap.set(key, { userId: ev.user_id, type, createdAt: ev.created_at });
      }
    }

    // Check already sent emails (dedup)
    const { data: existingLogs } = await supabase
      .from("email_logs")
      .select("template_data")
      .in("template_name", ["reengagement-plan-stalled", "reengagement-task-incomplete", "reengagement-retest-available"])
      .eq("status", "sent");

    const alreadySent = new Set<string>();
    if (existingLogs) {
      for (const log of existingLogs) {
        const td = log.template_data as Record<string, any> | null;
        if (td?.dedup_key) alreadySent.add(td.dedup_key);
      }
    }

    const userIds = [...new Set([...userTypeMap.values()].map(v => v.userId))];

    // Fetch profiles and emails
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name")
      .in("user_id", userIds);

    const profileMap = new Map<string, string>();
    if (profiles) for (const p of profiles) profileMap.set(p.user_id, p.name);

    const emailMap = new Map<string, string>();
    for (const uid of userIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(uid);
      if (userData?.user?.email) emailMap.set(uid, userData.user.email);
    }

    const templateMap: Record<string, string> = {
      plan_stalled: "reengagement-plan-stalled",
      task_incomplete: "reengagement-task-incomplete",
      retest_available: "reengagement-retest-available",
    };

    let sentCount = 0;

    for (const [, { userId, type }] of userTypeMap) {
      const templateName = templateMap[type];
      if (!templateName) continue;

      const dedupKey = `${userId}__${type}__${new Date().toISOString().slice(0, 10)}`;
      if (alreadySent.has(dedupKey)) continue;

      const email = emailMap.get(userId);
      if (!email) continue;

      const name = profileMap.get(userId) || "";

      const { error: sendErr } = await supabase.functions.invoke("send-email", {
        body: {
          templateName,
          to: email,
          data: {
            name,
            dedup_key: dedupKey,
            user_id: userId,
            dashboardUrl: "https://raio-x-comportamental.lovable.app/dashboard",
          },
        },
      });

      if (sendErr) {
        console.error(`Error sending ${templateName} to ${email}:`, sendErr);
      } else {
        sentCount++;
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, checked: userTypeMap.size }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-reengagement error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
