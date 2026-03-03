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

        if (authError || !user) throw new Error("Unauthorized");

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

            // Insere no profile (usamos o ID gerado pelo Auth)
            const { error: profileError } = await supabaseAdmin.from("profiles").insert([{
                id: newUserData.user.id,
                name: name,
                email: email,
                role: role || 'user',
                status: 'active'
            }]);

            if (profileError) {
                // Se falhou inserir no profile, tenta apagar no auth pra nao ficar inconsistente
                await supabaseAdmin.auth.admin.deleteUser(newUserData.user.id);
                if (profileError.message.includes("profiles_email_key") || profileError.message.includes("duplicate key")) {
                    throw new Error("O e-mail já existe na base de Perfis como um usuário simulado/antigo. Por favor, feche e procure na lista o usuário com este e-mail para ESCUÍ-LO antes de criar o acesso definitivo.");
                }
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
