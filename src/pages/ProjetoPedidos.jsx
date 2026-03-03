import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const STATUS_CONFIG = {
    queued: { label: 'Na Fila', class: 'status-processing', icon: 'fa-clock' },
    processing: { label: 'Gerando', class: 'status-processing', icon: 'fa-spinner fa-spin' },
    review: { label: 'Aguardando Revisão', class: 'status-review', icon: 'fa-check-to-slot' },
    done: { label: 'PDF Entregue', class: 'status-success', icon: 'fa-file-pdf' },
    error: { label: 'Falha geração', class: 'status-error', icon: 'fa-bug' },
};

export default function ProjetoPedidos() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);
    const perPage = 10;

    useEffect(() => {
        if (!id) return;
        Promise.all([
            supabase.from('projects').select('*').eq('id', id).single(),
            supabase.from('orders').select('*').eq('project_id', id).order('created_at', { ascending: false }),
        ]).then(([{ data: proj }, { data: ords }]) => {
            setProject(proj);
            setOrders(ords || []);
            setLoading(false);
        });
    }, [id]);

    const filtered = orders.filter(o => {
        const matchSearch = !search || o.child_name?.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search);
        const matchStatus = !filterStatus || o.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const paginated = filtered.slice((page - 1) * perPage, page * perPage);
    const totalPages = Math.ceil(filtered.length / perPage);

    const fmt = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR') + ', ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const scenesLabel = (o) => {
        if (o.status === 'processing' && o.scenes_total > 0) return `Cenas (${o.scenes_done}/${o.scenes_total})`;
        return STATUS_CONFIG[o.status]?.label || o.status;
    };

    let parsedClient = '';
    if (project?.description) {
        if (project.description.startsWith('Cliente: ')) {
            parsedClient = project.description.split('. ')[0].replace('Cliente: ', '');
        } else if (!project.description.includes('. ')) {
            parsedClient = project.description;
        }
    }

    return (
        <>
            <div className="header">
                <div>
                    <Link to="/projetos" style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, textDecoration: 'none' }}>
                        <i className="fa-solid fa-arrow-left"></i> Voltar para Projetos
                    </Link>
                    <h1>Pedidos: {project?.name || '...'}</h1>
                    {parsedClient && (
                        <p style={{ color: 'var(--accent-3)', fontWeight: 500, fontSize: 14, marginTop: 6 }}>
                            <i className="fa-regular fa-building"></i> {parsedClient}
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn" style={{ border: '1px solid var(--glass-border)', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-file-csv"></i> Lote (CSV)
                    </button>
                    <Link to={`/pedidos/novo?project=${id}`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                        <i className="fa-solid fa-plus"></i> Novo Pedido
                    </Link>
                </div>
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#e2e8f0', borderRadius: 12, padding: '10px 16px', width: 320 }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-secondary)' }}></i>
                    <input type="text" placeholder="Buscar por ID, Criança..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', marginLeft: 10, width: '100%', fontFamily: 'Outfit', fontSize: 14 }} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid var(--glass-border)', background: 'transparent', fontFamily: 'Outfit', fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
                        <option value="">Todos Status</option>
                        <option value="queued">Na Fila</option>
                        <option value="processing">Gerando</option>
                        <option value="review">Aguardando Revisão</option>
                        <option value="done">Concluído</option>
                        <option value="error">Falha</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24 }}></i></div>
            ) : (
                <div className="glass" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr>
                                {['ID', 'Criança / Foto', 'Status do Pipeline', 'Data', 'Ações'].map(h => (
                                    <th key={h} style={{ padding: '18px 24px', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhum pedido encontrado.</td></tr>
                            ) : paginated.map(order => {
                                const s = STATUS_CONFIG[order.status] || STATUS_CONFIG.queued;
                                const isError = order.status === 'error';
                                const isDone = order.status === 'done';
                                return (
                                    <tr key={order.id} style={{ transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                                        <td style={{ padding: '18px 24px', borderBottom: '1px solid var(--glass-border)', fontFamily: 'monospace', color: 'var(--accent-2)', fontWeight: 600 }}>
                                            #{order.id.split('-')[0].toUpperCase()}
                                        </td>
                                        <td style={{ padding: '18px 24px', borderBottom: '1px solid var(--glass-border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #c7d2fe, #ddd6fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent-2)' }}>
                                                    {(order.child_name || '?').charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{order.child_name || 'Sem nome'}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                        {order.gender === 'M' ? 'Masc' : order.gender === 'F' ? 'Fem' : '—'}{order.child_age ? `, ${order.child_age} anos` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '18px 24px', borderBottom: '1px solid var(--glass-border)' }}>
                                            <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, background: isError ? 'rgba(239,68,68,0.1)' : isDone ? 'rgba(16,185,129,0.1)' : order.status === 'review' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)', color: isError ? 'var(--accent-error)' : isDone ? 'var(--accent-4)' : order.status === 'review' ? 'var(--accent-5)' : 'var(--accent-1)' }}>
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block', boxShadow: order.status === 'processing' ? '0 0 5px currentColor' : 'none' }}></span>
                                                {scenesLabel(order)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '18px 24px', borderBottom: '1px solid var(--glass-border)' }}>
                                            <div style={{ fontSize: 14 }}>{fmt(order.created_at)}</div>
                                        </td>
                                        <td style={{ padding: '18px 24px', borderBottom: '1px solid var(--glass-border)' }}>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <Link to={`/pedidos/${order.id}`} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center' }} title="Detalhes">
                                                    <i className="fa-solid fa-eye"></i>
                                                </Link>
                                                {order.status === 'review' && (
                                                    <button style={{ padding: 8, borderRadius: 8, border: 'none', background: 'none', color: 'var(--accent-5)', cursor: 'pointer' }} title="Revisar Imagens">
                                                        <i className="fa-solid fa-check-to-slot"></i>
                                                    </button>
                                                )}
                                                {order.status === 'done' && (
                                                    <button style={{ padding: 8, borderRadius: 8, border: 'none', background: 'none', color: 'var(--accent-4)', cursor: 'pointer' }} title="Baixar PDF">
                                                        <i className="fa-solid fa-file-pdf"></i>
                                                    </button>
                                                )}
                                                {isError && (
                                                    <button style={{ padding: 8, borderRadius: 8, border: 'none', background: 'none', color: 'var(--accent-error)', cursor: 'pointer' }} title="Ver Erro">
                                                        <i className="fa-solid fa-bug"></i>
                                                    </button>
                                                )}
                                                {(isError || order.status === 'processing') && (
                                                    <button style={{ padding: 8, borderRadius: 8, border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Reprocessar">
                                                        <i className="fa-solid fa-rotate-right"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Paginação */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                            Mostrando {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} de {filtered.length} pedidos
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[{ icon: 'fa-chevron-left', onClick: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1 }].concat(
                                Array.from({ length: Math.min(3, totalPages) }, (_, i) => ({ label: String(i + 1), active: page === i + 1, onClick: () => setPage(i + 1) }))
                            ).concat([{ icon: 'fa-chevron-right', onClick: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page === totalPages || totalPages === 0 }]).map((btn, i) => (
                                <button key={i} onClick={btn.onClick} disabled={btn.disabled} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--glass-border)', background: btn.active ? 'var(--accent-1)' : 'transparent', color: btn.active ? 'white' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: btn.disabled ? 'default' : 'pointer', opacity: btn.disabled ? 0.4 : 1, fontSize: 13, fontFamily: 'Outfit' }}>
                                    {btn.icon ? <i className={`fa-solid ${btn.icon}`} style={{ fontSize: 11 }}></i> : btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
