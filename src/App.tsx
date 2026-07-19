import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { IconSprite } from '@/components/ui/IconSprite';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppDataProvider } from '@/context/AppDataContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminOnlyRoute } from '@/components/AdminOnlyRoute';
import { AppShell } from '@/layouts/AppShell';

// Cada página vira um chunk separado, carregado só quando a rota é
// visitada — o bundle inicial (ex.: tela de Login) não precisa baixar o
// código de todas as outras telas (incl. libs pesadas como o mapa/leaflet
// usado só dentro de EventoDetalhe/Eventos).
const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })));
const Onboarding = lazy(() => import('@/pages/Onboarding').then((m) => ({ default: m.Onboarding })));
const Painel = lazy(() => import('@/pages/Painel').then((m) => ({ default: m.Painel })));
const Eventos = lazy(() => import('@/pages/Eventos').then((m) => ({ default: m.Eventos })));
const EventoDetalhe = lazy(() => import('@/pages/EventoDetalhe').then((m) => ({ default: m.EventoDetalhe })));
const Caixa = lazy(() => import('@/pages/Caixa').then((m) => ({ default: m.Caixa })));
const Musicos = lazy(() => import('@/pages/Musicos').then((m) => ({ default: m.Musicos })));
const Contratos = lazy(() => import('@/pages/Contratos').then((m) => ({ default: m.Contratos })));
const GerarContrato = lazy(() => import('@/pages/GerarContrato').then((m) => ({ default: m.GerarContrato })));
const Relatorio = lazy(() => import('@/pages/Relatorio').then((m) => ({ default: m.Relatorio })));
const Config = lazy(() => import('@/pages/Config').then((m) => ({ default: m.Config })));
const Usuario = lazy(() => import('@/pages/Usuario').then((m) => ({ default: m.Usuario })));
const Banda = lazy(() => import('@/pages/Banda').then((m) => ({ default: m.Banda })));
const MinhaAgenda = lazy(() => import('@/pages/MinhaAgenda').then((m) => ({ default: m.MinhaAgenda })));

function RouteFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
      Carregando...
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppDataProvider>
          <IconSprite />
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
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
            </Suspense>
          </BrowserRouter>
        </AppDataProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
