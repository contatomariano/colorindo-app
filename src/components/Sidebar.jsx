import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ mobileOpen, closeMobile }) {
    const { profile, isAdmin, signOut } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleTheme = () => { document.body.classList.toggle('dark-theme'); };

    const displayName = profile?.name || profile?.email || 'Usuário';
    const initials = (() => {
        if (!displayName) return '??';
        const parts = displayName.trim().split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    })();

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
            <div className="mobile-close-btn" onClick={closeMobile}>
                <i className="fa-solid fa-xmark"></i>
            </div>

            <div className="sidebar-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
                <i className="fa-solid fa-chevron-left"></i>
            </div>

            <div className="logo">
                <i className="fa-solid fa-shapes"></i> <span>Colorindo Engine</span>
            </div>

            <ul className="nav-menu">
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 0 2px 12px' }}>Usuário</div>

                <NavLink to="/pedidos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <i className="fa-solid fa-box-open"></i> <span>Pedidos</span>
                </NavLink>

                <NavLink to="/temas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <i className="fa-solid fa-palette"></i> <span>Temas</span>
                </NavLink>

                {isAdmin && (
                    <>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '14px 0 2px 12px' }}>Admin</div>

                        <NavLink to="/projetos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <i className="fa-regular fa-folder-open"></i> <span>Projetos</span>
                        </NavLink>

                        <NavLink to="/admin/temas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <i className="fa-solid fa-book-open"></i> <span>Biblioteca de Temas</span>
                        </NavLink>

                        <NavLink to="/admin/pipeline" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <i className="fa-solid fa-images"></i> <span>Pipeline</span>
                        </NavLink>

                        <NavLink to="/admin/prompts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <i className="fa-solid fa-terminal"></i> <span>Master Prompts</span>
                        </NavLink>

                        <NavLink to="/admin/usuarios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <i className="fa-solid fa-users"></i> <span>Usuários</span>
                        </NavLink>
                    </>
                )}
            </ul>

            <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Usuário logado */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.03)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                        {initials}
                    </div>
                    {!isCollapsed && (
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{isAdmin ? 'Administrador' : 'Usuário'}</div>
                        </div>
                    )}
                </div>

                {/* Botão de sair */}
                <button
                    onClick={signOut}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.04)', color: '#ef4444', cursor: 'pointer', fontFamily: 'Outfit', fontSize: 13, fontWeight: 600, width: '100%', transition: '0.2s' }}
                >
                    <i className="fa-solid fa-right-from-bracket" style={{ fontSize: 14 }}></i>
                    {!isCollapsed && <span>Sair</span>}
                </button>

                <div className="theme-switch" onClick={toggleTheme}>
                    <i className="fa-solid fa-moon"></i>
                    <div className="label">Modo Escuro</div>
                    <div className="toggle-btn"></div>
                </div>
            </div>
        </aside>
    );
}
