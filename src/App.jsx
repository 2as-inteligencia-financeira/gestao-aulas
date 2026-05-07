import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import BoardPage from './pages/BoardPage';
import ProfessoresPage from './pages/ProfessoresPage';
import ColaboradoresPage from './pages/ColaboradoresPage';
import OrcamentoPage from './pages/OrcamentoPage';
import AdminPage from './pages/AdminPage';

function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Carregando...</div>;
  if (!user)   return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/kanban" element={
            <ProtectedRoute><BoardPage /></ProtectedRoute>
          } />
          <Route path="/professores" element={
            <ProtectedRoute minPerfil="gestor"><ProfessoresPage /></ProtectedRoute>
          } />
          <Route path="/colaboradores" element={
            <ProtectedRoute minPerfil="gestor"><ColaboradoresPage /></ProtectedRoute>
          } />
          <Route path="/orcamento" element={
            <ProtectedRoute minPerfil="gestor"><OrcamentoPage /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute minPerfil="admin"><AdminPage /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
