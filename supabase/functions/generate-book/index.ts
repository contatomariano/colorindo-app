import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let KIE_API_KEY = Deno.env.get("KIE_API_KEY") ?? "";
// Limpa o prefixo Bearer caso o usuário já tenha colocado na env do Supabase, para evitar "Bearer Bearer ..."
if (KIE_API_KEY.toLowerCase().startsWith("bearer ")) {
    KIE_API_KEY = KIE_API_KEY.substring(7).trim();
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PDFCO_API_KEY = Deno.env.get("PDFCO_API_KEY") ?? "";

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SKIN_TONE_MAP: Record<string, string> = {
    '#FFE0C4': 'very light pale skin',
    '#F2C29B': 'light peach skin',
    '#E6A77D': 'medium light beige skin',
    '#C47F53': 'medium olive tan skin',
    '#9B5D34': 'medium dark brown skin',
    '#7A3F22': 'dark brown skin',
    '#542A14': 'darker deep brown skin',
    '#361A0C': 'very dark rich deep brown skin'
};

const HAIR_COLOR_MAP: Record<string, string> = {
    '#000000': 'black hair',
    '#2C1B18': 'very dark brown hair',
    '#4B3020': 'dark brown hair',
    '#8B4513': 'medium brown hair',
    '#D1B071': 'golden blonde hair',
    '#B87333': 'copper red hair',
    '#A52A2A': 'auburn dark red hair',
    '#E5E5E5': 'white silver hair'
};

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

console.log("Edge Function 'generate-book' blindada e pronta.");

// ====== HELPER: Upload PDF temporário para Supabase Storage ======
async function uploadPdfToStorage(
    tempUrl: string,
    storagePath: string,
): Promise<string> {
    console.log(`[STORAGE] Baixando PDF de ${tempUrl.substring(0, 60)}...`);
    const res = await fetch(tempUrl);
    if (!res.ok) throw new Error(`Falha ao baixar PDF: ${res.status}`);

    const pdfBuffer = await res.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);

    console.log(`[STORAGE] Uploading ${storagePath} (${pdfBytes.length} bytes)...`);
    const { error: uploadErr } = await supabaseClient.storage
        .from("order_pdfs")
        .upload(storagePath, pdfBytes, {
            contentType: "application/pdf",
            upsert: true,
        });

    if (uploadErr) {
        console.error(`[STORAGE ERROR] Upload falhou:`, uploadErr.message);
        throw new Error(`Upload Storage falhou: ${uploadErr.message}`);
    }

    // Retorna URL pública permanente
    const { data: publicData } = supabaseClient.storage
        .from("order_pdfs")
        .getPublicUrl(storagePath);

    console.log(`[STORAGE] URL permanente: ${publicData.publicUrl}`);
    return publicData.publicUrl;
}

