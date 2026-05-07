import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children, minPerfil }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="loading-screen">Carregando...</div>;
  if (!user)   return <Navigate to="/login" replace />;

  if (minPerfil && profile) {
    const order = { operador: 0, gestor: 1, financeiro: 2, admin: 3 };
    if ((order[profile.perfil] ?? -1) < (order[minPerfil] ?? 0)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
