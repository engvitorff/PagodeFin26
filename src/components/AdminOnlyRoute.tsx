import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Gateia rotas só de Admin (Painel, Eventos, Caixa, Músicos, Contratos, Relatório).
// Usuários "View" (músicos do elenco com acesso restrito) que tentarem acessar
// essas rotas diretamente pela URL são redirecionados para a própria agenda.
export function AdminOnlyRoute() {
  const { group } = useAuth();

  if (group?.role !== 'Admin') return <Navigate to="/agenda" replace />;

  return <Outlet />;
}
