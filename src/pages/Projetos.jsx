import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAccount } from '../context/AccountContext';

export default function Projetos() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const { selectedAccountId } = useAccount();

    useEffect(() => { fetchProjects(); }, [selectedAccountId]);

    async function fetchProjects() {
        setLoading(true);
        try {
            let query = supabase
                .from('projects')
                .select('*, orders(id, status)')
                .order('created_at', { ascending: false });
            if (selectedAccountId) query = query.eq('account_id', selectedAccountId);
            const { data, error } = await query;
            if (error) throw error;
            setProjects(data || []);
        } finally {
            setLoading(false);
        }
    }

    async function deleteProject(id) {
        if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
        try {
            const { error } = await supabase.from('projects').delete().eq('id', id);
            if (error) throw error;
            fetchProjects(); // Recarrega
        } catch (err) {
            alert('Erro ao excluir projeto: ' + err.message);
        }
    }

    return (
        <>
            <div className="header">
                <div>
                    <h1>Gestão de Projetos</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>
                        Agrupe pedidos por escolas, territórios ou patrocinadores.
                    </p>
                </div>
                <Link to="/projetos/novo" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                    <i className="fa-solid fa-folder-plus"></i> Novo Projeto
                </Link>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24 }}></i></div>
            ) : projects.length === 0 ? (
                <div className="glass" style={{ padding: 60, textAlign: 'center' }}>
                    <i className="fa-regular fa-folder-open" style={{ fontSize: 48, color: 'var(--text-secondary)', marginBottom: 20, display: 'block' }}></i>
                    <h3 style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Nenhum projeto criado ainda</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 8, marginBottom: 24, fontSize: 14 }}>Um projeto agrupa pedidos de livros por cliente ou campanha.</p>
                    <Link to="/projetos/novo" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                        <i className="fa-solid fa-plus"></i> Criar Primeiro Projeto
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
                    {projects.map(proj => {
                        const orders = proj.orders || [];
                        const total = orders.length;
                        const completed = orders.filter(o => ['completed', 'delivered', 'review'].includes(o.status)).length;
                        const processing = orders.filter(o => ['processing', 'queued', 'awaiting_avatar'].includes(o.status)).length;
                        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                        return (
                            <div key={proj.id} className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{proj.name}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <i className="fa-regular fa-building"></i> {proj.description?.split('.')[0] || 'Escola / Organização'}
                                        </div>
                                    </div>
                                    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: proj.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.06)', color: proj.status === 'active' ? 'var(--accent-4)' : 'var(--text-secondary)' }}>
                                        {proj.status === 'active' ? 'ATIVO' : proj.status === 'paused' ? 'PAUSADO' : 'CONCLUÍDO'}
                                    </span>
                                </div>

                                {/* Stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                    {[
                                        { label: 'Total Lote', value: total, color: 'var(--text-primary)' },
                                        { label: 'Concluídos', value: completed, color: 'var(--accent-4)' },
                                        { label: 'Processando', value: processing, color: 'var(--accent-1)' },
                                    ].map((s, i) => (
                                        <div key={i} style={{ textAlign: 'center', padding: 12, background: 'rgba(0,0,0,0.03)', borderRadius: 10 }}>
                                            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Progress */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                        <span>Progresso ({pct}%)</span>
                                        <span>Tema: {proj.theme_code || 'Não definido'}</span>
                                    </div>
                                    <div style={{ height: 8, background: 'rgba(0,0,0,0.07)', borderRadius: 4 }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--accent-4)' : 'linear-gradient(90deg, var(--accent-1), var(--accent-2))', borderRadius: 4, transition: 'width 0.5s' }}></div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--glass-border)', paddingTop: 16 }}>
                                    <button className="btn-action" title="Exportar ZIP" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 12px', background: 'rgba(0,0,0,0.04)', borderRadius: 8, border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                                        <i className="fa-solid fa-file-export"></i> ZIP
                                    </button>
                                    <Link to={`/projetos/${proj.id}/pedidos`} className="btn-action" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 12px', background: 'rgba(0,0,0,0.04)', borderRadius: 8, border: '1px solid var(--glass-border)', textDecoration: 'none', color: 'var(--text-secondary)' }}>
                                        <i className="fa-solid fa-users-viewfinder"></i> Ver Pedidos
                                    </Link>
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                        <Link to={`/projetos/${proj.id}/editar`} className="btn-action" title="Editar Projeto" style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.04)', borderRadius: 8, border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <i className="fa-solid fa-pen"></i>
                                        </Link>
                                        <button onClick={() => deleteProject(proj.id)} className="btn-action" title="Excluir Projeto" style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-error)' }}>
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
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
