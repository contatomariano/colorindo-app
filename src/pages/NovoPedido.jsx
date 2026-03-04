import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAccount } from '../context/AccountContext';

const SKIN_TONES = [
    '#FFE0C4', '#F2C29B', '#E6A77D', '#C47F53', '#9B5D34', '#7A3F22', '#542A14', '#361A0C'
];

const HAIR_COLORS = [
    '#000000', '#2C1B18', '#4B3020', '#8B4513', '#D1B071', '#B87333', '#A52A2A', '#E5E5E5'
];

export default function NovoPedido() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const { selectedAccountId } = useAccount();
    const [themes, setThemes] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);
    const [skinTone, setSkinTone] = useState('#FFE0C4');
    const [hairColor, setHairColor] = useState('#000000');
    const [form, setForm] = useState({
        child_name: '',
        child_age: '',
        gender: '',
        theme_id: searchParams.get('theme') || '',
        project_id: searchParams.get('project') || '',
    });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    useEffect(() => {
        supabase.from('themes').select('id,name').eq('status', 'active').order('name').then(({ data }) => setThemes(data || []));

        let pQuery = supabase.from('projects').select('id,name').order('name');
        if (selectedAccountId) pQuery = pQuery.eq('account_id', selectedAccountId);

        pQuery.then(({ data }) => setProjects(data || []));
    }, [selectedAccountId]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) {
            const file = e.dataTransfer.files[0];
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    async function handleSubmit(e) {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const selectedTheme = themes.find(t => t.id === form.theme_id);
            let uploadedPhotoUrl = null;
            if (selectedFile) {
                console.log("Iniciando upload de imagem...");
                const ext = selectedFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${ext}`;
                const { error: uploadError } = await supabase.storage.from('order_images').upload(fileName, selectedFile);
                if (uploadError) {
                    console.error("Erro no Storage Upload:", uploadError);
                    throw uploadError;
                }
                const { data: { publicUrl } } = supabase.storage.from('order_images').getPublicUrl(fileName);
                uploadedPhotoUrl = publicUrl;
            }

            const payload = {
                child_name: form.child_name,
                child_age: form.child_age ? parseInt(form.child_age) : null,
                gender: form.gender || null,
                theme: selectedTheme?.name || form.theme_id,
                project_id: form.project_id || null,
                status: 'queued',
                account_id: selectedAccountId || null,
                scenes_total: 7,
                scenes_done: 0,
                credits_cost: 10,
                child_photo_url: uploadedPhotoUrl,
                theme_id: form.theme_id,
                skin_tone: skinTone,
                hair_color: hairColor
            };
            console.log("Enviando Payload ao Supabase:", payload);
            const { error, data } = await supabase.from('orders').insert([payload]).select();
            if (error) {
                console.error("Supabase Error no Insert:", error);
                throw error;
            }
            console.log("Insert bem-sucedido. Data retornada:", data);

            // DISPARO DO PIPELINE: usa setTimeout para rodar fora do React
            // setTimeout é um timer do browser - NUNCA é cancelado por navegação React
            if (data && data[0]) {
                const orderRecord = JSON.parse(JSON.stringify(data[0])); // cópia segura
                setTimeout(() => {
                    console.log("[setTimeout] Disparando pipeline para order:", orderRecord.id);
                    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
                    const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
                    fetch(`${SUPABASE_URL}/functions/v1/generate-book`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${ANON_KEY}`,
                            'apikey': ANON_KEY,
                        },
                        body: JSON.stringify({ record: orderRecord, action: 'avatar' }),
                    })
                        .then(r => r.json().catch(() => ({})))
                        .then(body => console.log("[setTimeout] Pipeline resposta:", body))
                        .catch(err => console.warn("[setTimeout] Pipeline erro:", err.message));
                }, 500); // 500ms de delay para garantir que tudo esteja salvo no DB
            }

            // Navega imediatamente (o setTimeout acima roda independente)
            navigate('/pedidos');
        } catch (err) {
            console.error("Exceção capturada no try/catch:", err);
            alert('Erro Crítico ao criar pedido: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="header">
                <div>
                    <Link to="/pedidos" style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, textDecoration: 'none' }}>
                        <i className="fa-solid fa-arrow-left"></i> Voltar para Pedidos
                    </Link>
                    <h1>Criar Novo Pedido</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 100 }}>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'stretch' }}>
                        {/* Coluna Esquerda: Foto */}
                        <div style={{ flex: '1 1 320px', display: 'flex' }}>
                            {/* Foto da Criança */}
                            <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
                                <div style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--glass-border)', paddingBottom: 12 }}>
                                    <i className="fa-regular fa-image" style={{ color: 'var(--accent-1)' }}></i> Foto da Criança
                                </div>
                                <div
                                    onClick={() => !imagePreview && fileInputRef.current?.click()}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={handleDrop}
                                    style={{ border: '2px dashed var(--glass-border)', borderRadius: 12, padding: imagePreview ? 16 : 40, textAlign: 'center', background: '#f1f5f9', cursor: imagePreview ? 'default' : 'pointer', transition: '0.2s' }}
                                    onMouseEnter={e => { if (!imagePreview) { e.currentTarget.style.borderColor = 'var(--accent-1)'; e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; } }}
                                    onMouseLeave={e => { if (!imagePreview) { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = '#f1f5f9'; } }}
                                >
                                    {imagePreview ? (
                                        <div>
                                            <img src={imagePreview} alt="Preview" style={{ maxHeight: 280, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
                                            <button type="button" onClick={() => fileInputRef.current?.click()} style={{ marginTop: 12, display: 'block', width: '100%', padding: '8px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, cursor: 'pointer', fontFamily: 'Outfit', fontSize: 13, color: 'var(--text-secondary)' }}>
                                                <i className="fa-solid fa-camera" style={{ marginRight: 6 }}></i>Alterar Foto
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 32, color: 'var(--text-secondary)', marginBottom: 12, display: 'block' }}></i>
                                            <h3 style={{ marginBottom: 8, fontWeight: 500 }}>Fazer upload da foto</h3>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Rosto bem visível para IA.</p>
                                        </>
                                    )}
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                            </div>
                        </div>

                        {/* Coluna Direita: Dados */}
                        <div style={{ flex: '2 1 480px', display: 'flex' }}>
                            {/* Dados do Protagonista */}
                            <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
                                <div style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--glass-border)', paddingBottom: 12 }}>
                                    <i className="fa-solid fa-id-card" style={{ color: 'var(--accent-2)' }}></i> Dados do Protagonista
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Nome da Criança <span style={{ fontSize: 12 }}>(Aparecerá no livro)</span></label>
                                        <input required className="form-input" style={{ width: '100%' }} placeholder="Ex: Lucas" value={form.child_name} onChange={e => set('child_name', e.target.value)} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Idade <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>(Opcional)</span></label>
                                        <input className="form-input" type="number" placeholder="Anos" min="1" max="15" value={form.child_age} onChange={e => set('child_age', e.target.value)} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Gênero <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>(Auxilia IA)</span></label>
                                        <select className="form-input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                                            <option value="">Escolha...</option>
                                            <option value="M">Masculino</option>
                                            <option value="F">Feminino</option>
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Tom de Pele</label>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                            {SKIN_TONES.map((tone, i) => (
                                                <div key={i} onClick={() => setSkinTone(tone)} title={`Tom ${i + 1}`} style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: tone, cursor: 'pointer', border: skinTone === tone ? `3px solid var(--accent-1)` : '2px solid white', boxShadow: skinTone === tone ? '0 0 0 1px var(--accent-1)' : '0 2px 4px rgba(0,0,0,0.05)', transition: '0.2s' }} />
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Cor de Cabelo</label>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                            {HAIR_COLORS.map((color, i) => (
                                                <div key={i} onClick={() => setHairColor(color)} title={`Cor ${i + 1}`} style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: color, cursor: 'pointer', border: hairColor === color ? `3px solid var(--accent-1)` : '2px solid white', boxShadow: hairColor === color ? '0 0 0 1px var(--accent-1)' : '0 2px 4px rgba(0,0,0,0.05)', transition: '0.2s' }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Setup do Livro */}
                    <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--glass-border)', paddingBottom: 12 }}>
                            <i className="fa-solid fa-book-open" style={{ color: 'var(--accent-4)' }}></i> Setup do Livro
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Tema da História</label>
                                <select required className="form-input" value={form.theme_id} onChange={e => set('theme_id', e.target.value)}>
                                    <option value="">Selecione um tema da biblioteca...</option>
                                    {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Vincular a um Projeto (Opcional)</label>
                                <select className="form-input" value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                                    <option value="">Nenhum (Avulso)</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    {/* Bottom Bar Fixa */}
                    <div className="bottom-bar">
                        <Link to="/pedidos" style={{ padding: '12px 24px', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                            Cancelar
                        </Link>
                        <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15, fontWeight: 600 }} disabled={loading}>
                            {loading ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Enviando...</> : <><i className="fa-solid fa-paper-plane"></i> Enviar para Pipeline</>}
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
}
