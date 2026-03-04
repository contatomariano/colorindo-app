import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function EditarConta() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [deleteModal, setDeleteModal] = useState(false);
    const [addCreditsModal, setAddCreditsModal] = useState({ show: false, amount: '' });
    const [savingCredits, setSavingCredits] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const [form, setForm] = useState({
        name: '',
        email: '',
        plan: 'pro',
        credits: 0,
        custom_projects_quota: 1,
        status: 'active'
    });

    useEffect(() => {
        async function fetchAccount() {
            setFetching(true);
            try {
                const { data, error } = await supabase.from('accounts').select('*').eq('id', id).single();
                if (error) throw error;
                if (data) {
                    setForm({
                        name: data.name || '',
                        email: data.email || '',
                        plan: data.plan || 'pro',
                        credits: data.credits || 0,
                        custom_projects_quota: data.custom_projects_quota || 1,
                        status: data.status || 'active'
                    });
                }
            } catch (err) {
                alert('Erro ao carregar conta: ' + err.message);
                navigate('/admin/contas');
            } finally {
                setFetching(false);
            }
        }
        if (id) fetchAccount();
    }, [id, navigate]);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const { error: accError } = await supabase.from('accounts').update({
                name: form.name,
                email: form.email,
                plan: form.plan,
                custom_projects_quota: parseInt(form.custom_projects_quota) || 1,
                status: form.status,
            }).eq('id', id);

            if (accError) throw accError;

            alert('Conta atualizada com sucesso!');
            navigate('/admin/contas');
        } catch (err) {
            alert('Erro ao atualizar: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (deleteConfirmText !== form.name) {
            alert('Nome da conta não confere. Digite exatamente o nome para excluir.');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.from('accounts').delete().eq('id', id);
            if (error) throw error;
            navigate('/admin/contas');
        } catch (err) {
            alert('Erro ao excluir conta: ' + err.message);
            setLoading(false);
            setDeleteModal(false);
        }
    }

    async function handleAddCredits(e) {
        e.preventDefault();
        const amt = parseInt(addCreditsModal.amount);
        if (!amt || amt <= 0) return;
        setSavingCredits(true);
        try {
            const newTotal = form.credits + amt;
            const { error } = await supabase.from('accounts')
                .update({ credits: newTotal })
                .eq('id', id);
            if (error) throw error;

            setAddCreditsModal({ show: false, amount: '' });
            setForm(prev => ({ ...prev, credits: newTotal }));
            alert(`Foram injetados ${amt} créditos na conta!`);
        } catch (err) {
            alert('Erro ao adicionar fluxos: ' + err.message);
        } finally {
            setSavingCredits(false);
        }
    }

    if (fetching) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24 }}></i>
                <p style={{ marginTop: 12 }}>Carregando dados da conta...</p>
            </div>
        );
    }

    return (
        <>
            <div className="header">
                <div>
                    <Link to="/admin/contas" style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, textDecoration: 'none' }}>
                        <i className="fa-solid fa-arrow-left"></i> Voltar para Contas
                    </Link>
                    <h1>Editar Conta</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 100 }}>

                    <div className="glass" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: 16 }}>
                            <div style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <i className="fa-solid fa-building" style={{ color: 'var(--accent-3)' }}></i> Dados da Conta B2B
                            </div>
                            <select className="form-input" style={{ width: 'auto', background: form.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: form.status === 'active' ? 'var(--accent-4)' : 'var(--accent-error)', fontWeight: 600, border: 'none' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                <option value="active">Ativa</option>
                                <option value="inactive">Inativa</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Nome da Empresa / Cliente</label>
                                <input required className="form-input" style={{ width: '100%', background: '#e2e8f0', border: '1px solid transparent' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>

                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>E-mail Principal</label>
                                <input type="email" required className="form-input" style={{ width: '100%', background: '#e2e8f0', border: '1px solid transparent' }} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Plano Contratado</label>
                                    <select className="form-input" style={{ width: '100%', background: '#e2e8f0', border: '1px solid transparent' }} value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>
                                        <option value="starter">Starter</option>
                                        <option value="pro">Pro</option>
                                        <option value="enterprise">Enterprise</option>
                                        <option value="custom">Personalizado</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Cota de Projetos</label>
                                    <input type="number" min="1" required className="form-input" style={{ width: '100%', background: '#e2e8f0', border: '1px solid transparent' }} value={form.custom_projects_quota} onChange={e => setForm({ ...form, custom_projects_quota: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Saldo de Créditos Atual</label>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <i className="fa-solid fa-coins" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-3)' }}></i>
                                        <input type="text" disabled className="form-input" style={{ width: '100%', paddingLeft: 40, background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)', cursor: 'not-allowed' }} value={form.credits.toLocaleString('pt-BR')} />
                                    </div>
                                    <button type="button" onClick={() => setAddCreditsModal({ show: true, amount: '' })} className="btn btn-secondary" style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: 'var(--accent-4)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                        <i className="fa-solid fa-plus" style={{ marginRight: 6 }}></i>Inserir Créditos
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ position: 'fixed', bottom: 0, right: 0, width: 'calc(100% - 280px)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--glass-border)', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
                    <button type="button" onClick={() => setDeleteModal(true)} className="btn-action" style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-error)', padding: '10px 16px', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fa-solid fa-trash"></i> Excluir Conta
                    </button>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <Link to="/admin/contas" style={{ padding: '12px 24px', borderRadius: 8, fontWeight: 600, fontSize: 15, border: '1px solid var(--glass-border)', color: 'var(--text-primary)', textDecoration: 'none' }}>
                            Cancelar
                        </Link>
                        <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15, fontWeight: 600 }} disabled={loading}>
                            {loading ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Salvando...</> : <><i className="fa-solid fa-check"></i> Salvar Alterações</>}
                        </button>
                    </div>
                </div>
            </form>

            {deleteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="glass" style={{ padding: 32, width: 400, borderRadius: 16 }}>
                        <div style={{ color: 'var(--accent-error)', fontSize: 32, marginBottom: 16 }}><i className="fa-solid fa-triangle-exclamation"></i></div>
                        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Excluir Conta Permanentemente</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                            Esta ação excluirá todos os dados do cliente, projetos e uploads vinculados de forma irreversível! Para confirmar, digite abaixo exatamente o nome da conta: <strong>{form.name}</strong>
                        </p>
                        <input type="text" className="form-input" style={{ width: '100%', marginBottom: 20 }} placeholder="Nome da conta" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button className="btn btn-secondary" onClick={() => setDeleteModal(false)}>Cancelar</button>
                            <button type="button" className="btn" style={{ background: 'var(--accent-error)', color: 'white' }} onClick={handleDelete} disabled={deleteConfirmText !== form.name || loading}>
                                {loading ? 'Excluindo...' : 'Sim, Excluir Conta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Adicionar Créditos */}
            {addCreditsModal.show && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass" style={{ padding: 32, width: 400, borderRadius: 20 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}><i className="fa-solid fa-wallet" style={{ color: 'var(--accent-3)', marginRight: 8 }}></i> Adicionar Créditos</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                            Quantos créditos você quer depositar na conta <strong>{form.name}</strong>?
                        </p>
                        <form onSubmit={handleAddCredits}>
                            <div style={{ marginBottom: 24, position: 'relative' }}>
                                <i className="fa-solid fa-coins" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-3)' }}></i>
                                <input className="form-input" type="number" min="1" required autoFocus value={addCreditsModal.amount} onChange={e => setAddCreditsModal({ ...addCreditsModal, amount: e.target.value })} placeholder="Valor a adicionar" style={{ width: '100%', paddingLeft: 40, fontSize: 18, fontWeight: 700 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }} onClick={() => setAddCreditsModal({ show: false, amount: '' })}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={savingCredits}>
                                    {savingCredits ? 'Processando...' : 'Confirmar Adição'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
