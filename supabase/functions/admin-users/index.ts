import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is super_admin
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

    // Check super_admin role
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle different actions
    const body = await req.json().catch(() => ({}));
    const action = body.action || "list";

    if (action === "metrics") {
      // Get counts for admin dashboard
      const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const totalUsers = allUsers?.length || 0;

      const { data: allRoles } = await adminClient.from("user_roles").select("role");
      const premiumCount = (allRoles || []).filter((r: any) => r.role === "premium" || r.role === "super_admin").length;

      const { data: subs } = await adminClient.from("subscriptions").select("status, plan, value, created_at");
      const activeSubs = (subs || []).filter((s: any) => s.status === "active");
      const monthlyRevenue = activeSubs.reduce((acc: number, s: any) => {
        if (s.plan === "yearly") return acc + (s.value / 12);
        return acc + s.value;
      }, 0);

      const { count: totalSessions } = await adminClient
        .from("diagnostic_sessions")
        .select("*", { count: "exact", head: true })
        .not("completed_at", "is", null);

      const { count: totalModules } = await adminClient
        .from("test_modules")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Users created in last 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const newUsersThisWeek = (allUsers || []).filter((u: any) => u.created_at >= weekAgo).length;

      // Recent signups (last 10)
      const recentUsers = (allUsers || [])
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map((u: any) => ({ email: u.email, created_at: u.created_at }));

      return new Response(JSON.stringify({
        totalUsers,
        premiumCount,
        freeCount: totalUsers - premiumCount,
        activeSubs: activeSubs.length,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        totalSessions: totalSessions || 0,
        totalModules: totalModules || 0,
        newUsersThisWeek,
        conversionRate: totalUsers > 0 ? Math.round((premiumCount / totalUsers) * 10000) / 100 : 0,
        recentUsers,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "export_users") {
      const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const { data: allRoles } = await adminClient.from("user_roles").select("user_id, role");
      const { data: allProfiles } = await adminClient.from("profiles").select("user_id, name, age, cpf");
      const { data: allSubs } = await adminClient.from("subscriptions").select("user_id, plan, status, billing_type, value, created_at");

      const roleMap: Record<string, string[]> = {};
      (allRoles || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });
      const profileMap: Record<string, any> = {};
      (allProfiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      const subMap: Record<string, any> = {};
      (allSubs || []).forEach((s: any) => { subMap[s.user_id] = s; });

      const csvRows = [["Email","Nome","Idade","Roles","Plano Assinatura","Status","Valor","Cadastro","Último Acesso"]];
      (allUsers || []).forEach((u: any) => {
        const p = profileMap[u.id];
        const s = subMap[u.id];
        csvRows.push([
          u.email || "",
          p?.name || "",
          p?.age?.toString() || "",
          (roleMap[u.id] || ["user"]).join(";"),
          s?.plan || "free",
          s?.status || "-",
          s?.value?.toString() || "0",
          u.created_at?.split("T")[0] || "",
          u.last_sign_in_at?.split("T")[0] || "",
        ]);
      });

      const csv = csvRows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
      return new Response(JSON.stringify({ csv }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      // List all users with their roles and profiles
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
        perPage: 500,
      });

      if (listError) {
        return new Response(JSON.stringify({ error: "Erro ao listar usuários" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all roles
      const { data: allRoles } = await adminClient
        .from("user_roles")
        .select("user_id, role");

      // Get all profiles
      const { data: allProfiles } = await adminClient
        .from("profiles")
        .select("user_id, name, age");

      const roleMap: Record<string, string[]> = {};
      (allRoles || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      const profileMap: Record<string, any> = {};
      (allProfiles || []).forEach((p: any) => {
        profileMap[p.user_id] = p;
      });

      const result = (users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        roles: roleMap[u.id] || ["user"],
        profile: profileMap[u.id] || null,
      }));

      return new Response(JSON.stringify({ users: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_premium") {
      const targetUserId = body.user_id;
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "user_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already has premium role
      const { data: existing } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("role", "premium")
        .maybeSingle();

      if (existing) {
        // Remove premium
        await adminClient.from("user_roles").delete().eq("id", existing.id);
        // Log change
        await adminClient.from("plan_change_history").insert({
          user_id: targetUserId, previous_plan: "premium", new_plan: "standard", changed_by: user.id,
        });
        return new Response(JSON.stringify({ action: "removed", role: "premium" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Add premium
        await adminClient.from("user_roles").insert({ user_id: targetUserId, role: "premium" });
        // Log change
        await adminClient.from("plan_change_history").insert({
          user_id: targetUserId, previous_plan: "standard", new_plan: "premium", changed_by: user.id,
        });
        return new Response(JSON.stringify({ action: "added", role: "premium" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-users error:", e);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
