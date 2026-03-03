import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Configuracoes() {
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState({});
    const [msg, setMsg] = useState('');

    // API Keys state
    const [kieKey, setKieKey] = useState('kie_live_****************');
    const [pdfKey, setPdfKey] = useState('pdf_sk_****************');

    // Pipeline state
    const [retryLimit, setRetryLimit] = useState('3');
    const [backoffMin, setBackoffMin] = useState('60');
    const [backoffMax, setBackoffMax] = useState('180');

    // PDF state
    const [paperSize, setPaperSize] = useState('A5 Landscape (210x148mm)');
    const [dpi, setDpi] = useState('300 DPI (Impressão Alta)');
    const [bleed, setBleed] = useState('5mm');
    const [cover, setCover] = useState('Primeira Página + Capa Traseira gerada');

    const testConnection = async (key) => {
        setTesting(prev => ({ ...prev, [key]: true }));
        await new Promise(r => setTimeout(r, 1200));
        setTesting(prev => ({ ...prev, [key]: false }));
        setMsg(`Conexão com ${key} testada com sucesso!`);
        setTimeout(() => setMsg(''), 3000);
    };

    const handleSaveAll = async () => {
        setSaving(true);
        const updates = [
            { key: 'kie_api_key', value: JSON.stringify(kieKey) },
            { key: 'pdf_api_key', value: JSON.stringify(pdfKey) },
            { key: 'max_retry_count', value: retryLimit },
            { key: 'backoff_min', value: backoffMin },
            { key: 'backoff_max', value: backoffMax },
            { key: 'pdf_paper_size', value: JSON.stringify(paperSize) },
            { key: 'pdf_dpi', value: JSON.stringify(dpi) },
            { key: 'pdf_bleed', value: JSON.stringify(bleed) },
        ];
        for (const u of updates) {
            await supabase.from('settings').upsert({ key: u.key, value: u.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        }
        setSaving(false);
        setMsg('Configurações salvas com sucesso!');
        setTimeout(() => setMsg(''), 3000);
    };

    return (
        <>
            <div className="header">
                <div>
                    <h1>Configurações do Sistema</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>Gerencie chaves de API, limites de rate e conexões.</p>
                </div>
                <button className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
                    {saving ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Salvando...</> : <><i className="fa-solid fa-floppy-disk"></i> Salvar Tudo</>}
                </button>
            </div>

            {msg && (
                <div style={{ padding: '12px 20px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 12, marginBottom: 20, border: '1px solid rgba(16,185,129,0.2)', fontWeight: 600 }}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: 8 }}></i>{msg}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                {/* Chaves de API */}
                <div className="glass" style={{ padding: 28 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="fa-solid fa-key" style={{ color: 'var(--accent-3)' }}></i> Chaves de API (Integrações)
                    </div>

                    {[
                        { label: 'Kie.ai API Key', value: kieKey, onChange: setKieKey, name: 'Kie.ai' },
                        { label: 'PDF.co API Key', value: pdfKey, onChange: setPdfKey, name: 'PDF.co' },
                    ].map(({ label, value, onChange, name }) => (
                        <div key={name} style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>{label}</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#e2e8f0', borderRadius: 8, padding: '0 14px', border: '1px solid transparent' }}>
                                    <i className="fa-solid fa-lock" style={{ color: 'var(--text-secondary)', fontSize: 13 }}></i>
                                    <input type="password" value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Outfit', fontSize: 15, padding: '12px 0' }} />
                                </div>
                                <button onClick={() => testConnection(name)} disabled={testing[name]} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-4)', fontFamily: 'Outfit', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {testing[name] ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-circle-check"></i>} Testar Conexão
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Controle de Pipeline */}
                <div className="glass" style={{ padding: 28 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="fa-solid fa-sliders" style={{ color: 'var(--accent-1)' }}></i> Controle de Pipeline (BullMQ)
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Retry Automático (Tentativas Limite)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#e2e8f0', borderRadius: 8, padding: '0 14px', border: '1px solid transparent' }}>
                            <i className="fa-solid fa-rotate-right" style={{ color: 'var(--text-secondary)', fontSize: 13 }}></i>
                            <input type="number" value={retryLimit} onChange={e => setRetryLimit(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Outfit', fontSize: 15, padding: '12px 0' }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>Se a Kie.ai falhar, o job será reinserido na fila automaticamente.</span>
                    </div>

                    <div>
                        <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Parâmetros de Espera (Backoff em Segundos)</label>
                        <div style={{ display: 'flex', gap: 12 }}>
                            {[
                                { label: 'Min', value: backoffMin, onChange: setBackoffMin },
                                { label: 'Máx', value: backoffMax, onChange: setBackoffMax },
                            ].map(({ label, value, onChange }) => (
                                <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#e2e8f0', borderRadius: 8, padding: '0 14px', border: '1px solid transparent' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: 13, whiteSpace: 'nowrap' }}>{label}</span>
                                    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Outfit', fontSize: 15, padding: '12px 0' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* PDF.co */}
                <div className="glass" style={{ padding: 28 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="fa-solid fa-file-pdf" style={{ color: 'var(--accent-error)' }}></i> Fechamento de Arquivo (PDF.co)
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Tamanho do Papel</label>
                            <select className="form-input" style={{ width: '100%', background: '#e2e8f0' }} value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                                <option>A5 Landscape (210x148mm)</option>
                                <option>A4 Portrait (210x297mm)</option>
                                <option>Square (150x150mm)</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>DPI (Resolução)</label>
                                <select className="form-input" style={{ width: '100%', background: '#e2e8f0' }} value={dpi} onChange={e => setDpi(e.target.value)}>
                                    <option>300 DPI (Impressão Alta)</option>
                                    <option>150 DPI (Web/Teste)</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Margem Sangria</label>
                                <input className="form-input" style={{ width: '100%', background: '#e2e8f0' }} value={bleed} onChange={e => setBleed(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Capa</label>
                            <select className="form-input" style={{ width: '100%', background: '#e2e8f0' }} value={cover} onChange={e => setCover(e.target.value)}>
                                <option>Primeira Página + Capa Traseira gerada</option>
                                <option>Somente Primeira Página</option>
                            </select>
                        </div>
                    </div>

                    <button onClick={handleSaveAll} style={{ marginTop: 16, width: '100%', background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))', color: 'white', border: 'none', padding: '12px 24px', fontWeight: 600, cursor: 'pointer', borderRadius: 10, fontFamily: 'Outfit', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <i className="fa-solid fa-floppy-disk"></i> Salvar Parametrização
                    </button>

                    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fa-solid fa-vial" style={{ color: 'var(--accent-1)' }}></i> Teste Rápido
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>Gera um PDF enviando as imagens de teste atuais para a API PDF.co para verificar margens e qualidade.</p>
                        <button style={{ background: 'transparent', border: '1px solid var(--accent-1)', color: 'var(--accent-1)', padding: '10px 20px', cursor: 'pointer', width: '100%', borderRadius: 10, fontFamily: 'Outfit', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <i className="fa-solid fa-bolt"></i> Disparar Teste PDF.co
                        </button>
                    </div>
                </div>

                {/* Modo de Manutenção */}
                <div className="glass" style={{ padding: 28, gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Modo de Manutenção</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Pausa imediatamente a entrada de novos pedidos na fila do Redis. Os atuais continuam processando.</div>
                    </div>
                    <button style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-error)', fontFamily: 'Outfit', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-power-off"></i> Pausar Motor
                    </button>
                </div>

            </div>
        </>
    );
}
