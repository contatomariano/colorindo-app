import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAccount } from '../context/AccountContext';

const STATUS_CONFIG = {
    queued: { label: 'Na Fila', cls: 'status-processing', icon: 'fa-clock' },
    processing: { label: 'Gerando', cls: 'status-processing', icon: 'fa-spinner fa-spin' },
    awaiting_avatar: { label: 'Aprovação Pendente', cls: 'status-review', icon: 'fa-user-check' },
    paused: { label: 'Pausado', cls: 'status-error', icon: 'fa-pause' },
    review: { label: 'Aguardando Revisão', cls: 'status-review', icon: 'fa-eye' },
    completed: { label: 'Concluído', cls: 'status-success', icon: 'fa-check' },
    delivered: { label: 'PDF Entregue', cls: 'status-success', icon: 'fa-file-pdf' },
    error: { label: 'Falha de geração', cls: 'status-error', icon: 'fa-triangle-exclamation' },
};

export default function Pedidos() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const { selectedAccountId } = useAccount();

    useEffect(() => { fetchOrders(); }, [selectedAccountId]);

    async function fetchOrders() {
        try {
            setLoading(true);
            let query = supabase.from('orders').select('*, projects(name, account_id)').order('created_at', { ascending: false });
            const { data, error } = await query;
            if (error) throw error;
            // Filtro por account_id via join
            const filtered = selectedAccountId
                ? (data || []).filter(o => o.projects?.account_id === selectedAccountId)
                : (data || []);
            setOrders(filtered);
        } catch (err) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleReprocess(orderId) {
        if (!window.confirm('Tem certeza que deseja reenviar este pedido do zero para a Engine?')) return;
        try {
            const orderObj = orders.find(o => o.id === orderId);
            if (!orderObj) return;

            await supabase.from('orders').update({
                status: 'processing',
                error_message: 'Reiniciando processo completo...',
                scenes_done: 0,
                character_url: null,
                cover_url: null
            }).eq('id', orderId);

            await supabase.functions.invoke("generate-book", {
                body: { record: orderObj, action: "avatar" },
            });
            await fetchOrders();
        } catch (error) {
            console.error(error.message);
        }
    }

    async function handleDelete(orderId) {
        if (!window.confirm('Tem certeza que deseja DELETAR este pedido permanentemente? Toda mídia gerada será perdida.')) return;
        try {
            const { error } = await supabase.from('orders').delete().eq('id', orderId);
            if (error) throw error;
            await fetchOrders();
        } catch (error) {
            console.error(error.message);
            alert('Falha ao excluir pedido: ' + error.message);
        }
    }

    async function handlePause(orderId) {
        if (!window.confirm('Atenção: Pausar o pedido não interromperá gerações de IA que já estão aguardando o Supabase na nuvem. Confirmar Status Pausado?')) return;
        try {
            const { error } = await supabase.from('orders').update({ status: 'paused' }).eq('id', orderId);
            if (error) throw error;
            await fetchOrders();
        } catch (error) {
            console.error(error.message);
            alert('Falha ao pausar pedido.');
        }
    }

    const filtered = orders.filter(o => {
        const matchSearch = !search || o.theme?.toLowerCase().includes(search.toLowerCase()) || o.child_name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !filterStatus || o.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const stats = {
        processing: orders.filter(o => ['queued', 'processing', 'awaiting_avatar'].includes(o.status)).length,
        review: orders.filter(o => o.status === 'review').length,
        error: orders.filter(o => o.status === 'error').length,
        completed: orders.filter(o => ['completed', 'delivered'].includes(o.status)).length,
    };

    return (
        <>
            <div className="header">
                <h1>Gerenciamento de Pedidos</h1>
                <div style={{ display: 'flex', gap: 12 }}>
                    <Link to="/pedidos/lote" className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', textDecoration: 'none' }}>
                        <i className="fa-solid fa-file-csv"></i> Lote (CSV)
                    </Link>
                    <Link to="/pedidos/novo" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                        <i className="fa-solid fa-plus"></i> Novo Pedido
                    </Link>
                </div>
            </div>

            {/* Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Em Andamento', value: stats.processing, color: 'var(--accent-1)', icon: 'fa-spinner', bg: 'rgba(99,102,241,0.1)' },
                    { label: 'Aguardando Revisão', value: stats.review, color: 'var(--accent-5)', icon: 'fa-clock', bg: 'rgba(245,158,11,0.1)' },
                    { label: 'Livros Concluídos', value: stats.completed, color: 'var(--accent-4)', icon: 'fa-circle-check', bg: 'rgba(16,185,129,0.1)' },
                    { label: 'Falha na Geração', value: stats.error, color: 'var(--accent-error)', icon: 'fa-triangle-exclamation', bg: 'rgba(239,68,68,0.1)' },
                ].map((s, i) => (
                    <div key={i} className="glass" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: 18 }}></i>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
                <div className="search-bar" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '10px 16px' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-secondary)' }}></i>
                    <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Buscar por tema, nome da criança..." style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontFamily: 'Outfit', fontSize: 14 }} />
                </div>
                <select className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontFamily: 'Outfit' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">Todos Status</option>
                    <option value="processing">Gerando</option>
                    <option value="review">Aguardando Revisão</option>
                    <option value="completed">Concluído</option>
                    <option value="error">Falha</option>
                </select>
            </div>

            <div className="glass" style={{ overflowX: 'auto' }}>
                <table className="table-container">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Criança / Dados</th>
                            <th>Projeto / Tema</th>
                            <th>Status do Pipeline</th>
                            <th>Progresso</th>
                            <th>Data</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40 }}><i className="fa-solid fa-circle-notch fa-spin"></i> Carregando...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                                {search || filterStatus ? 'Nenhum pedido encontrado com os filtros aplicados.' : 'Nenhum pedido ainda. Clique em "Novo Pedido" para começar.'}
                            </td></tr>
                        ) : filtered.map((order, idx) => {
                            const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.queued;
                            const pct = order.scenes_total > 0 ? Math.round((order.scenes_done / order.scenes_total) * 100) : 0;
                            return (
                                <tr key={order.id}>
                                    <td>
                                        <Link to={`/pedidos/${order.id}`} style={{ color: 'var(--accent-2)', textDecoration: 'none', fontFamily: 'monospace', fontWeight: 600, fontSize: 15 }}>
                                            #{order.id.split('-')[0].toUpperCase()}
                                        </Link>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            {order.child_photo_url ? (
                                                <img src={order.child_photo_url} alt={order.child_name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                                            ) : (
                                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                                                    {(order.child_name || '?')[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{order.child_name || 'Não informado'}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                    {order.child_age ? `${order.child_age} anos` : '—'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{order.projects?.name || 'Avulso'}</div>
                                        <div style={{ fontSize: 12, color: 'var(--accent-1)' }}>{order.theme}</div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${st.cls}`}>
                                            <i className={`fa-solid ${st.icon}`} style={{ marginRight: 4 }}></i>
                                            {st.label}
                                        </span>
                                    </td>
                                    <td>
                                        {['queued', 'processing', 'awaiting_avatar'].includes(order.status) && (order.scenes_done || 0) === 0 ? (
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-1)' }}>Etapa 1/3: Personagem</div>
                                        ) : order.status === 'review' ? (
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-5)' }}>Etapa 3/3: Revisão Final</div>
                                        ) : (
                                            <div style={{ fontSize: 13 }}>{order.scenes_done}/{order.scenes_total} cenas</div>
                                        )}
                                        <div style={{ width: 80, height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 2, marginTop: 4 }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: order.status === 'error' ? 'var(--accent-error)' : 'var(--accent-4)', borderRadius: 2 }}></div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 14 }}>{new Date(order.created_at).toLocaleDateString('pt-BR')}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <Link to={`/pedidos/${order.id}`} className="btn-action" title="Detalhes"><i className="fa-solid fa-eye"></i></Link>

                                            {/* Novas Ações Opcionais Baseadas no Status */}
                                            {['queued', 'processing', 'awaiting_avatar'].includes(order.status) && (
                                                <button className="btn-action" title="Pausar Pedido" onClick={() => handlePause(order.id)} style={{ color: '#eab308' }}><i className="fa-solid fa-circle-pause"></i></button>
                                            )}

                                            {order.status === 'review' && <Link to={`/pedidos/${order.id}/revisao`} className="btn-action" title="Revisar" style={{ color: 'var(--accent-5)' }}><i className="fa-solid fa-check-to-slot"></i></Link>}
                                            {['review', 'completed', 'delivered'].includes(order.status) && order.cover_pdf_url && (
                                                <a href={order.cover_pdf_url} target="_blank" rel="noopener noreferrer" download className="btn-action" title="Baixar PDF da Capa" style={{ color: 'var(--accent-4)' }}><i className="fa-solid fa-file-pdf"></i></a>
                                            )}
                                            {['review', 'completed', 'delivered'].includes(order.status) && order.scenes_pdf_url && (
                                                <a href={order.scenes_pdf_url} target="_blank" rel="noopener noreferrer" download className="btn-action" title="Baixar PDF do Miolo" style={{ color: 'var(--accent-4)' }}><i className="fa-regular fa-file-pdf"></i></a>
                                            )}
                                            {order.status === 'error' && <button className="btn-action" title="Reprocessar" onClick={() => handleReprocess(order.id)} style={{ color: 'var(--accent-error)' }}><i className="fa-solid fa-rotate-right"></i></button>}

                                            <button className="btn-action" title="Excluir" onClick={() => handleDelete(order.id)} style={{ color: 'var(--accent-error)' }}><i className="fa-regular fa-trash-can"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div className="pagination" style={{ justifyContent: 'space-between' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        Mostrando {filtered.length} de {orders.length} pedidos
                    </div>
                </div>
            </div>
        </>
    );
}
