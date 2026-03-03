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

        // Autenticacao
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing Authorization header");

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            throw new Error(`Unauthorized: ${authError?.message || 'No user found'}`);
        }

        const { data: profile, error: profileCheckError } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();

        if (profileCheckError || !profile || (profile.role !== "admin" && profile.role !== "manager")) {
            throw new Error("Forbidden: You do not have permission to manage users.");
        }

        if (action === "invite") {
            const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { name, role }
            });

            if (createError) {
                if (createError.message.includes("already registered") || createError.message.includes("already active")) {
                    throw new Error("Este e-mail já possui um acesso registrado no sistema.");
                }
                throw createError;
            }

            // A base Supabase já possui uma Trigger "Action" (handle_new_user)
            // que cria automaticamente o profile quando o usuário é salvo no Auth.
            // Por isso, se tentarmos INSERIR, dá erro de profiles_email_key. 
            // A solução é fazer UPDATE do profile recém inserido para aplicar a Role correta.
            const { error: profileError } = await supabaseAdmin.from("profiles").update({
                name: name,
                role: role || 'user',
                status: 'active'
            }).eq("id", newUserData.user.id);

            if (profileError) {
                // Se falhou inserir no profile, tenta apagar no auth pra nao ficar inconsistente
                await supabaseAdmin.auth.admin.deleteUser(newUserData.user.id);
                throw profileError;
            }

            return new Response(JSON.stringify({ success: true, user: newUserData.user }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (action === "reset_password") {
            if (!userId || !password) throw new Error("Missing userId or password");

            const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: password
            });

            if (error) {
                if (error.message === "User not found") {
                    throw new Error("Este usuário não tem conta de acesso real (foi criado no formato antigo ou ocorreu falha no convite). Por favor, exclua-o e crie novamente.");
                }
                throw error;
            }
            return new Response(JSON.stringify({ success: true, user: data.user }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (action === "delete") {
            if (!userId) throw new Error("Missing userId");

            // Tenta deletar no auth. Se não achar, ignora e segue pra limpar o database pra nao travar o sistema
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (authError && authError.message !== "User not found") throw authError;

            // Limpeza garantida na tabela profiles
            await supabaseAdmin.from("profiles").delete().eq("id", userId);

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err: any) {
        console.error("ADMIN USERS ERROR:", err.message);
        // Retornar 200 COM o erro no JSON para o JS no client conseguir ler
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
