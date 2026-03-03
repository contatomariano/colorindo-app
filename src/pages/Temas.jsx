import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAccount } from '../context/AccountContext';

const GRADIENTS = [
    'linear-gradient(to bottom, transparent, rgba(255,255,255,0.85)), linear-gradient(135deg, #dbeafe, #ede9fe)',
    'linear-gradient(to bottom, transparent, rgba(255,255,255,0.85)), linear-gradient(135deg, #d1fae5, #a7f3d0)',
    'linear-gradient(to bottom, transparent, rgba(255,255,255,0.85)), linear-gradient(135deg, #fce7f3, #fbcfe8)',
    'linear-gradient(to bottom, transparent, rgba(255,255,255,0.85)), linear-gradient(135deg, #fef3c7, #fed7aa)',
];

export default function Temas() {
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { account } = useAccount();
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        // Busca todos os temas ativos disponíveis para o usuário
        supabase.from('themes').select('*').eq('status', 'active').order('name').then(({ data }) => {
            setThemes(data || []);
            setLoading(false);
        });
    }, []);

    const ThemeCard = ({ theme, idx }) => (
        <div className="glass" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
            {/* Capa */}
            <div style={{ height: 160, background: theme.cover_url ? `url(${theme.cover_url}) center/cover` : GRADIENTS[idx % GRADIENTS.length], position: 'relative' }}></div>
            {/* Conteúdo */}
            <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="theme-title" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{theme.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5, flex: 1 }}>{theme.description || 'Aventura temática para criança protagonista.'}</div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: '1px dashed var(--glass-border)' }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Cenas Padrão</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}><i className="fa-regular fa-image" style={{ color: 'var(--text-secondary)', marginRight: 4 }}></i>{theme.scenes_count || 10} págs</div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button className="btn btn-primary" onClick={() => navigate(`/pedidos/novo?theme=${theme.id}`)} style={{ fontSize: 13, padding: '8px 16px' }}>
                        <i className="fa-solid fa-wand-magic-sparkles"></i> Gerar Pedido
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="header">
                <div>
                    <h1>Meus Temas</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>
                        {account ? <>Temas para a criação de pedidos da <strong>{account.name}</strong></> : 'Explore a nossa biblioteca de temas disponíveis para gerar histórias exclusivas.'}
                    </p>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24 }}></i></div>
            ) : (
                <>
                    {/* Meus Temas */}
                    {themes.length === 0 ? (
                        <div className="glass" style={{ padding: 48, textAlign: 'center', marginBottom: 40 }}>
                            <i className="fa-solid fa-palette" style={{ fontSize: 40, color: 'var(--text-secondary)', marginBottom: 16, display: 'block', opacity: 0.5 }}></i>
                            <p style={{ color: 'var(--text-secondary)' }}>Nenhum tema foi cadastrado globalmente ou está disponível.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24, marginBottom: 48 }}>
                            {themes.map((t, i) => <ThemeCard key={t.id} theme={t} idx={i} />)}
                        </div>
                    )}
                </>
            )}
        </>
    );
}
