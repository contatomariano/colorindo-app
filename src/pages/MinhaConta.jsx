import { useState } from 'react';

export default function MinhaConta() {
    const [profile, setProfile] = useState({
        name: 'Fernando Silva',
        email: 'fernando@exemplo.com.br',
        phone: '(11) 99999-9999',
        role: 'Administrador',
    });
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        await new Promise(r => setTimeout(r, 800));
        setMsg('Dados salvos com sucesso!');
        setSaving(false);
        setTimeout(() => setMsg(''), 3000);
    };

    const getInitials = (name) => {
        const p = name.split(' ');
        return p.length === 1 ? p[0].substring(0, 1).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
    };

    return (
        <>
            <div className="header">
                <div>
                    <h1>Minha Conta</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>Gerencie suas informações pessoais e segurança.</p>
                </div>
            </div>

            {/* Profile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-1), var(--accent-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'white', fontWeight: 700, position: 'relative', boxShadow: '0 8px 24px rgba(99,102,241,0.25)', flexShrink: 0 }}>
                    {getInitials(profile.name)}
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: '50%', background: 'white', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', border: '2px solid var(--bg-color)' }}>
                        <i className="fa-solid fa-camera"></i>
                    </div>
                </div>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>{profile.name}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{profile.role} · Membro desde Jan 2024</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <span style={{ padding: '4px 12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>E-mail Verificado</span>
                        <span style={{ padding: '4px 12px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Sessão Ativa</span>
                    </div>
                </div>
            </div>

            {msg && (
                <div style={{ padding: '12px 20px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 12, marginBottom: 20, border: '1px solid rgba(16,185,129,0.2)', fontWeight: 600 }}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: 8 }}></i>{msg}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Dados Pessoais */}
                <div className="glass" style={{ padding: 28 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="fa-solid fa-user" style={{ color: 'var(--accent-1)' }}></i> Dados Pessoais
                    </div>
                    <form onSubmit={handleProfileSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Nome Completo</label>
                                <input className="form-input" style={{ width: '100%' }} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>E-mail</label>
                                <input className="form-input" style={{ width: '100%', opacity: 0.7 }} value={profile.email} readOnly />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>WhatsApp</label>
                                <input className="form-input" style={{ width: '100%' }} value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Cargo</label>
                                <input className="form-input" style={{ width: '100%' }} value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Salvando...</> : <><i className="fa-solid fa-floppy-disk"></i> Salvar Dados</>}
                        </button>
                    </form>
                </div>

                {/* Segurança */}
                <div className="glass" style={{ padding: 28 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="fa-solid fa-shield-halved" style={{ color: 'var(--accent-3)' }}></i> Segurança
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Senha Atual</label>
                        <input type="password" className="form-input" style={{ width: '100%' }} placeholder="••••••••" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Nova Senha</label>
                            <input type="password" className="form-input" style={{ width: '100%' }} placeholder="Min. 8 caracteres" value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Confirmar Senha</label>
                            <input type="password" className="form-input" style={{ width: '100%' }} placeholder="••••••••" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} />
                        </div>
                    </div>
                    <button className="btn" style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
                        <i className="fa-solid fa-key"></i> Alterar Senha
                    </button>

                    {/* API Key */}
                    <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fa-solid fa-code" style={{ color: 'var(--accent-2)' }}></i> Chave de API
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.04)', border: '1px dashed var(--glass-border)', padding: 16, borderRadius: 10, fontFamily: 'monospace', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>ce-api-••••••••••••••••</span>
                            <button style={{ background: 'none', border: 'none', color: 'var(--accent-1)', cursor: 'pointer', fontSize: 14 }} title="Copiar">
                                <i className="fa-solid fa-copy"></i>
                            </button>
                        </div>
                        <button className="btn" style={{ marginTop: 12, background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-error)', fontSize: 13 }}>
                            <i className="fa-solid fa-rotate"></i> Gerar Nova Chave
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
