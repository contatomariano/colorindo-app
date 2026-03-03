import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function EditarUsuario() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [form, setForm] = useState({
        name: '',
        email: '',
        role: 'user',
        status: 'active'
    });

    useEffect(() => {
        async function fetchUser() {
            setFetching(true);
            try {
                const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
                if (error) throw error;
                if (data) {
                    setForm({
                        name: data.name || '',
                        email: data.email || '',
                        role: data.role || 'user',
                        status: data.status || 'active'
                    });
                }
            } catch (err) {
                alert('Erro ao carregar usuário: ' + err.message);
                navigate('/admin/usuarios');
            } finally {
                setFetching(false);
            }
        }
        if (id) fetchUser();
    }, [id, navigate]);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('profiles').update({
                name: form.name,
                role: form.role,
                status: form.status,
            }).eq('id', id);

            if (error) throw error;
            navigate('/admin/usuarios');
        } catch (err) {
            alert('Erro ao atualizar usuário: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    if (fetching) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24 }}></i>
                <p style={{ marginTop: 12 }}>Carregando dados do usuário...</p>
            </div>
        );
    }

    return (
        <>
            <div className="header">
                <div>
                    <Link to="/admin/usuarios" style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, textDecoration: 'none' }}>
                        <i className="fa-solid fa-arrow-left"></i> Voltar para Usuários
                    </Link>
                    <h1>Editar Usuário</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 100 }}>

                    <div className="glass" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: 16 }}>
                            <div style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <i className="fa-solid fa-user-pen" style={{ color: 'var(--accent-3)' }}></i> Dados do Perfil
                            </div>
                            <select className="form-input" style={{ width: 'auto', background: form.status === 'active' ? 'rgba(16,185,129,0.1)' : form.status === 'pending' ? 'rgba(99,102,241,0.1)' : 'rgba(239,68,68,0.1)', color: form.status === 'active' ? 'var(--accent-4)' : form.status === 'pending' ? 'var(--accent-1)' : 'var(--accent-error)', fontWeight: 600, border: 'none' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                <option value="active">Ativo</option>
                                <option value="pending">Pendente</option>
                                <option value="inactive">Inativo</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Nome Completo</label>
                                <input required className="form-input" style={{ width: '100%', background: '#e2e8f0', border: '1px solid transparent' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>

                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>E-mail (Acesso)</label>
                                <input disabled className="form-input" style={{ width: '100%', background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)', cursor: 'not-allowed' }} value={form.email} title="O e-mail de acesso não pode ser alterado" />
                            </div>

                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Função no Sistema</label>
                                <select className="form-input" style={{ width: '100%', background: '#e2e8f0', border: '1px solid transparent' }} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    <option value="admin">Administrador (Total)</option>
                                    <option value="manager">Gerente (Projetos & Temas)</option>
                                    <option value="user">Revisor(a)</option>
                                    <option value="viewer">Agente / Cliente (Somente Leitura)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                </div>

                <div style={{ position: 'fixed', bottom: 0, right: 0, width: 'calc(100% - 280px)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--glass-border)', padding: '16px 40px', display: 'flex', justifyContent: 'flex-end', gap: 16, zIndex: 100 }}>
                    <Link to="/admin/usuarios" style={{ padding: '12px 24px', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
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
