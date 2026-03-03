import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location]);

    return (
        <>
            <div className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
            <Sidebar mobileOpen={mobileMenuOpen} closeMobile={() => setMobileMenuOpen(false)} />
            <main className="main-content">
                <div className="mobile-header">
                    <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
                        <i className="fa-solid fa-bars"></i>
                    </button>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Colorindo Engine</h2>
                </div>
                <Outlet />
            </main>
        </>
    );
}
