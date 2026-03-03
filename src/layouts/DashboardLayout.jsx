import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout() {
    return (
        <>
            <Sidebar />
            <main className="main-content">
                <Outlet />
            </main>
        </>
    );
}
