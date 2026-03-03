import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const INPUT_STYLE = {
    background: '#e2e8f0',
    border: '1px solid transparent',
    color: 'var(--text-primary)',
    padding: '12px 16px',
    borderRadius: 8,
    fontFamily: 'Outfit',
    fontSize: 15,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s',
};

const LABEL_STYLE = {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 8,
    display: 'block',
};

const SECTION_TITLE_STYLE = {
    fontSize: 18,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: 12,
    marginBottom: 4,
};

function FormGroup({ label, hint, children, full }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: full ? '1 / -1' : undefined }}>
            {label && <label style={LABEL_STYLE}>{label}</label>}
            {children}
            {hint && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{hint}</span>}
        </div>
    );
}

function UploadBox({ icon, title, subtitle, onFile, file, url }) {
    const [dragging, setDragging] = useState(false);
    const [localFile, setLocalFile] = useState(null);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) { setLocalFile(f); onFile?.(f); }
    };

    const hasImage = localFile || url;

    return (
        <div
            onClick={() => document.getElementById(`upload-${title}`)?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{ position: 'relative', border: `1px solid ${dragging ? 'var(--accent-3)' : 'var(--glass-border)'}`, borderRadius: 12, background: dragging ? 'rgba(236,72,153,0.05)' : '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 10, cursor: 'pointer', transition: '0.2s', aspectRatio: '1', overflow: 'hidden' }}
        >
            <input id={`upload-${title}`} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { setLocalFile(f); onFile?.(f); } }} />

            {hasImage && (
                <img
                    src={localFile ? URL.createObjectURL(localFile) : url}
                    alt={title}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }}
                />
            )}

            <i className={`fa-solid ${icon}`} style={{ fontSize: 24, color: hasImage ? 'var(--accent-4)' : 'var(--text-secondary)', zIndex: 1 }}></i>
            <div style={{ fontSize: 14, fontWeight: 500, color: hasImage ? 'var(--accent-4)' : 'var(--text-primary)', zIndex: 1 }}>{localFile ? localFile.name : title}</div>
            {!hasImage && <div style={{ fontSize: 11, color: 'var(--text-secondary)', zIndex: 1 }}>{subtitle}</div>}
        </div>
    );
}

