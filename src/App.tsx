import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { IconSprite } from '@/components/ui/IconSprite';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppDataProvider } from '@/context/AppDataContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminOnlyRoute } from '@/components/AdminOnlyRoute';
import { AppShell } from '@/layouts/AppShell';
import { Login } from '@/pages/Login';
import { Onboarding } from '@/pages/Onboarding';
import { Painel } from '@/pages/Painel';
import { Eventos } from '@/pages/Eventos';
import { EventoDetalhe } from '@/pages/EventoDetalhe';
import { Caixa } from '@/pages/Caixa';
import { Musicos } from '@/pages/Musicos';
import { Contratos } from '@/pages/Contratos';
import { GerarContrato } from '@/pages/GerarContrato';
import { Relatorio } from '@/pages/Relatorio';
import { Config } from '@/pages/Config';
import { Usuario } from '@/pages/Usuario';
import { Banda } from '@/pages/Banda';
import { MinhaAgenda } from '@/pages/MinhaAgenda';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppDataProvider>
          <IconSprite />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route element={<AdminOnlyRoute />}>
                    <Route path="/painel" element={<Painel />} />
                    <Route path="/eventos" element={<Eventos />} />
                    <Route path="/eventos/:id" element={<EventoDetalhe />} />
                    <Route path="/caixa" element={<Caixa />} />
                    <Route path="/musicos" element={<Musicos />} />
                    <Route path="/contratos" element={<Contratos />} />
                    <Route path="/contratos/novo" element={<GerarContrato />} />
                  </Route>
                  <Route path="/relatorio" element={<Relatorio />} />
                  <Route path="/agenda" element={<MinhaAgenda />} />
                  <Route path="/usuario" element={<Usuario />} />
                  <Route path="/banda" element={<Banda />} />
                  <Route path="/config" element={<Config />} />
                </Route>
              </Route>

              <Route path="/" element={<Navigate to="/painel" replace />} />
              <Route path="*" element={<Navigate to="/painel" replace />} />
            </Routes>
          </BrowserRouter>
        </AppDataProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
