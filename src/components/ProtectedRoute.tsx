import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, loading, group } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
        Carregando...
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!group) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}
