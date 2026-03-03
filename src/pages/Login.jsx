import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const INPUT_WRAPPER = {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, padding: '0 16px', transition: 'border-color 0.2s'
};

const INPUT_STYLE = {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    fontFamily: 'Outfit', fontSize: 15, padding: '14px 0', color: 'white'
};

export default function Login() {
    const { user, signIn, signUp, loading: authLoading } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    if (authLoading) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 32, color: 'rgba(255,255,255,0.7)' }}></i>
            </div>
        );
    }

    if (user) return <Navigate to="/" replace />;

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (isSignUp) {
                const { data, error: err } = await signUp(email, password, name);
                if (err) throw err;
                if (data?.session) {
                    // Auto-logged in (email confirmation disabled)
                } else {
                    setSuccessMsg('Conta criada! Verifique seu email para confirmar o cadastro.');
                }
            } else {
                const { error: err } = await signIn(email, password);
                if (err) throw err;
            }
        } catch (err) {
            const msg = err.message;
            if (msg === 'Invalid login credentials') setError('Email ou senha incorretos.');
            else if (msg?.includes('already registered')) setError('Este email já está cadastrado. Faça login.');
            else setError(msg || 'Erro ao processar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    const tabStyle = (active) => ({
        flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
        fontFamily: 'Outfit', fontSize: 14, fontWeight: 600, transition: '0.2s',
        background: active ? 'rgba(99,102,241,0.3)' : 'transparent',
        color: active ? 'white' : 'rgba(255,255,255,0.4)',
        boxShadow: active ? '0 2px 8px rgba(99,102,241,0.2)' : 'none'
    });

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden', zIndex: 9999 }}>
            {/* Decorative blobs */}
            <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', top: '-80px', right: '-60px', filter: 'blur(80px)' }} />
            <div style={{ position: 'absolute', width: 450, height: 450, borderRadius: '50%', background: 'rgba(236,72,153,0.08)', bottom: '-180px', left: '-120px', filter: 'blur(100px)' }} />
            <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', top: '40%', left: '15%', filter: 'blur(60px)' }} />

            {/* Card */}
            <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '48px 40px', width: '100%', maxWidth: 440, zIndex: 1, boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
                        <i className="fa-solid fa-shapes" style={{ fontSize: 24, color: 'white' }}></i>
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white', letterSpacing: '-0.5px', margin: 0 }}>Colorindo Engine</h1>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 8 }}>
                        {isSignUp ? 'Crie sua conta para começar' : 'Acesse o painel de controle'}
                    </p>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, marginBottom: 28 }}>
                    <button type="button" onClick={() => { setIsSignUp(false); setError(''); setSuccessMsg(''); }} style={tabStyle(!isSignUp)}>Entrar</button>
                    <button type="button" onClick={() => { setIsSignUp(true); setError(''); setSuccessMsg(''); }} style={tabStyle(isSignUp)}>Criar Conta</button>
                </div>

                {/* Messages */}
                {error && (
                    <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, marginBottom: 20, color: '#fca5a5', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="fa-solid fa-circle-exclamation"></i> {error}
                    </div>
                )}
                {successMsg && (
                    <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, marginBottom: 20, color: '#6ee7b7', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="fa-solid fa-circle-check"></i> {successMsg}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {isSignUp && (
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8 }}>Nome completo</label>
                            <div style={INPUT_WRAPPER}>
                                <i className="fa-solid fa-user" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}></i>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" style={INPUT_STYLE} required />
                            </div>
                        </div>
                    )}
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8 }}>Email</label>
                        <div style={INPUT_WRAPPER}>
                            <i className="fa-solid fa-envelope" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}></i>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" style={INPUT_STYLE} required />
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8 }}>Senha</label>
                        <div style={INPUT_WRAPPER}>
                            <i className="fa-solid fa-lock" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}></i>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isSignUp ? 'Mínimo 6 caracteres' : '••••••••'} style={INPUT_STYLE} required minLength={6} />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} style={{ marginTop: 8, width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontFamily: 'Outfit', fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
                        {loading ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Processando...</> : isSignUp ? <><i className="fa-solid fa-user-plus"></i> Criar Conta</> : <><i className="fa-solid fa-right-to-bracket"></i> Entrar</>}
                    </button>
                </form>

                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 28 }}>
                    Plataforma protegida com criptografia end-to-end
                </p>
            </div>
        </div>
    );
}
