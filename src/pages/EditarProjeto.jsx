import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAccount } from '../context/AccountContext';

export default function EditarProjeto() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { selectedAccountId } = useAccount();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Opcional: extrair o cliente da string de description se estiver no formato "Cliente: XYZ. Resto da descricao"
    const [form, setForm] = useState({
        name: '',
        client: '',
        description: '',
        status: 'active',
    });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    useEffect(() => {
        async function fetchProject() {
            setFetching(true);
            try {
                const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
                if (error) throw error;
                if (data) {
                    // Tenta adivinhar o cliente a partir da descrição antiga migrada (Cliente: Nome. Notas)
                    let parsedClient = '';
                    let parsedDesc = data.description || '';
                    if (parsedDesc.startsWith('Cliente: ')) {
                        const parts = parsedDesc.split('. ');
                        parsedClient = parts[0].replace('Cliente: ', '');
                        parsedDesc = parts.slice(1).join('. ');
                    } else if (parsedDesc && !parsedDesc.includes('. ')) {
                        // Se só tem uma linha, talvez seja só o nome do cliente guardado lá
                        // Deixar a descrição inteira se não tiver o prefixo explícito
                    }

                    setForm({
                        name: data.name || '',
                        client: parsedClient,
                        description: parsedDesc,
                        status: data.status || 'active',
                    });
                }
            } catch (err) {
                alert('Erro ao carregar projeto: ' + err.message);
                navigate('/projetos');
            } finally {
                setFetching(false);
            }
        }
        if (id) fetchProject();
    }, [id, navigate]);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('projects').update({
                name: form.name,
                description: form.description ? `${form.client ? `Cliente: ${form.client}. ` : ''}${form.description}` : form.client || null,
                status: form.status,
            }).eq('id', id);

            if (error) throw error;
            navigate('/projetos');
        } catch (err) {
            alert('Erro ao atualizar projeto: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    if (fetching) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24 }}></i>
                <p style={{ marginTop: 12 }}>Carregando dados do projeto...</p>
            </div>
        );
    }

    return (
        <>
            <div className="header">
                <div>
                    <Link to="/projetos" style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, textDecoration: 'none' }}>
                        <i className="fa-solid fa-arrow-left"></i> Voltar para Projetos
                    </Link>
                    <h1>Editar Projeto</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 100 }}>

                    {/* Detalhes do Projeto */}
                    <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: 12 }}>
                            <div style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <i className="fa-solid fa-folder-open" style={{ color: 'var(--accent-1)' }}></i> Detalhes do Projeto
                            </div>
                            <select className="form-input" style={{ width: 'auto', background: form.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.06)', color: form.status === 'active' ? 'var(--accent-4)' : 'var(--text-secondary)', fontWeight: 600, border: 'none' }} value={form.status} onChange={e => set('status', e.target.value)}>
                                <option value="active">ATIVO</option>
                                <option value="paused">PAUSADO</option>
                                <option value="completed">CONCLUÍDO</option>
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Nome do Projeto</label>
                                <input required className="form-input" style={{ width: '100%', background: '#e2e8f0', border: '1px solid transparent' }} placeholder="Ex: Escola Estadual Machado de Assis" value={form.name} onChange={e => set('name', e.target.value)} />
                            </div>
                            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Cliente / Patrocinador</label>
                                <input className="form-input" style={{ width: '100%', background: '#e2e8f0', border: '1px solid transparent' }} placeholder="Ex: Prefeitura de São Paulo" value={form.client} onChange={e => set('client', e.target.value)} />
                            </div>
                            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Descrição <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>(Opcional)</span></label>
                                <textarea className="form-input" style={{ width: '100%', background: '#e2e8f0', border: '1px solid transparent', height: 90, resize: 'vertical' }} placeholder="Notas sobre a entrega, faturamento, etc..." value={form.description} onChange={e => set('description', e.target.value)} />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Bottom Bar Fixa */}
                <div style={{ position: 'fixed', bottom: 0, right: 0, width: 'calc(100% - 280px)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--glass-border)', padding: '16px 40px', display: 'flex', justifyContent: 'flex-end', gap: 16, zIndex: 100 }}>
                    <Link to="/projetos" style={{ padding: '12px 24px', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        Cancelar
                    </Link>
                    <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15, fontWeight: 600 }} disabled={loading}>
                        {loading ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Salvando...</> : <><i className="fa-solid fa-check"></i> Salvar Alterações</>}
                    </button>
                </div>
            </form>
        </>
    );
}