export default function NovoTemaAdmin() {
    const navigate = useNavigate();
    const { id } = useParams(); // ID para edição de tema
    const isEditing = !!id;

    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(isEditing);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [scenesCount, setScenesCount] = useState(10);
    const [border, setBorder] = useState('none');
    const [coverPrompt, setCoverPrompt] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [originalStatus, setOriginalStatus] = useState('active');
    const [scenes, setScenes] = useState([
        { id: 1, prompt: '', refImage: null, refImageUrl: '' },
        { id: 2, prompt: '', refImage: null, refImageUrl: '' },
    ]);
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerDragging, setBannerDragging] = useState(false);

    // Referências Globais
    const [refMale, setRefMale] = useState({ file: null, url: '' });
    const [refFemale, setRefFemale] = useState({ file: null, url: '' });
    const [refOutfit, setRefOutfit] = useState({ file: null, url: '' });
    const [refWireframe, setRefWireframe] = useState({ file: null, url: '' });

    const addScene = () => setScenes(s => [...s, { id: Date.now(), prompt: '', refImage: null, refImageUrl: '' }]);
    const removeScene = (sceneId) => setScenes(s => s.filter(sc => sc.id !== sceneId));
    const updateScene = (sceneId, field, val) => setScenes(s => s.map(sc => sc.id === sceneId ? { ...sc, [field]: val } : sc));

    useEffect(() => {
        if (isEditing) {
            setLoading(true);
            supabase.from('themes').select('*').eq('id', id).single()
                .then(({ data, error }) => {
                    if (error || !data) {
                        alert('Erro ao carregar tema para edição.');
                        navigate('/admin/temas');
                    } else {
                        setName(data.name || '');
                        setDescription(data.description || '');
                        setScenesCount(data.scenes_count || 10);
                        setCoverPrompt(data.cover_prompt || '');
                        setCoverUrl(data.cover_url || '');
                        setOriginalStatus(data.status || 'active');
                        if (data.scenes_data && Array.isArray(data.scenes_data) && data.scenes_data.length > 0) {
                            setScenes(data.scenes_data.map(s => ({ ...s, refImage: null, refImageUrl: s.refImageUrl || '' })));
                        }
                        setRefMale(p => ({ ...p, url: data.ref_male_url || '' }));
                        setRefFemale(p => ({ ...p, url: data.ref_female_url || '' }));
                        setRefOutfit(p => ({ ...p, url: data.ref_outfit_url || '' }));
                        setRefWireframe(p => ({ ...p, url: data.ref_wireframe_url || '' }));
                    }
                    setLoading(false);
                });
        }
    }, [id, isEditing, navigate]);

    const handleSave = async () => {
        if (!name.trim()) { alert('Nome do tema é obrigatório.'); return; }
        setSaving(true);
        try {
            const uploadFile = async (file, folder = 'themes') => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('order_images').upload(fileName, file);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('order_images').getPublicUrl(fileName);
                return publicUrl;
            };

            let finalCoverUrl = coverUrl;
            if (bannerFile) finalCoverUrl = await uploadFile(bannerFile);

            let finalRefMale = refMale.url;
            if (refMale.file) finalRefMale = await uploadFile(refMale.file);

            let finalRefFemale = refFemale.url;
            if (refFemale.file) finalRefFemale = await uploadFile(refFemale.file);

            let finalRefOutfit = refOutfit.url;
            if (refOutfit.file) finalRefOutfit = await uploadFile(refOutfit.file);

            let finalRefWireframe = refWireframe.url;
            if (refWireframe.file) finalRefWireframe = await uploadFile(refWireframe.file);

            // Upload de referências das cenas
            const finalScenes = await Promise.all(scenes.map(async s => {
                let sRefUrl = s.refImageUrl || '';
                if (s.refImage) sRefUrl = await uploadFile(s.refImage, 'scenes');
                return { id: s.id, prompt: s.prompt, refImageUrl: sRefUrl };
            }));

            const payload = {
                name: name.trim(),
                description: description.trim(),
                scenes_count: parseInt(scenesCount) || 10,
                status: originalStatus,
                cover_prompt: coverPrompt.trim(),
                cover_url: finalCoverUrl,
                ref_male_url: finalRefMale,
                ref_female_url: finalRefFemale,
                ref_outfit_url: finalRefOutfit,
                ref_wireframe_url: finalRefWireframe,
                scenes_data: finalScenes,
            };

            if (isEditing) {
                const { error } = await supabase.from('themes').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('themes').insert([payload]);
                if (error) throw error;
            }

            navigate('/admin/temas');
        } catch (err) {
            alert('Erro ao salvar tema: ' + err.message);
            console.error('Erro detalhado:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ padding: 60, textAlign: 'center' }}><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 32, color: 'var(--accent-1)' }}></i><p style={{ marginTop: 16 }}>Carregando dados do tema...</p></div>;
    }

    return (
        <>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <Link to="/admin/temas" style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, textDecoration: 'none' }}>
                    <i className="fa-solid fa-arrow-left"></i> Voltar para Biblioteca
                </Link>
                <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.5px' }}>{isEditing ? `Editar Tema: ${name}` : 'Criar Novo Tema'}</h1>
            </div>

            {/* Form Container */}
            <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 100 }}>

                {/* ── 1. Informações da Narrativa ── */}
                <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={SECTION_TITLE_STYLE}>
                        <i className="fa-solid fa-pen-nib" style={{ color: 'var(--accent-1)' }}></i> Informações da Narrativa
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <FormGroup label="Nome do Tema" full>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Lendas do Folclore" style={INPUT_STYLE} onFocus={e => e.target.style.borderColor = 'var(--accent-1)'} onBlur={e => e.target.style.borderColor = 'transparent'} />
                        </FormGroup>
                        <FormGroup label="Descrição Conceitual" full>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Explique sobre o que é a história, ambientes, tom da aventura..." style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 80 }} onFocus={e => e.target.style.borderColor = 'var(--accent-1)'} onBlur={e => e.target.style.borderColor = 'transparent'} />
                        </FormGroup>
                    </div>
                </div>

                {/* ── 2. Banner da Capa ── */}
                <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={SECTION_TITLE_STYLE}>
                        <i className="fa-solid fa-panorama" style={{ color: 'var(--accent-3)' }}></i> Banner da Capa
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: -8 }}>Imagem exibida como capa do tema nas listagens e no Marketplace. Proporção recomendada: 16:9 (1200×675px).</p>
                    <div
                        onClick={() => document.getElementById('banner-upload')?.click()}
                        onDragOver={e => { e.preventDefault(); setBannerDragging(true); }}
                        onDragLeave={() => setBannerDragging(false)}
                        onDrop={e => { e.preventDefault(); setBannerDragging(false); const f = e.dataTransfer.files[0]; if (f) setBannerFile(f); }}
                        style={{ position: 'relative', overflow: 'hidden', border: `2px dashed ${bannerDragging ? 'var(--accent-3)' : 'var(--glass-border)'}`, borderRadius: 14, background: bannerDragging ? 'rgba(236,72,153,0.05)' : 'linear-gradient(135deg, rgba(236,72,153,0.03), rgba(99,102,241,0.03))', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', transition: '0.2s', minHeight: 200 }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-3)'; e.currentTarget.style.background = 'rgba(236,72,153,0.05)'; }}
                        onMouseLeave={e => { if (!bannerDragging) { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(236,72,153,0.03), rgba(99,102,241,0.03))'; } }}
                    >
                        <input id="banner-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setBannerFile(e.target.files[0])} />
                        {!bannerFile && coverUrl && (
                            <img src={coverUrl} alt="Capa Atual" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
                        )}
                        <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 32, color: bannerFile ? 'var(--accent-4)' : 'var(--accent-3)', opacity: 0.9, zIndex: 1 }}></i>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', zIndex: 1, textShadow: '0 1px 4px rgba(255,255,255,0.9)' }}>
                            {bannerFile ? bannerFile.name : coverUrl ? 'Clique para substituir a capa atual' : 'Arraste uma imagem ou clique para fazer upload'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', zIndex: 1, textShadow: '0 1px 4px rgba(255,255,255,0.9)' }}>PNG, JPG ou WebP · Máx 5MB</div>
                    </div>
                </div>

                {/* ── 3. Referências Visuais (ControlNet) ── */}
                <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={SECTION_TITLE_STYLE}>
                        <i className="fa-solid fa-image" style={{ color: 'var(--accent-3)' }}></i> Referências Visuais (ControlNet)
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: -8 }}>A IA usará estas imagens como base estrutural (poses, roupas) mesclando-as com o rosto da criança fotografada.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 10 }}>
                        <UploadBox icon="fa-person" title="Personagem Base (Masc)" subtitle="Estrutura corporal menino" onFile={f => setRefMale({ file: f, url: refMale.url })} url={refMale.url} />
                        <UploadBox icon="fa-person-dress" title="Personagem Base (Fem)" subtitle="Estrutura corporal menina" onFile={f => setRefFemale({ file: f, url: refFemale.url })} url={refFemale.url} />
                        <UploadBox icon="fa-shirt" title="Referência Figurino" subtitle="Estilo de roupa" onFile={f => setRefOutfit({ file: f, url: refOutfit.url })} url={refOutfit.url} />
                        <UploadBox icon="fa-book" title="Wireframe da Capa" subtitle="Layout/Composição" onFile={f => setRefWireframe({ file: f, url: refWireframe.url })} url={refWireframe.url} />
                    </div>
                </div>

                {/* ── 4. Estrutura do Livro ── */}
                <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={SECTION_TITLE_STYLE}>
                        <i className="fa-solid fa-list-ul" style={{ color: 'var(--accent-4)' }}></i> Estrutura do Livro
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <FormGroup label="Quantidade de Cenas Padrão">
                            <input type="number" value={scenesCount} onChange={e => setScenesCount(e.target.value)} style={INPUT_STYLE} onFocus={e => e.target.style.borderColor = 'var(--accent-1)'} onBlur={e => e.target.style.borderColor = 'transparent'} />
                        </FormGroup>
                        <FormGroup label="Borda Padrão da Página">
                            <select value={border} onChange={e => setBorder(e.target.value)} style={INPUT_STYLE}>
                                <option value="none">Nenhuma (Sangria total)</option>
                                <option value="simple">Moldura Simples B&amp;W</option>
                                <option value="decorative">Moldura Decorativa (Mato/Folhas)</option>
                            </select>
                        </FormGroup>
                    </div>
                </div>

                {/* ── 6. Prompt Dinâmico da Capa ── */}
                <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={SECTION_TITLE_STYLE}>
                        <i className="fa-solid fa-book-open" style={{ color: 'var(--accent-1)' }}></i> Prompt Dinâmico da Capa
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: -8 }}>
                        Descreva a ilustração da capa do livro. Este prompt será usado pelo modelo <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>nano-banana-edit</code> para gerar a capa personalizada.
                    </p>
                    <FormGroup label="Prompt da Capa">
                        <textarea value={coverPrompt} onChange={e => setCoverPrompt(e.target.value)} rows={6} placeholder="Ex: Uma ilustração colorida formato horizontal (paisagem), com um personagem criança astronauta fofa em um traje espacial..." style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 120 }} onFocus={e => e.target.style.borderColor = 'var(--accent-1)'} onBlur={e => e.target.style.borderColor = 'transparent'} />
                    </FormGroup>
                </div>

                {/* ── 7. Mapeamento de Cenas ── */}
                <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={SECTION_TITLE_STYLE}>
                        <i className="fa-solid fa-list-ol" style={{ color: 'var(--accent-2)' }}></i> Mapeamento de Cenas (Prompts Dinâmicos)
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        Configure a narrativa página por página. Variáveis: <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>{'{nome}'}</code>, <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>{'{idade}'}</code>, <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>{'{genero}'}</code>.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {scenes.map((scene, idx) => (
                            <div key={scene.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', borderBottom: '1px solid var(--glass-border)', paddingBottom: 24 }}>
                                {/* Número */}
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', color: 'var(--accent-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 28 }}>
                                    {idx + 1}
                                </div>
                                {/* Conteúdo */}
                                <div style={{ flex: 1 }}>
                                    <label style={LABEL_STYLE}>Prompt da Cena</label>
                                    <textarea
                                        value={scene.prompt}
                                        onChange={e => updateScene(scene.id, 'prompt', e.target.value)}
                                        placeholder={idx === 0 ? 'Ex: uma criança alegre em um traje espacial em pé na superfície da Lua, com um foguete ao fundo e a Terra no céu.' : 'Ex: uma criança astronauta assistindo a uma chuva de meteoros pela janela da nave.'}
                                        style={{ ...INPUT_STYLE, width: '100%', minHeight: 80, fontSize: 14, marginBottom: 12, resize: 'vertical' }}
                                        onFocus={e => e.target.style.borderColor = 'var(--accent-1)'}
                                        onBlur={e => e.target.style.borderColor = 'transparent'}
                                    />
                                    {/* Upload referência */}
                                    <label style={{ ...LABEL_STYLE, fontSize: 11 }}>Imagem de Referência da Cena</label>
                                    <div
                                        onClick={() => document.getElementById(`scene-img-${scene.id}`)?.click()}
                                        style={{ position: 'relative', border: '1px dashed var(--glass-border)', borderRadius: 8, padding: 12, background: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: '0.2s', overflow: 'hidden' }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-1)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                                    >
                                        <input id={`scene-img-${scene.id}`} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => updateScene(scene.id, 'refImage', e.target.files[0])} />

                                        {(scene.refImage || scene.refImageUrl) && (
                                            <img
                                                src={scene.refImage ? URL.createObjectURL(scene.refImage) : scene.refImageUrl}
                                                alt="Ref"
                                                style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 60, objectFit: 'cover', opacity: 0.5, borderLeft: '1px solid var(--glass-border)' }}
                                            />
                                        )}

                                        <i className="fa-solid fa-cloud-arrow-up" style={{ color: (scene.refImage || scene.refImageUrl) ? 'var(--accent-4)' : 'var(--text-secondary)', fontSize: 16, zIndex: 1 }}></i>
                                        <span style={{ fontSize: 13, color: (scene.refImage || scene.refImageUrl) ? 'var(--accent-4)' : 'var(--text-secondary)', zIndex: 1 }}>
                                            {scene.refImage ? scene.refImage.name : scene.refImageUrl ? 'Referência salva' : 'Fazer upload de referência visual (opcional)'}
                                        </span>
                                    </div>
                                </div>
                                {/* Botão remover */}
                                <button
                                    onClick={() => removeScene(scene.id)}
                                    style={{ padding: 8, borderRadius: 8, border: 'none', background: 'none', color: 'var(--accent-error)', cursor: 'pointer', marginTop: 28 }}
                                    title="Remover Cena"
                                >
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Botão Adicionar Cena */}
                    <button
                        onClick={addScene}
                        style={{ marginTop: 8, padding: '10px 16px', fontSize: 14, background: 'transparent', color: 'var(--accent-1)', border: '1px dashed var(--accent-1)', borderRadius: 8, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 500, transition: '0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <i className="fa-solid fa-plus"></i> Adicionar Nova Cena
                    </button>
                </div>

            </div>

            {/* ── Bottom Bar Fixa ── */}
            <div style={{ position: 'fixed', bottom: 0, right: 0, width: 'calc(100% - 280px)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--glass-border)', padding: '16px 40px', display: 'flex', justifyContent: 'flex-end', gap: 16, zIndex: 100 }}>
                <Link to="/admin/temas" style={{ padding: '12px 24px', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Cancelar
                </Link>
                <button onClick={handleSave} disabled={saving} style={{ padding: '12px 24px', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', border: 'none', background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))', color: 'white', display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1, transition: '0.2s' }}>
                    <i className={saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'}></i>
                    {saving ? 'Salvando...' : (isEditing ? 'Atualizar Tema' : 'Salvar Tema')}
                </button>
            </div>
        </>
    );
}