// Função de consulta ÚNICA (Sem loop) - Ideal para chamadas do Frontend e Requests Curtos
async function checkKieTask(
    taskId: string,
    isJob: boolean = true,
): Promise<{ url?: string; pending?: boolean; error?: string }> {
    const endpoint = isJob ? "jobs/recordInfo" : "gpt4o-image/record-info";
    // Formato com subdomínio api.kie.ai
    const pollUrl = `https://api.kie.ai/api/v1/${endpoint}?taskId=${taskId}`;

    try {
        const res = await fetch(pollUrl, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${KIE_API_KEY}`,
            },
        });
        if (!res.ok) {
            const errBody = await res.text().catch(() => "");
            console.error(
                `[CHECK-JOB DEBUG] ⚠️ Falha HTTP na Kie.ai: ${res.status} ${res.statusText} | Corpo HTTP:`,
                errBody,
            );
            return { error: `Falha HTTP ${res.status}: ${errBody}` };
        }

        const data = await res.json().catch(() => ({}));

        // A verificação real da task é no state/status retornado
        const rawStatus =
            data.data?.state || data.state || data.status || data.data?.status || "";

        // Validação estrita sugerida pelo feedback (evitar falsos positivos baseados apenas em code=0)
        const isSuccess =
            rawStatus.toUpperCase() === "SUCCESS" ||
            (data.code === 200 && data.data?.state === "success");

        if (isSuccess) {
            // Documentação Oficial Kie: As URLs vêm stringificadas no campo `data.resultJson` ou `resultJson`
            try {
                const resultJsonStr = data.data?.resultJson || data.resultJson;
                if (resultJsonStr) {
                    const parsedResult = JSON.parse(resultJsonStr);
                    const url =
                        parsedResult?.resultUrls?.[0] ||
                        parsedResult?.images?.[0]?.url ||
                        parsedResult?.url ||
                        parsedResult?.images?.[0];
                    if (url) return { url };
                }
            } catch (parseErr) {
                console.warn(
                    "[CHECK-JOB DEBUG] Falha ao parsear resultJson:",
                    parseErr,
                );
            }

            // Tentativa exaustiva para outros formatos/modelos (Suno, Runway, GPT4o, etc)
            let url =
                data.data?.response?.resultUrls?.[0] ||
                data.data?.response?.url ||
                data.data?.url ||
                data.url ||
                data.data?.imageUrl ||
                data.imageUrl ||
                data.data?.resultUrls?.[0] ||
                data.resultUrls?.[0] ||
                data.data?.images?.[0]?.url ||
                data.images?.[0]?.url ||
                data.data?.images?.[0] ||
                data.images?.[0] ||
                data.result ||
                data.data?.result;

            // Tratamento caso "result" seja uma string com URL
            if (url && typeof url === "string" && url.startsWith("http")) {
                return { url };
            }

            console.error(
                `[CHECK-JOB DEBUG] ⚠️ SUCCESS alcançado, mas a URL não foi mapeada! Payload do Kie.ai:`,
                JSON.stringify(data),
            );
            return { error: `SUCCESS sem URL. Payload: ${JSON.stringify(data)}` };
        } else {
            // Se estiver "generating", log em nível debug para não sujar o terminal de erros
            if (
                rawStatus === "generating" ||
                rawStatus === "queuing" ||
                rawStatus === "waiting"
            ) {
                console.log(`[CHECK-JOB DEBUG] Task pendente (${rawStatus})...`);
                return { pending: true };
            } else if (rawStatus === "failed" || rawStatus === "error") {
                console.log(
                    `[CHECK-JOB DEBUG] Task Falhou no provedor: ${rawStatus} | Payload:`,
                    JSON.stringify(data),
                );
                return { error: `Task failed in provider: ${JSON.stringify(data)}` };
            } else {
                console.log(
                    `[CHECK-JOB DEBUG] Status da Task: ${rawStatus || "Desconhecido"} | Payload:`,
                    JSON.stringify(data),
                );
                // MÁXIMO CUIDADO: Se o status for literal vazio ("") e houver um código de falha da Kie, isso NÃO É PENDENTE, é um erro estrutural!
                if (!rawStatus && data.code && data.code !== 200) {
                    return { error: `Erro na API da Kie.ai: ${JSON.stringify(data)}` };
                }
                // Ainda pode ser um 'processing' customizado de algum modelo
                if (
                    ["processing", "in_progress", "starting", "started"].includes(
                        rawStatus.toLowerCase(),
                    )
                ) {
                    return { pending: true };
                }

                return {
                    error: `Status Desconhecido do provedor Kie.ai: ${rawStatus}. \nPayload Completo: ${JSON.stringify(data)}`,
                };
            }
        }
    } catch (e: any) {
        console.error(`Check error for ${taskId}:`, e.message);
        return { error: `Catch exception: ${e.message}` };
    }
}

// Disparador genérico para qualquer endpoint do Kie que retorna um taskId
async function requestKieTask(endpoint: string, payload: any): Promise<string> {
    const url = `https://api.kie.ai/api/v1/${endpoint}`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${KIE_API_KEY}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(`Kie API Error ${res.status}: ${JSON.stringify(data)}`);

    const taskId = data.taskId || data.data?.taskId || data.id;
    if (!taskId)
        throw new Error(
            `Sem taskId na resposta da Kie.ai: ${JSON.stringify(data)}`,
        );

    return taskId;
}

// O corsHeaders já foi declarado no topo do arquivo.

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // --- AUTENTICAÇÃO E AUTORIZAÇÃO (LGPD/Segurança) ---
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing Authorization header");

        const token = authHeader.replace("Bearer ", "").trim();
        let userId = null;
        let isAdmin = false;

        // Se a chamada vier de outra Edge Function usando a SUPABASE_SERVICE_ROLE_KEY (ex: recursive invoke upscale -> pdf)
        // bypassa a validação de JWT estrita
        if (token === SUPABASE_SERVICE_ROLE_KEY) {
            isAdmin = true;
        } else {
            const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

            if (authError || !user) {
                throw new Error(`Unauthorized: ${authError?.message || 'No user found'}`);
            }

            userId = user.id;
            const { data: profile } = await supabaseClient.from("profiles").select("role").eq("id", user.id).single();
            if (profile?.role === "admin" || profile?.role === "manager") {
                isAdmin = true;
            }
        }
        // ---------------------------------------------------

        const body = await req.json();
        const { record: initialRecord, action = "avatar" } = body;
        const orderId = initialRecord?.id;
        if (!orderId) throw new Error("ID do Registro ausente.");

        // BUSCA DADOS ATUALIZADOS DO BANCO (Blindagem)
        const { data: record, error: fetchErr } = await supabaseClient
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .single();
        if (fetchErr || !record)
            throw new Error(`Erro ao buscar pedido ${orderId}: ${fetchErr?.message}`);

        // GANTE QUE O USUÁRIO LOGADO SÓ MEXA NO PRÓPRIO PEDIDO
        if (!isAdmin && record.account_id !== userId) {
            throw new Error("Forbidden: You do not have permission to access or modify this order.");
        }

        const childName = record.child_name || "Criança";
        const childPhoto = record.child_photo_url;
        const skinTone = record.skin_tone || "";
        const hairColor = record.hair_color || "";
        const themeId = record.theme_id;

        console.log(
            `\n=== [PIPELINE START] Order: ${orderId} | Action: ${action} ===`,
        );
        console.log(
            `[DIAGNOSTIC] Photo: ${childPhoto ? "OK" : "MISSING"}, Skin: ${skinTone}, Theme: ${themeId}`,
        );
        console.log(
            `[DIAGNOSTIC] KIE_API_KEY: ${KIE_API_KEY ? "Present" : "MISSING"} (Prefix: ${KIE_API_KEY.substring(0, 4)}...)`,
        );

        // Coleta de Configurações Básicas
        console.log(`[ORDER ${orderId}] Buscando tema e prompts...`);
        const { data: themeData, error: themeErr } = await supabaseClient
            .from("themes")
            .select("*")
            .eq("id", themeId)
            .single();
        if (themeErr) console.error("Erro ao buscar Tema:", themeErr);

        const { data: promptsData, error: promptErr } = await supabaseClient
            .from("master_prompts")
            .select("*");
        if (promptErr) console.error("Erro ao buscar Master Prompts:", promptErr);

        const masterMap: Record<string, any> = {};
        if (promptsData) {
            console.log(
                `[ORDER ${orderId}] Prompts encontrados: ${promptsData.length}`,
            );
            promptsData.forEach((p) => {
                if (p && p.id) {
                    masterMap[p.id] = p;
                    console.log(`[MASTER PROMPT LOADED] ID: ${p.id}`);
                }
            });
        }

        // ==========================================
        // FLUXO 1: GERAÇÃO EXCLUSIVA DE AVATAR (Kie.ai - Nano Banana Pro)
        // ==========================================
        if (action === "avatar") {
            const mCharacter = masterMap["master_character"];
            let characterPrompt =
                mCharacter?.system_prompt || "Criança estilo Pixar, 3D, sorridente";

            const descSkin = SKIN_TONE_MAP[skinTone] ? `${SKIN_TONE_MAP[skinTone]} (${skinTone})` : skinTone;
            const descHair = HAIR_COLOR_MAP[hairColor] ? `${HAIR_COLOR_MAP[hairColor]} (${hairColor})` : hairColor;

            if (skinTone) {
                characterPrompt = characterPrompt.includes("{hex}")
                    ? characterPrompt.replace(/{hex}/g, descSkin)
                    : `${characterPrompt}, ${descSkin}`;
            }
            if (hairColor) {
                characterPrompt = `${characterPrompt}, ${descHair}`;
            }
            const genderRef =
                record.gender === "M"
                    ? themeData?.ref_male_url
                    : themeData?.ref_female_url;
            const files = [childPhoto, genderRef || themeData?.ref_outfit_url].filter(
                Boolean,
            );

            // Avisa o front imediatamente
            await supabaseClient
                .from("orders")
                .update({
                    status: "processing",
                    scenes_done: 0,
                    character_url: null,
                    error_message: "Iniciando engine Kieai...",
                })
                .eq("id", orderId);

            console.log(`[ORDER ${orderId}] Criando Job de Avatar...`);
            const taskId = await requestKieTask("jobs/createTask", {
                model: "nano-banana-pro",
                input: JSON.stringify({
                    image_input: files,
                    prompt: characterPrompt,
                    aspect_ratio: "3:2",
                    output_format: "png",
                    resolution: "1K",
                }),
            });

            // Guarda o taskId
            await supabaseClient
                .from("orders")
                .update({
                    error_message: `taskId:${taskId}`,
                })
                .eq("id", orderId);

            return new Response(
                JSON.stringify({ success: true, taskId, processing: true }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        // ==========================================
        // FLUXO 2: GERAÇÃO DE CAPA (Kie.ai - Nano Banana Pro)
        // ==========================================
        if (action === "cover") {
            const mCover = masterMap["master_cover"];
            const approvedCharacterUrl = record.character_url || childPhoto;

            let absoluteCoverPrompt = mCover?.system_prompt || "";
            let dynamicThemePrompt = themeData?.cover_prompt || "";

            // Substitui a tag do template (Master Prompt) pelo prompt dinâmico (Tema)
            if (absoluteCoverPrompt.includes("{{Prompt Dinâmico Template Capa}}")) {
                absoluteCoverPrompt = absoluteCoverPrompt.replace(
                    /\{\{Prompt Dinâmico Template Capa\}\}/gi,
                    dynamicThemePrompt,
                );
            } else if (
                absoluteCoverPrompt.includes("{Prompt Dinâmico Template Capa}")
            ) {
                absoluteCoverPrompt = absoluteCoverPrompt.replace(
                    /\{Prompt Dinâmico Template Capa\}/gi,
                    dynamicThemePrompt,
                );
            } else {
                absoluteCoverPrompt = `${absoluteCoverPrompt} ${dynamicThemePrompt}`;
            }

            // Substitui tags de nome em qualquer formato (maiúsculo/minúsculo, 1 ou 2 chaves)
            absoluteCoverPrompt = absoluteCoverPrompt
                .replace(/\{\{nome_criança\}\}/gi, childName)
                .replace(/\{nome_criança\}/gi, childName)
                .replace(/\{\{nome\}\}/gi, childName)
                .replace(/\{nome\}/gi, childName);

            const descSkinCover = SKIN_TONE_MAP[skinTone] ? `${SKIN_TONE_MAP[skinTone]} (${skinTone})` : skinTone;
            const descHairCover = HAIR_COLOR_MAP[hairColor] ? `${HAIR_COLOR_MAP[hairColor]} (${hairColor})` : hairColor;

            if (skinTone) {
                absoluteCoverPrompt = `${absoluteCoverPrompt}, ${descSkinCover}`;
            }
            if (hairColor) {
                absoluteCoverPrompt = `${absoluteCoverPrompt}, ${descHairCover}`;
            }

            await supabaseClient
                .from("orders")
                .update({
                    status: "processing",
                    cover_url: null,
                    error_message: "Iniciando geração de capa...",
                })
                .eq("id", orderId);

            console.log(`[ORDER ${orderId}] Criando Job de Capa...`);
            const taskId = await requestKieTask("jobs/createTask", {
                model: "nano-banana-pro",
                input: JSON.stringify({
                    image_input: [
                        approvedCharacterUrl,
                        childPhoto, // Foto original para referência de tons de pele/cabelo
                        themeData?.ref_wireframe_url,
                    ].filter(Boolean),
                    prompt: absoluteCoverPrompt,
                    aspect_ratio: "3:2",
                    output_format: "png",
                    resolution: "1K",
                }),
            });

            await supabaseClient
                .from("orders")
                .update({
                    cover_task_id: taskId,
                    error_message: null,  // Não polui error_message, evitando conflito com 'scenes'
                })
                .eq("id", orderId);

            return new Response(
                JSON.stringify({ success: true, taskId, processing: true }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        // ==========================================
        // NOVA AÇÃO: PHASE2-START (Capa + Cenas Simultâneas)
        // ==========================================
        if (action === "phase2-start") {
            console.log(`[ORDER ${orderId}] Iniciando Fase 2 (Capa e Cenas em paralelo)...`);

            // 1. Dispara Capa PRIMEIRO
            const coverRes = await supabaseClient.functions.invoke("generate-book", {
                body: { record: { id: orderId }, action: "cover" }
            });

            // 2. Dispara Cenas DEPOIS
            const scenesRes = await supabaseClient.functions.invoke("generate-book", {
                body: { record: { id: orderId }, action: "scenes" }
            });

            if (coverRes.error) console.error("[PHASE2] Erro ao disparar Capa:", coverRes.error);
            if (scenesRes.error) console.error("[PHASE2] Erro ao disparar Cenas:", scenesRes.error);

            return new Response(
                JSON.stringify({ success: true, message: "Capa e Cenas disparadas com sucesso." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ==========================================
        // NOVA AÇÃO: APPROVE-COVER (Apenas marcação)
        // ==========================================
        if (action === "approve-cover") {
            console.log(`[ORDER ${orderId}] Capa aprovada pelo usuário.`);

            await supabaseClient
                .from("orders")
                .update({ cover_approved: true })
                .eq("id", orderId);

            return new Response(
                JSON.stringify({ success: true }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ==========================================
        // NOVA AÇÃO: CHECK-JOB (Verificação de Status)
        // ==========================================
        if (action === "check-job") {
            const taskId = body.taskId;
            const checkType = body.checkType;

            if (!taskId) throw new Error("Missing taskId");

            // ====== CHECK MÚLTIPLO: CENAS ======
            if (checkType === "scenes") {
                console.log(`[CHECK-JOB SCENES] Verificando progresso das cenas...`);
                const pages = record.pages_data || [];
                let allDone = true;
                let resolvedCount = 0;
                let hasChanges = false;

                for (const pageObj of pages) {
                    if (pageObj.image_url) {
                        resolvedCount++;
                        continue;
                    }
                    if (!pageObj.taskId) {
                        allDone = false;
                        continue;
                    }

                    const check = await checkKieTask(pageObj.taskId, false);

                    if (check.url) {
                        pageObj.image_url = check.url;
                        resolvedCount++;
                        hasChanges = true;
                        console.log(
                            `[CHECK-JOB SCENES] Cena ${pageObj.page} pronta! URL Capturada.`,
                        );
                    } else if (check.error) {
                        console.error(
                            `[CHECK-JOB SCENES] Erro na Cena ${pageObj.page}: ${check.error}`,
                        );
                        allDone = false;
                    } else {
                        allDone = false;
                    }
                }

                if (hasChanges) {
                    const updatePayload: any = {
                        pages_data: pages,
                        scenes_done: resolvedCount,
                    };

                    await supabaseClient
                        .from("orders")
                        .update(updatePayload)
                        .eq("id", orderId);
                }

                if (allDone) {
                    if (record.error_message === "taskId:scenes") {
                        console.log(
                            `[CHECK-JOB SCENES] TODAS AS CENAS CONCLUÍDAS (${resolvedCount})! Iniciando etapa de UPSCALE...`,
                        );

                        await supabaseClient.functions.invoke("generate-book", {
                            body: { record: { id: orderId }, action: "upscale" }
                        });

                        return new Response(
                            JSON.stringify({ success: true, url: "scenes_done_starting_upscale" }),
                            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                        );
                    }

                    return new Response(
                        JSON.stringify({ success: true, url: "scenes_done" }),
                        {
                            headers: { ...corsHeaders, "Content-Type": "application/json" },
                        },
                    );
                } else {
                    return new Response(
                        JSON.stringify({
                            success: true,
                            pending: true,
                            scenes_done: resolvedCount,
                        }),
                        {
                            headers: { ...corsHeaders, "Content-Type": "application/json" },
                        },
                    );
                }
            }

            // ====== CHECK MÚLTIPLO: UPSCALE ======
            if (checkType === "upscale") {
                console.log(`[CHECK-JOB UPSCALE] Verificando progresso do upscale...`);
                const pages = record.pages_data || [];
                let allDone = true;
                let resolvedCount = 0;
                let hasChanges = false;

                // 1. Checa a Capa
                if (record.cover_upscale_taskid) {
                    const checkCover = await checkKieTask(record.cover_upscale_taskid, true);
                    if (checkCover.url) {
                        console.log(`[CHECK-JOB UPSCALE] Capa em alta qualidade pronta!`);
                        const { error: updCoverErr } = await supabaseClient
                            .from("orders")
                            .update({
                                cover_url: checkCover.url,
                                cover_upscale_taskid: null
                            })
                            .eq("id", orderId);
                        if (!updCoverErr) {
                            record.cover_url = checkCover.url;
                            record.cover_upscale_taskid = null;
                            resolvedCount++;
                            hasChanges = true;
                        }
                    } else if (checkCover.error) {
                        console.error(`[CHECK-JOB UPSCALE] Erro no Upscale da Capa: ${checkCover.error}`);
                        allDone = false;
                    } else {
                        allDone = false;
                    }
                } else {
                    resolvedCount++;
                }

                // 2. Checa as Cenas
                for (const pageObj of pages) {
                    if (pageObj.upscaled_url) {
                        resolvedCount++;
                        continue;
                    }
                    if (!pageObj.upscale_taskId) {
                        allDone = false;
                        continue;
                    }

                    const check = await checkKieTask(pageObj.upscale_taskId, true);

                    if (check.url) {
                        pageObj.upscaled_url = check.url;
                        pageObj.image_url = check.url;
                        resolvedCount++;
                        hasChanges = true;
                        console.log(`[CHECK-JOB UPSCALE] Cena ${pageObj.page} em alta qualidade pronta!`);
                    } else if (check.error) {
                        console.error(`[CHECK-JOB UPSCALE] Erro no Upscale da Cena ${pageObj.page}: ${check.error}`);
                        allDone = false;
                    } else {
                        allDone = false;
                    }
                }

                if (hasChanges) {
                    const updatePayload: any = {
                        pages_data: pages,
                        upscale_done: resolvedCount,
                        cover_url: record.cover_url
                    };

                    await supabaseClient
                        .from("orders")
                        .update(updatePayload)
                        .eq("id", orderId);
                }

                if (allDone) {
                    if (record.error_message === "taskId:upscale") {
                        console.log(`[CHECK-JOB UPSCALE] TUDO EM ALTA QUALIDADE (${resolvedCount}/8)! Iniciando Conversão PDF...`);

                        await supabaseClient.functions.invoke("generate-book", {
                            body: { record: { id: orderId }, action: "pdf" }
                        });

                        return new Response(
                            JSON.stringify({ success: true, url: "upscale_done_starting_pdf" }),
                            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                        );
                    }
                }

                return new Response(
                    JSON.stringify({
                        success: true,
                        pending: !allDone,
                        upscale_done: resolvedCount,
                        total_upscale: pages.length + 1
                    }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // ====== CHECK: PDF CONVERSION (PDF.co) ======
            if (checkType === "pdf") {
                console.log(`[CHECK-JOB PDF] Verificando se o PDF está pronto...`);

                if (record.pdf_url) {
                    return new Response(
                        JSON.stringify({ success: true, url: record.pdf_url }),
                        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                return new Response(
                    JSON.stringify({ success: true, pending: true }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            console.log(
                `[CHECK-JOB] Verificando taskId ${taskId} (Type: ${checkType || "auto"})...`,
            );
            const { url, pending, error } = await checkKieTask(taskId, true);

            if (error) {
                console.log(`[CHECK-JOB ERROR] Erro retornado pelo Kie: ${error}`);
                await supabaseClient
                    .from("orders")
                    .update({
                        error_message: `Kie.ai FALHOU: ${error.substring(0, 500)}`,
                        status: "error",
                    })
                    .eq("id", orderId);
                return new Response(JSON.stringify({ success: false, error }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            if (url) {
                console.log(`[CHECK-JOB SUCCESS] Imagem pronta: ${url}`);
                let updateData: any = {};

                if (checkType === "avatar" || (!checkType && !record.character_url)) {
                    updateData = {
                        error_message: null,
                        character_url: url,
                        status: "awaiting_avatar",
                    };
                    console.log(
                        `[CHECK-JOB] Salvando imagem como CHARACTER_URL e mudando status para awaiting_avatar`,
                    );
                } else if (checkType === "cover" || (!checkType && !record.cover_url)) {
                    updateData = {
                        cover_url: url,
                        cover_task_id: null,
                        status: "awaiting_cover",
                    };
                    console.log(
                        `[CHECK-JOB] Salvando imagem como COVER_URL e mudando status para awaiting_cover`,
                    );
                }

                const { error: updErr } = await supabaseClient
                    .from("orders")
                    .update(updateData)
                    .eq("id", orderId);
                if (updErr)
                    console.error("[CHECK-JOB ERROR] Falha ao atualizar banco:", updErr);

                return new Response(JSON.stringify({ success: true, url }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            console.log(`[CHECK-JOB] Ainda pendente para ${taskId}...`);
            return new Response(JSON.stringify({ success: true, pending: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ==========================================
        // FLUXO 3: GERAÇÃO DE CENAS INTERNAS (GPT-4 / DALL-E)
        // ==========================================
        if (action === "scenes") {
            const mScene = masterMap["master_scene"];
            const scenesData = themeData?.scenes_data || [];
            const approvedCharacterUrl = record.character_url || childPhoto;

            const initialPagesPromises = scenesData.map(
                async (sceneConfig: any, i: number) => {
                    const dynamicPrompt = (sceneConfig.prompt || "")
                        .replace(/{nome}/g, childName)
                        .replace(/{idade}/g, record.child_age || "")
                        .replace(/{genero}/g, record.gender || "");

                    const scenePrompt = `${mScene?.system_prompt || ""} ${dynamicPrompt}`;

                    console.log(
                        `[ORDER ${orderId}] Disparando Cena ${i + 1}/${scenesData.length} via gpt4o-image...`,
                    );

                    try {
                        const sceneRes = await fetch(
                            `https://api.kie.ai/api/v1/gpt4o-image/generate`,
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${KIE_API_KEY}`,
                                },
                                body: JSON.stringify({
                                    prompt: scenePrompt,
                                    size: "3:2",
                                    filesUrl: [
                                        approvedCharacterUrl,
                                        sceneConfig.refImageUrl || themeData?.ref_outfit_url,
                                    ].filter(Boolean),
                                }),
                            },
                        );

                        if (!sceneRes.ok) {
                            const sceneErrBody = await sceneRes.text().catch(() => "");
                            console.error(
                                `[SCENE ERROR] CENA ${i + 1}: API devolveu ${sceneRes.status} -`,
                                sceneErrBody,
                            );
                            return {
                                page: i + 1,
                                text: dynamicPrompt,
                                image_url: "",
                                taskId: null,
                            };
                        }

                        const sceneData = await sceneRes.json();
                        const taskId =
                            sceneData.taskId || sceneData.data?.taskId || sceneData.id;
                        return { page: i + 1, text: dynamicPrompt, image_url: "", taskId };
                    } catch (fetchSceneErr) {
                        console.error(
                            `[SCENE ERROR] Exception ao disparar Sena ${i + 1}:`,
                            fetchSceneErr,
                        );
                        return {
                            page: i + 1,
                            text: dynamicPrompt,
                            image_url: "",
                            taskId: null,
                        };
                    }
                },
            );

            const pagesInfo = await Promise.all(initialPagesPromises);
            console.log(
                `[ORDER ${orderId}] Cenas disparadas nativamente! Transferindo responsabilidade de polling contínuo para o Frontend...`,
            );

            const pendingPages = pagesInfo.map((p: any) => ({
                page: p.page,
                text: p.text,
                image_url: p.image_url,
                taskId: p.taskId,
            }));

            await supabaseClient
                .from("orders")
                .update({
                    status: "processing",
                    error_message: "taskId:scenes",
                    pages_data: pendingPages,
                    scenes_done: 0,
                    scenes_total: scenesData.length,
                })
                .eq("id", orderId);

            return new Response(
                JSON.stringify({ success: true, pending: true, taskId: "scenes" }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                },
            );
        }

        // ==========================================
        // NOVA AÇÃO: UPSCALE (Alta Resolução via nano-banana-upscale)
        // ==========================================
        if (action === "upscale") {
            console.log(`[ORDER ${orderId}] Iniciando processo de Upscale...`);
            const pages = record.pages_data || [];
            const coverUrl = record.cover_url;

            // 1. Upscale da Capa
            let coverUpscaleId = null;
            if (coverUrl) {
                try {
                    coverUpscaleId = await requestKieTask("jobs/createTask", {
                        model: "nano-banana-upscale",
                        input: JSON.stringify({
                            image: coverUrl,
                            scale: 2,
                            face_enhance: false
                        })
                    });
                    console.log(`[UPSCALE] Capa disparada: ${coverUpscaleId}`);
                } catch (e: any) {
                    console.error(`[UPSCALE ERROR] Falha na Capa:`, e.message);
                }
            }

            // 2. Upscale das Cenas
            const upscalePromises = pages.map(async (p: any) => {
                if (p.image_url) {
                    try {
                        const taskId = await requestKieTask("jobs/createTask", {
                            model: "nano-banana-upscale",
                            input: JSON.stringify({
                                image: p.image_url,
                                scale: 2,
                                face_enhance: false
                            })
                        });
                        console.log(`[UPSCALE] Cena ${p.page} disparada: ${taskId}`);
                        return { ...p, upscale_taskId: taskId };
                    } catch (e: any) {
                        console.error(`[UPSCALE ERROR] Falha na Cena ${p.page}:`, e.message);
                        return p;
                    }
                }
                return p;
            });

            const updatedPages = await Promise.all(upscalePromises);

            await supabaseClient
                .from("orders")
                .update({
                    status: "processing",
                    error_message: "taskId:upscale",
                    pages_data: updatedPages,
                    cover_upscale_taskid: coverUpscaleId,
                    upscale_done: 0
                })
                .eq("id", orderId);

            return new Response(
                JSON.stringify({ success: true, taskId: "upscale" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ==========================================
        // NOVA AÇÃO: PDF (Conversão via PDF.co + Upload para Supabase Storage)
        // ==========================================
        if (action === "pdf") {
            console.log(`[ORDER ${orderId}] Iniciando conversão para PDFs separados via PDF.co...`);
            const coverUrl = record.cover_url;
            const pages = record.pages_data || [];

            // URLs para o PDF de Cenas (Miolo)
            const sceneUrls = pages.map((p: any) => p.image_url).filter(Boolean);

            if (!coverUrl && sceneUrls.length === 0) {
                throw new Error("Nenhuma imagem encontrada para conversão PDF.");
            }

            try {
                // Notifica início
                await supabaseClient
                    .from("orders")
                    .update({
                        error_message: "taskId:pdf_convert",
                        status: "processing"
                    })
                    .eq("id", orderId);

                // 1. Gerar PDF da Capa via PDF.co e salvar no Storage
                let finalCoverPdfUrl = record.cover_pdf_url;
                if (coverUrl) {
                    console.log(`[PDF] Gerando PDF da Capa...`);
                    const resCoverPdf = await fetch("https://api.pdf.co/v1/pdf/merge2", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "x-api-key": PDFCO_API_KEY },
                        body: JSON.stringify({
                            name: `Capa_${orderId}.pdf`,
                            url: coverUrl,
                            async: false
                        })
                    });
                    const coverPdfData = await resCoverPdf.json();
                    if (coverPdfData.error) {
                        console.warn(`[PDF WARNING] Erro na Capa: ${coverPdfData.message}`);
                    } else if (coverPdfData.url) {
                        // Upload para Supabase Storage (URL permanente)
                        try {
                            finalCoverPdfUrl = await uploadPdfToStorage(
                                coverPdfData.url,
                                `${orderId}/capa.pdf`
                            );
                        } catch (storageErr: any) {
                            console.warn(`[PDF WARNING] Storage upload falhou, usando URL temporária:`, storageErr.message);
                            finalCoverPdfUrl = coverPdfData.url;
                        }
                    }
                }

                // 2. Gerar PDF do Miolo (Cenas) via PDF.co e salvar no Storage
                let finalScenesPdfUrl = record.scenes_pdf_url;
                if (sceneUrls.length > 0) {
                    console.log(`[PDF] Gerando PDF do Miolo com ${sceneUrls.length} cenas...`);
                    const urlsString = sceneUrls.join(",");
                    const resScenesPdf = await fetch("https://api.pdf.co/v1/pdf/merge2", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "x-api-key": PDFCO_API_KEY },
                        body: JSON.stringify({
                            name: `Miolo_${orderId}.pdf`,
                            url: urlsString,
                            async: false
                        })
                    });
                    const scenesPdfData = await resScenesPdf.json();
                    if (scenesPdfData.error) {
                        throw new Error(`PDF.co Scenes Error: ${scenesPdfData.message || JSON.stringify(scenesPdfData)}`);
                    }
                    if (scenesPdfData.url) {
                        // Upload para Supabase Storage (URL permanente)
                        try {
                            finalScenesPdfUrl = await uploadPdfToStorage(
                                scenesPdfData.url,
                                `${orderId}/miolo.pdf`
                            );
                        } catch (storageErr: any) {
                            console.warn(`[PDF WARNING] Storage upload falhou, usando URL temporária:`, storageErr.message);
                            finalScenesPdfUrl = scenesPdfData.url;
                        }
                    }
                }

                // Sucesso! Atualiza o banco e move para REVIEW
                await supabaseClient
                    .from("orders")
                    .update({
                        cover_pdf_url: finalCoverPdfUrl,
                        scenes_pdf_url: finalScenesPdfUrl,
                        pdf_url: finalScenesPdfUrl, // Mantém compatibilidade com o miolo no pdf_url
                        status: "review",
                        error_message: null
                    })
                    .eq("id", orderId);

                return new Response(
                    JSON.stringify({ success: true, cover_pdf: finalCoverPdfUrl, scenes_pdf: finalScenesPdfUrl }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );

            } catch (e: any) {
                console.error(`[PDF ERROR]`, e.message);
                await supabaseClient
                    .from("orders")
                    .update({
                        error_message: `Falha na conversão PDF: ${e.message}`,
                        status: "error"
                    })
                    .eq("id", orderId);

                return new Response(JSON.stringify({ error: e.message }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
        }

        // Caso a Action não seja encontrada
        return new Response(JSON.stringify({ error: "Invalid Action" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("!!! [PIPELINE ERROR] !!!", err.message);
        return new Response(
            JSON.stringify({
                error: err.message,
                stack: err.stack,
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    }
});
