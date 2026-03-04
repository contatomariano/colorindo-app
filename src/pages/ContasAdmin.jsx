import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount } from '../context/AccountContext';

const PLAN_CONFIG = {
    starter: { label: 'Starter', color: 'var(--accent-3)', icon: 'fa-leaf' },
    pro: { label: 'Pro', color: 'var(--accent-1)', icon: 'fa-star' },
    enterprise: { label: 'Enterprise', color: 'var(--accent-4)', icon: 'fa-crown' },
    custom: { label: 'Personalizado', color: 'var(--text-secondary)', icon: 'fa-cube' },
};

const getInitials = (name = '') => {
    const parts = name.trim().split(' ');
    return parts.length === 1
        ? parts[0].substring(0, 2).toUpperCase()
        : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AVATAR_COLORS = ['var(--accent-1)', 'var(--accent-2)', 'var(--accent-3)', 'var(--accent-4)', 'var(--accent-5)'];

export default function ContasAdmin() {
    const navigate = useNavigate();
    const { setSelectedAccountId } = useAccount();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [addCreditsModal, setAddCreditsModal] = useState({ show: false, account: null, amount: '' });
    const [saving, setSaving] = useState(false);

    // Modal state
    const [form, setForm] = useState({
        name: '',
        email: '',
        plan: 'pro',
        credits: 1000,
        custom_projects_quota: 10,
        status: 'active'
    });

    useEffect(() => { fetchAccounts(); }, []);

    async function fetchAccounts() {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('accounts').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setAccounts(data || []);
        } catch (err) {
            console.error('Erro ao buscar contas:', err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveAccount(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const { data, error } = await supabase.from('accounts').insert([{
                name: form.name,
                email: form.email,
                plan: form.plan,
                credits: parseInt(form.credits) || 0,
                custom_projects_quota: parseInt(form.custom_projects_quota) || 1,
                status: form.status
            }]).select();

            if (error) throw error;

            setShowModal(false);
            setForm({ name: '', email: '', plan: 'pro', credits: 1000, custom_projects_quota: 10, status: 'active' });
            fetchAccounts();
            alert('Conta criada com sucesso!');
        } catch (err) {
            alert('Erro ao criar conta: ' + err.message);
            console.error(err);
        } finally {
            setSaving(false);
        }
    }

    async function handleAddCredits(e) {
        e.preventDefault();
        const amt = parseInt(addCreditsModal.amount);
        if (!amt || amt <= 0) return;
        setSaving(true);
        try {
            const acc = addCreditsModal.account;
            const { error } = await supabase.from('accounts')
                .update({ credits: acc.credits + amt })
                .eq('id', acc.id);
            if (error) throw error;

            setAddCreditsModal({ show: false, account: null, amount: '' });
            fetchAccounts();
            alert(`Foram injetados ${amt} créditos na conta!`);
        } catch (err) {
            alert('Erro ao adicionar fluxos: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    const handleAccessAccount = (id) => {
        setSelectedAccountId(id);
        navigate('/pedidos');
    }

    return (
        <>
            <div className="header">
                <div>
                    <h1>Gestão de Contas e Clientes</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>
                        Controle de planos, limites de projetos e saldo de créditos (B2B).
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <i className="fa-solid fa-plus"></i> Nova Conta
                </button>
            </div>

            <div className="glass" style={{ overflowX: 'auto' }}>
                <table className="table-container">
                    <thead>
                        <tr>
                            <th>Nome da Conta</th>
                            <th>Plano</th>
                            <th>Cota de Projetos</th>
                            <th>Saldo de Créditos</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }}><i className="fa-solid fa-circle-notch fa-spin"></i> Carregando...</td></tr>
                        ) : accounts.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Nenhuma conta cadastrada. Use "Nova Conta".</td></tr>
                        ) : accounts.map((account, idx) => {
                            const planConfig = PLAN_CONFIG[account.plan] || PLAN_CONFIG.custom;
                            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                            const lowCredits = account.credits < 100;

                            return (
                                <tr key={account.id}>
                                    <td style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                            {getInitials(account.name)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{account.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>ID: {account.id.split('-')[0]}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: planConfig.color, fontWeight: 600, fontSize: 14 }}>
                                            <i className={`fa-solid ${planConfig.icon}`}></i> {planConfig.label}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                                            Máx. {account.custom_projects_quota} Projetos
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: lowCredits ? 'var(--accent-error)' : 'var(--accent-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {account.credits.toLocaleString('pt-BR')} <i className="fa-solid fa-coins"></i>
                                            </div>
                                            {lowCredits && <span style={{ fontSize: 11, color: 'var(--accent-error)', fontWeight: 600 }}>Créditos Baixos!</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${account.status === 'active' ? 'status-success' : 'status-error'}`}>
                                            {account.status === 'active' ? 'Ativa' : 'Inativa'}
                                        </span>
                                    </td>
                                    <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <button className="btn btn-secondary" style={{ padding: '6px 16px', fontSize: 13, background: 'rgba(99, 102, 241, 0.08)', color: 'var(--accent-1)', border: '1px solid rgba(99, 102, 241, 0.2)' }} onClick={() => handleAccessAccount(account.id)}>
                                            <i className="fa-solid fa-arrow-right-to-bracket"></i> Acessar
                                        </button>
                                        <Link to={`/admin/contas/${account.id}/editar`} className="btn-action" title="Editar Conta" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.04)', borderRadius: 8, border: '1px solid var(--glass-border)', padding: '6px 10px', color: 'var(--text-secondary)' }}>
                                            <i className="fa-solid fa-pen" style={{ fontSize: 13 }}></i>
                                        </Link>
                                        <button className="btn-action" title="Adicionar Créditos" onClick={() => setAddCreditsModal({ show: true, account, amount: '' })} style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 8, border: '1px solid var(--glass-border)', padding: '6px 10px', color: 'var(--accent-3)' }}>
                                            <i className="fa-solid fa-wallet" style={{ fontSize: 13 }}></i>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal Nova Conta */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass" style={{ padding: 32, width: 500, borderRadius: 20 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Cadastrar Nova Conta</h2>

                        <form onSubmit={handleSaveAccount}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Nome da Empresa / Cliente</label>
                                <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Escola Fundamental BR" style={{ width: '100%' }} />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>E-mail de Contato Principal</label>
                                <input className="form-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contato@empresa.com" style={{ width: '100%' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Plano Contratado</label>
                                    <select className="form-input" value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} style={{ width: '100%' }}>
                                        <option value="starter">Starter</option>
                                        <option value="pro">Pro</option>
                                        <option value="enterprise">Enterprise</option>
                                        <option value="custom">Personalizado</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Cota de Projetos</label>
                                    <input className="form-input" type="number" min="1" required value={form.custom_projects_quota} onChange={e => setForm({ ...form, custom_projects_quota: e.target.value })} style={{ width: '100%' }} />
                                </div>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Saldo de Créditos Inicial</label>
                                <div style={{ position: 'relative' }}>
                                    <i className="fa-solid fa-coins" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-3)' }}></i>
                                    <input className="form-input" type="number" min="0" required value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })} style={{ width: '100%', paddingLeft: 40 }} />
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>O cliente consumirá este saldo ao realizar as gerações de pipeline.</p>
                            </div>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }} onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Criando...</> : <><i className="fa-solid fa-check"></i> Cadastrar Conta</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal Adicionar Créditos */}
            {addCreditsModal.show && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass" style={{ padding: 32, width: 400, borderRadius: 20 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}><i className="fa-solid fa-wallet" style={{ color: 'var(--accent-3)', marginRight: 8 }}></i> Adicionar Créditos</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                            Quantos créditos você quer depositar na conta <strong>{addCreditsModal.account?.name}</strong>?
                        </p>
                        <form onSubmit={handleAddCredits}>
                            <div style={{ marginBottom: 24, position: 'relative' }}>
                                <i className="fa-solid fa-coins" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-3)' }}></i>
                                <input className="form-input" type="number" min="1" required autoFocus value={addCreditsModal.amount} onChange={e => setAddCreditsModal({ ...addCreditsModal, amount: e.target.value })} placeholder="Valor" style={{ width: '100%', paddingLeft: 40, fontSize: 18, fontWeight: 700 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }} onClick={() => setAddCreditsModal({ show: false, account: null, amount: '' })}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Processando...' : 'Confirmar Adição'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
