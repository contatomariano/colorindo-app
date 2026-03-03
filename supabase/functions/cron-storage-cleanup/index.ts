import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Validação de Segurança (Apenas Admin ou CRON podem invocar)
        const authHeader = req.headers.get("Authorization");
        const cronHeader = req.headers.get("X-Supabase-Cron"); // Opcional, se invocado pelo pg_cron

        if (!cronHeader) {
            if (!authHeader) throw new Error("Missing Authorization header");
            const token = authHeader.replace("Bearer ", "").trim();
            const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
            if (authError || !user) throw new Error(`Unauthorized: ${authError?.message}`);

            const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
            if (profile?.role !== "admin") throw new Error("Forbidden: Apenas administradores podem executar o expurgo.");
        }

        console.log("Iniciando rotina de expurgo LGPD (Arquivos > 15 dias)...");

        // Calcular data de 15 dias atrás
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        const dateString = fifteenDaysAgo.toISOString();

        // 1. Buscar todos os pedidos mais antigos que 15 dias que AINDA têm URLs ativas de fotos
        const { data: oldOrders, error: ordersErr } = await supabaseAdmin
            .from("orders")
            .select("id, child_photo_url, character_url, cover_url, pdf_url, pages_data")
            .not("error_message", "ilike", "%EXPURGADOS%")
            .lt("created_at", dateString);

        if (ordersErr) throw new Error("Erro ao buscar pedidos antigos: " + ordersErr.message);

        let deletedFilesCount = 0;
        let ordersProcessed = 0;

        for (const order of oldOrders || []) {
            const orderId = order.id;
            console.log(`Verificando pasta do pedido: ${orderId}`);

            // 2. Listar arquivos na pasta do pedido no bucket 'order_pdfs' (ou outros buckets se houver)
            // Assumindo que child_photo_url e outros assets estão salvos em "order_pdfs" ou "uploads"
            // No Colorindo APP, o padrão é a URL pública apontar para o storage.
            // Para limpeza total do conteúdo associado ao pedido iteramos a pasta do orderId.
            const { data: filesList, error: listErr } = await supabaseAdmin.storage
                .from("order_pdfs")
                .list(orderId);

            if (!listErr && filesList && filesList.length > 0) {
                // Monta array de caminhos a deletar
                const pathsToDelete = filesList.map(f => `${orderId}/${f.name}`);

                // Exclui arquivos do Storage Fisicamente
                const { error: deleteErr } = await supabaseAdmin.storage
                    .from("order_pdfs")
                    .remove(pathsToDelete);

                if (deleteErr) {
                    console.error(`Erro ao deletar arquivos do pedido ${orderId}:`, deleteErr);
                } else {
                    console.log(`Deletados ${pathsToDelete.length} arquivos do pedido ${orderId}`);
                    deletedFilesCount += pathsToDelete.length;

                    // 3. Obfuscate/Limpa os dados PI das colunas no banco de dados para evitar vazamento
                    // Mantemos o orderId para métricas, mas apagamos as referências PII
                    await supabaseAdmin.from("orders").update({
                        child_photo_url: null,
                        character_url: null,
                        cover_url: null,
                        pdf_url: null,
                        scenes_pdf_url: null,
                        cover_pdf_url: null,
                        error_message: "ARQUIVOS EXPURGADOS (LGPD - >15 DIAS)",
                        pages_data: null // opcional: limpar JSON das páginas 
                    }).eq("id", orderId);

                    ordersProcessed++;
                }
            } else {
                // Pasta do pedido já está vazia ou não existe em order_pdfs
                console.log(`Pedido ${orderId} já não possuía arquivos. Mascarando banco...`);
                const { error: updErr2 } = await supabaseAdmin.from("orders").update({
                    child_photo_url: null,
                    character_url: null,
                    cover_url: null,
                    pdf_url: null,
                    scenes_pdf_url: null,
                    cover_pdf_url: null,
                    error_message: "ARQUIVOS EXPURGADOS (LGPD - >15 DIAS)",
                    pages_data: null
                }).eq("id", orderId);
                if (!updErr2) ordersProcessed++;
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Expurgo LGPD concluído. ${ordersProcessed} pedidos processados, ${deletedFilesCount} arquivos excluídos.`
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err: any) {
        console.error("CRON CLEANUP ERROR:", err.message);
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
