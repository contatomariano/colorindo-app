import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function PedidoRevisao() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from('orders').select('*').eq('id', id).single()
      .then(({ data }) => { setOrder(data); setLoading(false); });
  }, [id]);

  async function handleApprove() {
    setSaving(true);
    await supabase.from('orders').update({ status: 'completed' }).eq('id', id);
    setOrder(prev => ({ ...prev, status: 'completed' }));
    setSaving(false);
  }

  async function handleReject() {
    setSaving(true);
    await supabase.from('orders').update({ status: 'queued', scenes_done: 0 }).eq('id', id);
    setOrder(prev => ({ ...prev, status: 'queued', scenes_done: 0 }));
    setSaving(false);
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><i className="fa-solid fa-circle-notch fa-spin"></i></div>;
  if (!order) return <div style={{ padding: 30 }}>Pedido não encontrado.</div>;

  const isDone = ['completed', 'delivered'].includes(order.status);

  return (
    <>
      <div className="header">
        <div>
          <Link to={`/pedidos/${id}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <i className="fa-solid fa-arrow-left"></i> Voltar para detalhes
          </Link>
          <h1>Revisão do Pedido #{String(order.id).slice(0, 8).toUpperCase()}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>
            {order.child_name} · {order.theme || 'Sem tema'} · Status: <strong>{order.status}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn" onClick={handleReject} disabled={saving || isDone}
            style={{ border: '1px solid rgba(239,68,68,0.4)', color: 'var(--accent-error)', background: 'rgba(239,68,68,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-rotate-left"></i>
            {saving ? 'Aguarde…' : 'Reprovar / Refazer'}
          </button>
          <button className="btn btn-primary" onClick={handleApprove} disabled={saving || isDone}
            style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isDone ? 0.5 : 1 }}>
            <i className={saving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'}></i>
            {saving ? 'Processando…' : isDone ? 'Aprovado ✓' : 'Aprovar'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, maxWidth: 1100 }}>
        {/* Área principal — preview */}
        <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--glass-border)', paddingBottom: 12 }}>
            <i className="fa-solid fa-image" style={{ color: 'var(--accent-1)' }}></i> Preview das Cenas Geradas
          </div>
          {order.child_photo_url ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {Array.from({ length: Math.max(1, order.scenes_done || 0) }).map((_, i) => (
                <div key={i} style={{ aspectRatio: '3/4', borderRadius: 12, overflow: 'hidden', border: '2px solid var(--glass-border)', position: 'relative' }}>
                  <img src={order.child_photo_url} alt={`Cena ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', padding: '6px 10px', fontSize: 11, color: 'white', fontWeight: 600 }}>
                    {i === 0 ? 'Capa' : `Cena ${i}`}
                  </div>
                </div>
              ))}
            </div>
          ) : order.scenes_done > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {Array.from({ length: order.scenes_done }).map((_, i) => (
                <div key={i} style={{ aspectRatio: '3/4', borderRadius: 12, background: `linear-gradient(135deg, hsl(${i * 40}, 70%, 88%), hsl(${i * 40 + 30}, 70%, 78%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {i === 0 ? 'Capa' : `Cena ${i}`}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <i className="fa-solid fa-hourglass-half" style={{ fontSize: 32, marginBottom: 12, display: 'block', opacity: 0.5 }}></i>
              Nenhuma cena gerada ainda. O pedido está em status <strong>{order.status}</strong>.
            </div>
          )}
        </div>

        {/* Painel lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Dados */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-child"></i> Dados da Criança
            </div>
            {[['Nome', order.child_name || '—'], ['Idade', order.child_age ? `${order.child_age} anos` : '—'], ['Gênero', order.gender === 'M' ? 'Masculino' : order.gender === 'F' ? 'Feminino' : '—'], ['Tema', order.theme || '—'], ['Cenas', `${order.scenes_done ?? 0}/${order.scenes_total ?? 0}`]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--glass-border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Status da Revisão */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-circle-info"></i> Status
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 10, background: isDone ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.08)', border: `1px solid ${isDone ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`, textAlign: 'center' }}>
              <i className={`fa-solid ${isDone ? 'fa-circle-check' : 'fa-eye'}`} style={{ color: isDone ? 'var(--accent-4)' : 'var(--accent-1)', fontSize: 24, marginBottom: 8, display: 'block' }}></i>
              <div style={{ fontWeight: 700, color: isDone ? 'var(--accent-4)' : 'var(--accent-1)' }}>
                {isDone ? 'Revisão Aprovada' : 'Aguardando Revisão'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
