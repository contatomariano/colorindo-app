import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('⚠️ Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas. Verifique o arquivo .env.local');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        lock: false,
        persistSession: true,
        autoRefreshToken: true,
    }
});

/**
 * Invoca Edge Function via fetch direto. Sem getSession(), sem await extra.
 * Usa anon key que a Edge Function já aceita com auth resiliente.
 */
export async function invokeEdgeFunction(functionName, body) {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.success === false) {
        console.warn(`[invokeEdgeFunction] ${functionName} erro:`, data?.error || res.statusText);
        return { data, error: { message: data?.error || res.statusText } };
    }
    return { data, error: null };
}
