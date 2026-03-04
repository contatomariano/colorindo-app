import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import { AccountProvider } from './context/AccountContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth
import Login from './pages/Login';

// Usuários, Perfil
import Usuarios from './pages/Usuarios';
import EditarUsuario from './pages/EditarUsuario';
import MinhaConta from './pages/MinhaConta';
// Contas e Administração Global
import ContasAdmin from './pages/ContasAdmin';
import EditarConta from './pages/EditarConta';

// Projetos e Pedidos (Core Engine)
import Projetos from './pages/Projetos';
import NovoProjeto from './pages/NovoProjeto';
import EditarProjeto from './pages/EditarProjeto';
import Pedidos from './pages/Pedidos';
import NovoPedido from './pages/NovoPedido';
import NovoPedidoLote from './pages/NovoPedidoLote';
import PedidoRevisao from './pages/PedidoRevisao';
import PedidoLog from './pages/PedidoLog';

// Monitoramento
import Pipeline from './pages/Pipeline';
import PipelineDemo from './pages/PipelineDemo';

// Temas e Biblioteca
import Temas from './pages/Temas';
import BibliotecaTemas from './pages/BibliotecaTemas';
import NovoTemaAdmin from './pages/NovoTemaAdmin';

// Projetos e Pedidos - subpáginas
import ProjetoPedidos from './pages/ProjetoPedidos';
import PedidoDetalhes from './pages/PedidoDetalhes';

// Prompts e Configurações
import Prompts from './pages/Prompts';
import Configuracoes from './pages/Configuracoes';
import SeedData from './pages/SeedData';

import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-color, #f0f2f8)' }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 32, color: 'var(--accent-1, #6366f1)' }}></i>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return null;
  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/pedidos" replace />;
  }

  return children;
}

function ManagerRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return null;
  if (!user || (profile?.role !== 'admin' && profile?.role !== 'manager')) {
    return <Navigate to="/pedidos" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Login público */}
          <Route path="/login" element={<Login />} />

          {/* Rotas protegidas */}
          <Route path="/" element={
            <ProtectedRoute>
              <AccountProvider>
                <DashboardLayout />
              </AccountProvider>
            </ProtectedRoute>
          }>
            {/* Página Inicial */}
            <Route index element={<Navigate to="/pedidos" replace />} />

            {/* Contas de Clientes (B2B Admin) */}
            <Route path="admin/contas" element={<AdminRoute><ContasAdmin /></AdminRoute>} />
            <Route path="admin/contas/:id/editar" element={<AdminRoute><EditarConta /></AdminRoute>} />

            {/* Usuários */}
            <Route path="admin/usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
            <Route path="admin/usuarios/:id/editar" element={<AdminRoute><EditarUsuario /></AdminRoute>} />

            {/* Perfil do Usuário */}
            <Route path="minha-conta" element={<MinhaConta />} />

            {/* Projetos */}
            <Route path="projetos" element={<ManagerRoute><Projetos /></ManagerRoute>} />
            <Route path="projetos/novo" element={<ManagerRoute><NovoProjeto /></ManagerRoute>} />
            <Route path="projetos/:id/editar" element={<ManagerRoute><EditarProjeto /></ManagerRoute>} />
            <Route path="projetos/:id/pedidos" element={<ManagerRoute><ProjetoPedidos /></ManagerRoute>} />

            {/* Pedidos */}
            <Route path="pedidos" element={<Pedidos />} />
            <Route path="pedidos/novo" element={<NovoPedido />} />
            <Route path="pedidos/lote" element={<NovoPedidoLote />} />
            <Route path="pedidos/:id" element={<PedidoDetalhes />} />
            <Route path="pedidos/:id/revisao" element={<PedidoRevisao />} />
            <Route path="pedidos/:id/log" element={<PedidoLog />} />

            {/* Monitoramento */}
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="pipeline-demo" element={<PipelineDemo />} />
            <Route path="admin/pipeline" element={<AdminRoute><Pipeline /></AdminRoute>} />

            {/* Temas (usuário) */}
            <Route path="temas" element={<Temas />} />

            {/* Biblioteca de Temas (admin) */}
            <Route path="admin/temas" element={<ManagerRoute><BibliotecaTemas /></ManagerRoute>} />
            <Route path="admin/temas/novo" element={<ManagerRoute><NovoTemaAdmin /></ManagerRoute>} />
            <Route path="admin/temas/:id/editar" element={<ManagerRoute><NovoTemaAdmin /></ManagerRoute>} />

            {/* Prompts e Configurações */}
            <Route path="admin/prompts" element={<AdminRoute><Prompts /></AdminRoute>} />
            <Route path="admin/configuracoes" element={<AdminRoute><Configuracoes /></AdminRoute>} />

            {/* Utilitários internos */}
            <Route path="seed" element={<SeedData />} />

            {/* Catch-all */}
            <Route path="*" element={
              <div style={{ padding: 60, textAlign: 'center' }}>
                <i className="fa-solid fa-hammer" style={{ fontSize: 48, color: 'var(--text-secondary)', marginBottom: 16, display: 'block' }}></i>
                <h2 style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Página em Construção</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Esta rota ainda está sendo implementada.</p>
              </div>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
