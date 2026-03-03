import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function NovoPedidoLote() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const lines = csvText
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (!lines.length) return;

    setLoading(true);
    try {
      let created = 0;
      for (const line of lines) {
        const [childName, age, theme] = line.split(',').map((x) => (x || '').trim());
        const payload = {
          project_id: projectId || null,
          child_name: childName || 'Sem nome',
          child_age: age ? Number(age) : null,
          theme: theme || 'Tema padrão',
          scenes_total: 12,
          status: 'queued'
        };
        const { error } = await supabase.from('orders').insert([payload]);
        if (!error) created += 1;
      }
      setMessage(`${created} pedidos enviados para o pipeline.`);
      setTimeout(() => navigate('/pedidos'), 800);
    } catch (error) {
      setMessage(`Erro no envio em lote: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="header">
        <div>
          <Link to="/pedidos" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14 }}>
            <i className="fa-solid fa-arrow-left"></i> Voltar
          </Link>
          <h1 style={{ marginTop: 8 }}>Novo Pedido em Lote</h1>
        </div>
      </div>
      <form className="glass" style={{ padding: 24, maxWidth: 900 }} onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Projeto (ID opcional)</label>
          <input
            className="form-input"
            style={{ width: '100%' }}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="UUID do projeto"
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">CSV simplificado (nome,idade,tema por linha)</label>
          <textarea
            className="form-input"
            style={{ width: '100%', minHeight: 220, resize: 'vertical' }}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'Lucas,6,Heróis da Natureza\nSofia,8,Princesas do Cerrado'}
          />
        </div>
        {message && <div style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>{message}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Enviando...</> : <><i className="fa-solid fa-file-csv"></i> Enviar Lote</>}
        </button>
      </form>
    </>
  );
}
