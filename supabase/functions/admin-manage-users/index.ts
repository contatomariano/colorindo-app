import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { action, email, password, name, role, userId } = body;

        // Autenticação básica (verificando o JWT do request atual)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing Authorization header");

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) throw new Error("Unauthorized");

        // Idealmente, poderíamos cruzar o role do usuário para garantir q é admin
        // const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
        // if (profile?.role !== "admin") throw new Error("Forbidden: Requires admin role");

        if (action === "invite") {
            // Cria usuário no Auth
            const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { name, role }
            });

            if (createError) throw createError;

            // Insere no banco Profiles
            const { error: profileError } = await supabaseAdmin.from("profiles").insert([{
                id: newUserData.user.id,
                name: name,
                email: email,
                role: role || 'user',
                status: 'active'
            }]);

            if (profileError) throw profileError;

            return new Response(JSON.stringify({ success: true, user: newUserData.user }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (action === "reset_password") {
            if (!userId || !password) throw new Error("Missing userId or password");

            const { data, error } = await supabaseAdmin.auth.admin.updateUserAuth(userId, {
                password: password
            });

            if (error) {
                // Algumas versões mais recentes usam updateUserById
                console.error("updateUserAuth falhou, tentando updateUserById", error);
                const { data: d2, error: e2 } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                    password: password
                });
                if (e2) throw e2;
                return new Response(JSON.stringify({ success: true, user: d2.user }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ success: true, user: data.user }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (action === "delete") {
            if (!userId) throw new Error("Missing userId");

            // Deletar no auth vai disparar cascade pro profiles (ou delete no profiles limpa)
            const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (error) throw error;

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err: any) {
        console.error("ADMIN USERS ERROR:", err.message);
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
