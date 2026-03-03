import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function PedidoLog() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from('orders')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => { setOrder(data); setLoading(false); });
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><i className="fa-solid fa-circle-notch fa-spin"></i></div>;

  // Simula log de eventos a partir dos dados do pedido
  const events = [
    { id: 1, time: order?.created_at, type: 'ORDER_CREATED', label: 'Pedido criado e enviado para fila', color: 'var(--accent-1)' },
    { id: 2, time: order?.created_at, type: 'STATUS_QUEUED', label: 'Status → Na Fila (queued)', color: '#94a3b8' },
    order?.status !== 'queued' && { id: 3, time: order?.updated_at || order?.created_at, type: 'PIPELINE_STARTED', label: 'Worker iniciou o processamento', color: 'var(--accent-2)' },
    ['review', 'completed', 'delivered'].includes(order?.status) && { id: 4, time: order?.updated_at, type: 'SCENES_DONE', label: `Cenas geradas: ${order?.scenes_done} de ${order?.scenes_total}`, color: 'var(--accent-4)' },
    order?.status === 'error' && { id: 5, time: order?.updated_at, type: 'ERROR', label: order?.error_message || 'Falha durante o processamento', color: 'var(--accent-error)' },
    ['completed', 'delivered'].includes(order?.status) && { id: 6, time: order?.updated_at, type: 'DELIVERED', label: 'PDF gerado e entregue com sucesso', color: 'var(--accent-4)' },
  ].filter(Boolean);

  const fmt = (iso) => iso ? new Date(iso).toLocaleString('pt-BR') : '—';

  return (
    <>
      <div className="header">
        <div>
          <Link to={`/pedidos/${id}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <i className="fa-solid fa-arrow-left"></i> Voltar para detalhes
          </Link>
          <h1>Log do Pedido #{String(id).slice(0, 8).toUpperCase()}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>
            Status atual: <strong>{order?.status || '—'}</strong>
          </p>
        </div>
      </div>

      <div className="glass" style={{ padding: 28, maxWidth: 700 }}>
        {!order ? (
          <div style={{ color: 'var(--text-secondary)' }}>Pedido não encontrado.</div>
        ) : (
          <>
            {/* Info rápida */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28, padding: '16px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <div><div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>ID</div><div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{order.id.split('-')[0].toUpperCase()}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Criança</div><div style={{ fontWeight: 600 }}>{order.child_name || '—'}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Tema</div><div style={{ fontWeight: 600 }}>{order.theme || '—'}</div></div>
            </div>

            {/* Timeline de eventos */}
            <div style={{ position: 'relative', paddingLeft: 28 }}>
              <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'rgba(0,0,0,0.07)', borderRadius: 2 }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {events.map((ev) => (
                  <div key={ev.id} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: -26, top: 3, width: 12, height: 12, borderRadius: '50%', background: ev.color, border: '2px solid white', boxShadow: `0 0 0 2px ${ev.color}40` }}></div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{fmt(ev.time)}</div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: ev.color, fontFamily: 'monospace', marginBottom: 2 }}>{ev.type}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{ev.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
