import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const GRADIENTS = [
    'linear-gradient(135deg, #dbeafe, #ede9fe)',
    'linear-gradient(135deg, #d1fae5, #a7f3d0)',
    'linear-gradient(135deg, #fce7f3, #fbcfe8)',
    'linear-gradient(135deg, #fef3c7, #fed7aa)',
];



export default function BibliotecaTemas() {
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    const fetchThemes = async () => {
        setLoading(true);
        const { data } = await supabase.from('themes').select('*').order('name');
        setThemes(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchThemes();
    }, []);

    async function toggleStatus(themeId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'draft' : 'active';
        await supabase.from('themes').update({ status: newStatus }).eq('id', themeId);
        fetchThemes();
    }

    async function duplicateTheme(theme) {
        if (!confirm(`Deseja criar uma cópia de "${theme.name}"?`)) return;
        try {
            const { id, created_at, updated_at, ...cleanTheme } = theme;
            cleanTheme.name = `${theme.name} (Cópia)`;
            cleanTheme.status = 'draft'; // Cópia nasce como rascunho por padrão

            const { error } = await supabase.from('themes').insert([cleanTheme]);
            if (error) throw error;
            fetchThemes();
        } catch (err) {
            alert('Erro ao duplicar: ' + err.message);
        }
    }

    async function deleteTheme(themeId, themeName) {
        if (!confirm(`Tem certeza que deseja apagar permanentemente o tema "${themeName}"? Isso não afetará pedidos antigos, mas removerá da biblioteca.`)) return;
        try {
            const { error } = await supabase.from('themes').delete().eq('id', themeId);
            if (error) throw error;
            fetchThemes();
        } catch (err) {
            alert('Erro ao excluir: ' + err.message);
        }
    }

    const filtered = themes.filter(t => {
        const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase());
        return matchSearch;
    });

    return (
        <>
            <div className="header">
                <div>
                    <h1>Biblioteca de Temas</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>Gerencie os temas globais do sistema, defina preços e controle o acesso das contas.</p>
                </div>
                <Link to="/admin/temas/novo" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                    <i className="fa-solid fa-plus"></i> Novo tema
                </Link>
            </div>

            {/* Filtros */}
            <div style={{ background: 'white', padding: '16px 24px', borderRadius: 12, border: '1px solid var(--glass-border)', display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <i className="fa-solid fa-search" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: 13 }}></i>
                    <input type="text" placeholder="Buscar por nome ou categoria..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 16px 10px 40px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, fontSize: 14, fontFamily: 'Outfit', outline: 'none' }} />
                </div>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '10px 16px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, fontSize: 14, fontFamily: 'Outfit', outline: 'none', color: 'var(--text-secondary)' }}>
                    <option value="">Todas as Categorias</option>
                    <option value="aventura">Aventura</option>
                    <option value="fantasia">Fantasia</option>
                    <option value="dates">Datas Comemorativas</option>
                </select>

            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24 }}></i></div>
            ) : filtered.length === 0 ? (
                <div className="glass" style={{ padding: 60, textAlign: 'center' }}>
                    <i className="fa-solid fa-palette" style={{ fontSize: 40, color: 'var(--text-secondary)', marginBottom: 16, display: 'block', opacity: 0.5 }}></i>
                    <h3 style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Nenhum tema cadastrado</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 8, marginBottom: 24, fontSize: 14 }}>Crie o primeiro tema para disponibilizá-lo na plataforma.</p>
                    <Link to="/admin/temas/novo" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                        <i className="fa-solid fa-plus"></i> Criar Primeiro Tema
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                    {filtered.map((theme, idx) => {
                        const isInactive = theme.status !== 'active';
                        return (
                            <div key={theme.id} className="glass" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.3s, box-shadow 0.3s', opacity: isInactive ? 0.8 : 1 }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                                {/* Capa */}
                                <div style={{ height: 160, background: theme.cover_url ? `url(${theme.cover_url}) center/cover` : GRADIENTS[idx % GRADIENTS.length], filter: isInactive ? 'grayscale(30%)' : 'none', position: 'relative' }}>
                                    {isInactive && (
                                        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
                                            <i className="fa-solid fa-eye-slash"></i> Inativo
                                        </div>
                                    )}
                                </div>

                                {/* Conteúdo */}
                                <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div style={{ fontSize: 18, fontWeight: 600, color: isInactive ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{theme.name}</div>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5, flex: 1 }}>{theme.description || 'Tema temático para criança protagonista.'}</div>

                                    {/* Stats */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px dashed var(--glass-border)' }}>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Cenas Padrão</div>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}><i className="fa-regular fa-image" style={{ color: 'var(--text-secondary)', marginRight: 4 }}></i>{theme.scenes_count || 10} págs</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Uso Total</div>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}>0 pedidos</div>
                                        </div>
                                    </div>

                                    {/* Ações */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Link to={`/admin/temas/${theme.id}/editar`} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.05)', fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <i className="fa-solid fa-pen"></i> Editar tema
                                        </Link>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {isInactive ? (
                                                <>
                                                    <button onClick={() => toggleStatus(theme.id, theme.status)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(0,0,0,0.05)', fontSize: 13, cursor: 'pointer', color: 'var(--accent-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <i className="fa-solid fa-eye"></i> Publicar
                                                    </button>
                                                    <button onClick={() => deleteTheme(theme.id, theme.name)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'none', color: 'var(--accent-error)', cursor: 'pointer' }} title="Excluir">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => toggleStatus(theme.id, theme.status)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Ocultar Tema">
                                                        <i className="fa-regular fa-eye-slash"></i>
                                                    </button>
                                                    <button onClick={() => duplicateTheme(theme)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Duplicar">
                                                        <i className="fa-regular fa-copy"></i>
                                                    </button>
                                                    <button onClick={() => deleteTheme(theme.id, theme.name)} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'none', color: 'var(--accent-error)', cursor: 'pointer' }} title="Excluir">
                                                        <i className="fa-regular fa-trash-can"></i>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
