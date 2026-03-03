import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ROLE_CONFIG = {
    admin: { label: 'Administrador', color: 'var(--accent-3)', bg: 'rgba(236,72,153,0.1)' },
    manager: { label: 'Gerente', color: 'var(--accent-1)', bg: 'rgba(99,102,241,0.1)' },
    user: { label: 'Revisor(a)', color: 'var(--accent-2)', bg: 'rgba(139,92,246,0.1)' },
    viewer: { label: 'Agente / Cliente', color: 'var(--text-secondary)', bg: 'rgba(148,163,184,0.1)' },
};

const getInitials = (name = '') => {
    const parts = name.split(' ');
    return parts.length === 1
        ? parts[0].substring(0, 2).toUpperCase()
        : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AVATAR_COLORS = ['var(--accent-3)', 'var(--accent-1)', 'var(--accent-2)', 'var(--accent-4)', 'var(--accent-5)'];

export default function Usuarios() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', role: 'user' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchUsers(); }, []);

    async function fetchUsers() {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('profiles').select('*').order('name');
            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function deleteUser(id) {
        if (!confirm('Tem certeza que deseja excluir permanentemente este usuário?')) return;
        try {
            const { data, error } = await supabase.functions.invoke('admin-manage-users', {
                body: { action: 'delete', userId: id }
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            fetchUsers();
        } catch (err) {
            alert('Erro ao excluir usuário: ' + err.message);
        }
    }

    async function handleInvite(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const { data, error } = await supabase.functions.invoke('admin-manage-users', {
                body: {
                    action: 'invite',
                    email: form.email,
                    password: 'Mudar@123',
                    name: form.name,
                    role: form.role
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            setShowModal(false);
            setForm({ name: '', email: '', role: 'user' });
            fetchUsers();
            alert('Usuário criado com sucesso. A senha temporária é Mudar@123');
        } catch (err) {
            alert('Erro ao criar usuário: ' + err.message);
            console.error(err);
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className="header">
                <div>
                    <h1>Usuários</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>
                        Controle quem pode administrar, operar ou apenas visualizar PDFs gerados.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <i className="fa-solid fa-user-plus"></i> Convidar Usuário
                </button>
            </div>

            <div className="glass" style={{ overflowX: 'auto' }}>
                <table className="table-container">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Função (Role)</th>
                            <th>Status</th>
                            <th>Último Acesso</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }}><i className="fa-solid fa-circle-notch fa-spin"></i> Carregando...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Nenhum usuário ainda. Use "Convidar Usuário".</td></tr>
                        ) : users.map((user, idx) => {
                            const role = ROLE_CONFIG[user.role] || ROLE_CONFIG.viewer;
                            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                            return (
                                <tr key={user.id}>
                                    <td style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                            {getInitials(user.name)}
                                        </div>
                                        {user.name}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                                    <td>
                                        <span style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: role.bg, color: role.color }}>
                                            {role.label}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${user.status === 'active' ? 'status-success' : user.status === 'pending' ? 'status-processing' : 'status-error'}`}>
                                            {user.status === 'active' ? 'Ativo' : user.status === 'pending' ? 'Pendente' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                        {user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : '—'}
                                    </td>
                                    <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <Link to={`/admin/usuarios/${user.id}/editar`} className="btn-action" title="Editar Usuário" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.04)', borderRadius: 8, border: '1px solid var(--glass-border)', padding: '6px 10px', color: 'var(--text-secondary)' }}>
                                            <i className="fa-solid fa-pen" style={{ fontSize: 13 }}></i>
                                        </Link>
                                        <button onClick={() => deleteUser(user.id)} className="btn-action" title="Excluir Usuário" style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-error)', padding: '6px 10px' }}>
                                            <i className="fa-solid fa-trash" style={{ fontSize: 13 }}></i>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal de Convite */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass" style={{ padding: 32, width: 480, borderRadius: 20 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Convidar Usuário</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>O usuário será criado com a senha provisória <strong>Mudar@123</strong>.</p>
                        <form onSubmit={handleInvite}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Nome Completo</label>
                                <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Maria Silva" style={{ width: '100%' }} />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>E-mail</label>
                                <input className="form-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="usuario@empresa.com" style={{ width: '100%' }} />
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Função</label>
                                <select className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ width: '100%' }}>
                                    <option value="admin">Administrador</option>
                                    <option value="manager">Gerente</option>
                                    <option value="user">Revisor(a)</option>
                                    <option value="viewer">Agente / Cliente</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }} onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Salvando...</> : <><i className="fa-solid fa-paper-plane"></i> Enviar Convite</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
