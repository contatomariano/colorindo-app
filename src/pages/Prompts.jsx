import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TABS = [
    { id: 'master_character', label: 'Master: Personagem' },
    { id: 'master_scene', label: 'Master: Cenas' },
    { id: 'master_cover', label: 'Master: Capa' }
];

const MODELS = [
    { id: 'gpt-4o-image', name: 'GPT-4o Image (Fast)' },
    { id: 'nano-banana-pro', name: 'Nano Banana Pro' },
    { id: 'nano-banana-upscale', name: 'Nano Banana Upscaler' }
];

export default function Prompts() {
    const [activeTab, setActiveTab] = useState('master_character');
    const [prompts, setPrompts] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(''); // 'saved', 'error', ''

    useEffect(() => {
        fetchPrompts();
    }, []);

    const fetchPrompts = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('master_prompts').select('*');
        if (error) {
            console.error('Erro ao carregar prompts:', error);
        } else {
            const promptMap = {};
            data.forEach(p => { promptMap[p.id] = p; });
            setPrompts(promptMap);
        }
        setLoading(false);
    };

    const handlePromptChange = (field, value) => {
        setPrompts(prev => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                [field]: value
            }
        }));
        setSaveStatus(''); // Limpa o status de salvo ao editar
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus('');
        const currentData = prompts[activeTab];

        if (!currentData) return;

        const { error } = await supabase
            .from('master_prompts')
            .update({
                system_prompt: currentData.system_prompt,
                model_id: currentData.model_id,
                updated_at: new Date().toISOString()
            })
            .eq('id', activeTab);

        setSaving(false);
        if (error) {
            setSaveStatus('error');
            alert('Erro ao salvar prompt: ' + error.message);
        } else {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(''), 3000); // Some o check verdinho depois de 3s
        }
    };

    const currentPrompt = prompts[activeTab] || { system_prompt: '', model_id: 'gpt-4o-image', description: '' };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 40 }}>
            <div className="header" style={{ marginBottom: 24 }}>
                <div>
                    <h1>Gestão de Master Prompts e API</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 14 }}>
                        Controle a inteligência artificial (Kie.ai) para geração dos traços e configure os endpoints do sistema.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={loading || saving}
                        style={{ padding: '10px 24px' }}>
                        {saving ? (
                            <><i className="fa-solid fa-circle-notch fa-spin"></i> Salvando...</>
                        ) : saveStatus === 'saved' ? (
                            <><i className="fa-solid fa-check"></i> Salvo com sucesso!</>
                        ) : (
                            <><i className="fa-solid fa-floppy-disk"></i> Salvar Alterações</>
                        )}
                    </button>
                </div>
            </div>

            {/* Navegação por Tabs (Pílulas) */}
            <div style={{ display: 'flex', gap: 8, marginBottom: -1, zIndex: 1, position: 'relative', marginTop: 16 }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '12px 24px',
                            background: activeTab === tab.id ? '#e0e7ff' : 'transparent',
                            color: activeTab === tab.id ? 'var(--accent-1)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tab.id ? 600 : 500,
                            border: 'none',
                            borderRadius: '8px 8px 0 0',
                            cursor: 'pointer',
                            fontSize: 14,
                            borderBottom: activeTab === tab.id ? '3px solid var(--accent-1)' : '3px solid transparent',
                            transition: 'all 0.2s'
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Painel do Prompt Textarea estilo CLI (Fundo Escuro/Código) */}
            {loading ? (
                <div className="glass" style={{ padding: 60, textAlign: 'center', borderTopLeftRadius: 0 }}>
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24 }}></i>
                </div>
            ) : (
                <div className="glass" style={{ borderTopLeftRadius: 0, overflow: 'hidden', padding: 0 }}>
                    {/* Header do Terminal Console */}
                    <div style={{ background: '#475569', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, fontSize: 13, letterSpacing: '0.5px' }}>
                            <i className="fa-solid fa-robot"></i> SYSTEM PROMPT TEMPLATE
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <select
                                value={currentPrompt.model_id}
                                onChange={(e) => handlePromptChange('model_id', e.target.value)}
                                style={{
                                    background: 'white',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '6px 12px',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    outline: 'none',
                                    fontFamily: 'Outfit',
                                    cursor: 'pointer'
                                }}>
                                {MODELS.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4ade80', fontSize: 13, fontWeight: 500 }}>
                                <i className="fa-solid fa-check"></i> Válido
                            </div>
                        </div>
                    </div>

                    {/* Explicativo e Textarea */}
                    <div style={{ background: '#64748b', padding: 24 }}>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 16 }}>
                            {currentPrompt.description} Variáveis dinâmicas de Tema serão injetadas ao final da cadeia pelo back-end.
                        </p>
                        <textarea
                            value={currentPrompt.system_prompt}
                            onChange={(e) => handlePromptChange('system_prompt', e.target.value)}
                            style={{
                                width: '100%',
                                minHeight: 400,
                                background: 'transparent',
                                border: 'none',
                                color: '#f8fafc',
                                fontFamily: '"Fira Code", monospace', // Usa fonte mono se tiver, senão se adapta bem no Outfit
                                fontSize: 13,
                                lineHeight: '1.6',
                                outline: 'none',
                                resize: 'vertical'
                            }}
                            spellCheck="false"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
