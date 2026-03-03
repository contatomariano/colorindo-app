import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';


const STATUS_FILTERS = [
    { label: 'Todas', value: 'all', icon: 'fa-layer-group' },
    { label: 'Gerando', value: 'processing', icon: 'fa-spinner' },
    { label: 'Upscaling', value: 'review', icon: 'fa-wand-magic-sparkles' },
    { label: 'Com Erro', value: 'error', icon: 'fa-circle-exclamation', color: 'var(--accent-error)' },
];

export default function Pipeline() {
    const [orders, setOrders] = useState([]);
    const [all, setAll] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [filterProject, setFilterProject] = useState('');
    const [filterTheme, setFilterTheme] = useState('');
    const [projects, setProjects] = useState([]);
    const [themes, setThemes] = useState([]);

    useEffect(() => {
        fetchActive();
        supabase.from('projects').select('id,name').then(({ data }) => setProjects(data || []));
        supabase.from('themes').select('id,name').then(({ data }) => setThemes(data || []));
        const interval = setInterval(fetchActive, 10000);
        return () => clearInterval(interval);
    }, []);

    async function fetchActive() {
        try {
            const { data } = await supabase
                .from('orders')
                .select('*, projects(name)')
                .in('status', ['queued', 'processing', 'review', 'error'])
                .order('created_at', { ascending: false });
            setAll(data || []);
            setOrders(data || []);
        } finally {
            setLoading(false);
        }
    }

    async function forceRetry(orderId) {
        await supabase.from('orders').update({ status: 'queued', scenes_done: 0 }).eq('id', orderId);
        await fetchActive();
    }

    const filtered = all.filter(o => {
        const matchStatus = activeFilter === 'all' || o.status === activeFilter;
        const matchProject = !filterProject || o.project_id === filterProject;
        const matchTheme = !filterTheme || o.theme?.toLowerCase().includes(filterTheme.toLowerCase());
        return matchStatus && matchProject && matchTheme;
    });

    const counts = {
        processing: all.filter(o => o.status === 'processing').length,
        review: all.filter(o => o.status === 'review').length,
        error: all.filter(o => o.status === 'error').length,
    };

    return (
        <>
            <div className="header">
                <div>
                    <h1>Pipeline de Geração</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>Monitoramento das Workers, Upscale e Logs de geração.</p>
                </div>
            </div>

            {/* Toolbar com filtros - fiel ao mock */}
            <div className="glass" style={{ padding: '12px 16px', background: 'white', borderRadius: 12, border: '1px solid var(--glass-border)', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {STATUS_FILTERS.map(f => {
                        const count = f.value === 'all' ? all.length : counts[f.value] || 0;
                        const isActive = activeFilter === f.value;
                        return (
                            <button key={f.value} onClick={() => setActiveFilter(f.value)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--glass-border)', background: isActive ? 'white' : 'transparent', color: f.color || (isActive ? 'var(--text-primary)' : 'var(--text-secondary)'), fontFamily: 'Outfit', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: isActive ? 600 : 400, boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none', borderColor: isActive ? 'var(--text-primary)' : 'var(--glass-border)' }}>
                                <i className={`fa-solid ${f.icon}`}></i> {f.label} {count > 0 && `(${count})`}
                            </button>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'transparent', fontFamily: 'Outfit', fontSize: 13, color: 'var(--text-secondary)', outline: 'none' }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                        <option value="">Filtrar por Projeto...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'transparent', fontFamily: 'Outfit', fontSize: 13, color: 'var(--text-secondary)', outline: 'none' }} value={filterTheme} onChange={e => setFilterTheme(e.target.value)}>
                        <option value="">Filtrar por Tema...</option>
                        {themes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Lista de Jobs */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24 }}></i></div>
            ) : filtered.length === 0 ? (
                <div className="glass" style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <i className="fa-solid fa-inbox" style={{ fontSize: 40, marginBottom: 16, display: 'block', opacity: 0.5 }}></i>
                    <p>Nenhum job ativo no momento. {activeFilter !== 'all' && 'Tente limpar o filtro.'}</p>
                    <p style={{ fontSize: 13, marginTop: 8, color: 'var(--accent-4)' }}><i className="fa-solid fa-circle" style={{ fontSize: 8 }}></i> Atualizando automaticamente a cada 10s</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map((order) => {
                        const isError = order.status === 'error';
                        const pct = order.scenes_total > 0 ? Math.round((order.scenes_done / order.scenes_total) * 100) : 0;
                        return (
                            <div key={order.id} className="glass" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderColor: isError ? 'rgba(239,68,68,0.3)' : 'var(--glass-border)', background: isError ? 'rgba(239,68,68,0.02)' : 'var(--card-bg)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--accent-2)', marginBottom: 2 }}>
                                        JOB-{order.id.split('-')[0].toUpperCase()}-SCENE-{order.scenes_done + 1}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                                        {order.theme || 'Sem tema'} {order.child_name && `— ${order.child_name}`}
                                    </div>
                                    <div style={{ fontSize: 12, color: isError ? 'var(--accent-error)' : 'var(--text-secondary)' }}>
                                        {isError
                                            ? (order.error_message || `Falha após ${order.retry_count} retries.`)
                                            : `Pedido: #${order.id.split('-')[0].toUpperCase()} | ${order.projects?.name || 'Avulso'} | ${pct}% concluído`
                                        }
                                    </div>
                                    {!isError && (
                                        <div style={{ marginTop: 8, height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 2 }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-1)', borderRadius: 2, transition: 'width 0.5s' }}></div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {isError ? (
                                        <button onClick={() => forceRetry(order.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 6, padding: '8px 16px', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-error)', fontFamily: 'Outfit', fontSize: 13, fontWeight: 600 }}>
                                            <i className="fa-solid fa-rotate-right"></i> Forçar Retry Manual
                                        </button>
                                    ) : (
                                        <>
                                            {order.status === 'review' && (
                                                <button style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Expandir">
                                                    <i className="fa-solid fa-expand"></i>
                                                </button>
                                            )}
                                            <Link to={`/pedidos/${order.id}/log`} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} title="Ver Logs">
                                                <i className="fa-solid fa-terminal"></i>
                                            </Link>
                                            {order.status === 'review' && (
                                                <>
                                                    <button style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Refazer Cena">
                                                        <i className="fa-solid fa-rotate-right"></i>
                                                    </button>
                                                    <button style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Baixar Original">
                                                        <i className="fa-solid fa-download"></i>
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
