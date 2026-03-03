import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const PLANS_SEED = [
    {
        name: 'Starter',
        code: 'starter',
        slug: 'starter',
        icon: 'seedling',
        color_1: '#94a3b8',
        color_2: '#64748b',
        description: 'Plano gratuito para experimentar a plataforma.',
        price_monthly: 0,
        billing_type: 'free',
        display_order: 1,
        books_per_month: 10,
        themes_limit: 1,
        projects_limit: 1,
        projects_quota: 1,
        initial_credits: 100,
        credits_monthly: 100,
        features: { support_email: true, support_priority: false, support_dedicated: false, pdf_generation: false, api_access: false, white_label: false, mobile_app: false, dedicated_server: false },
        is_active: true,
    },
    {
        name: 'Pro',
        code: 'pro',
        slug: 'pro',
        icon: 'star',
        color_1: '#6366f1',
        color_2: '#8b5cf6',
        description: 'Plano profissional para escolas e fotógrafos.',
        price_monthly: 297,
        billing_type: 'monthly',
        display_order: 2,
        books_per_month: 100,
        themes_limit: 5,
        projects_limit: 0,
        projects_quota: null,
        initial_credits: 500,
        credits_monthly: 500,
        features: { support_email: true, support_priority: true, support_dedicated: false, pdf_generation: true, api_access: false, white_label: false, mobile_app: false, dedicated_server: false },
        is_active: true,
    },
    {
        name: 'Enterprise',
        code: 'enterprise',
        slug: 'enterprise',
        icon: 'crown',
        color_1: '#8b5cf6',
        color_2: '#7c3aed',
        description: 'Plano completo para grandes operações e franquias.',
        price_monthly: 997,
        billing_type: 'monthly',
        display_order: 3,
        books_per_month: 0,
        themes_limit: 0,
        projects_limit: 0,
        projects_quota: null,
        initial_credits: 2000,
        credits_monthly: 2000,
        features: { support_email: true, support_priority: true, support_dedicated: true, pdf_generation: true, api_access: true, white_label: true, mobile_app: false, dedicated_server: false },
        is_active: true,
    },
];
const ACCOUNT_SEED = {
    name: 'Conta Demo',
    email: 'demo@colorindo.com.br',
    phone: '(11) 99999-0000',
    plan: 'pro',
    status: 'active',
    credits: 1000,
    internal_notes: 'Conta de demonstração criada automaticamente.',
};

export default function SeedData() {
    const [log, setLog] = useState([]);
    const [done, setDone] = useState(false);

    const addLog = (msg, ok = true) => setLog(prev => [...prev, { msg, ok }]);

    async function runSeed() {
        setLog([]);

        // Verificar colunas disponíveis na tabela plans
        addLog('🔍 Verificando schema da tabela plans...');
        const { data: cols } = await supabase.from('plans').select('*').limit(1);
        const hasCodeCol = cols !== null; // Se retornou, tabela existe

        // Inserir planos (tenta com code/slug, ajusta se não existir)
        for (const plan of PLANS_SEED) {
            addLog(`📋 Inserindo plano: ${plan.name}...`);

            // Tenta inserção completa
            let { error } = await supabase.from('plans').insert([plan]);

            if (error && error.message.includes('code')) {
                // Sem coluna code, tenta sem
                const { code, ...planWithoutCode } = plan;
                const r2 = await supabase.from('plans').insert([planWithoutCode]);
                error = r2.error;
            }

            if (error && error.message.includes('slug')) {
                // Sem coluna slug
                const { slug, code, ...minimal } = plan;
                const r3 = await supabase.from('plans').insert([minimal]);
                error = r3.error;
            }

            if (error) {
                if (error.message.includes('duplicate') || error.message.includes('unique')) {
                    addLog(`  ⚠️ ${plan.name} já existe — pulando.`, true);
                } else {
                    addLog(`  ❌ Erro em ${plan.name}: ${error.message}`, false);
                }
            } else {
                addLog(`  ✅ ${plan.name} inserido com sucesso!`);
            }
        }

        // Inserir conta demo
        addLog('👤 Inserindo Conta Demo...');
        const { error: accErr } = await supabase.from('accounts').insert([ACCOUNT_SEED]);
        if (accErr) {
            if (accErr.message.includes('duplicate') || accErr.message.includes('unique')) {
                addLog('  ⚠️ Conta Demo já existe — atualizando créditos...', true);
                await supabase.from('accounts').update({ credits: 1000 }).eq('email', ACCOUNT_SEED.email);
                addLog('  ✅ Créditos atualizados para 1000.');
            } else {
                addLog(`  ❌ Erro na conta demo: ${accErr.message}`, false);
            }
        } else {
            addLog('  ✅ Conta Demo criada com 1000 créditos!');
        }

        addLog('🎉 Seed concluído!');
        setDone(true);
    }

    return (
        <div style={{ maxWidth: 700, padding: 32 }}>
            <h1>🌱 Seed de Dados Iniciais</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                Insere os 3 planos padrão e a Conta Demo (1000 créditos) no banco.
            </p>

            {log.length === 0 && (
                <button className="btn btn-primary" onClick={runSeed} style={{ fontSize: 16, padding: '14px 28px' }}>
                    <i className="fa-solid fa-database"></i> Executar Seed
                </button>
            )}

            {log.length > 0 && (
                <div className="glass" style={{ padding: 20, fontFamily: 'monospace', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {log.map((entry, i) => (
                        <div key={i} style={{ color: entry.ok ? (entry.msg.startsWith('  ❌') ? '#ef4444' : 'var(--text-primary)') : '#ef4444' }}>
                            {entry.msg}
                        </div>
                    ))}
                </div>
            )}

            {done && (
                <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                    <a href="/admin/planos" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                        <i className="fa-solid fa-arrow-right"></i> Ver Planos
                    </a>
                    <a href="/admin/contas" className="btn" style={{ textDecoration: 'none', border: '1px solid var(--glass-border)' }}>
                        Ver Contas
                    </a>
                </div>
            )}
        </div>
    );
}
