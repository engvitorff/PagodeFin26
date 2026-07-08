import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';

type NavItem = { path: string; icon: string; label: string; pinned?: boolean };

// Itens do menu principal (sidebar desktop, adicionados em cascata). Os
// marcados como `pinned` ficam fixos no rodapé mobile; qualquer aba nova
// entra aqui sem `pinned` e cai automaticamente dentro do menu "Outros" no
// mobile, sem precisar mexer em mais nada.
const NAV_ITEMS: NavItem[] = [
  { path: '/painel', icon: 'home', label: 'Painel', pinned: true },
  { path: '/eventos', icon: 'calendar', label: 'Eventos', pinned: true },
  { path: '/caixa', icon: 'wallet', label: 'Caixa', pinned: true },
  { path: '/musicos', icon: 'users', label: 'Músicos', pinned: true },
  { path: '/contratos', icon: 'file', label: 'Contratos' },
  { path: '/relatorio', icon: 'chart', label: 'Relatório' },
];

const CONFIG_ITEM: NavItem = { path: '/config', icon: 'settings', label: 'Configurações' };

// Papel "View" (músico do elenco com acesso restrito): só enxerga a própria
// agenda. Config continua sempre acessível (sidebar-foot no desktop / menu
// "Outros" no mobile).
const VIEW_NAV_ITEMS: NavItem[] = [{ path: '/agenda', icon: 'calendar', label: 'Minha Agenda', pinned: true }];

const PANE_TITLES: Record<string, string> = {
  '/painel': 'Painel',
  '/eventos': 'Eventos',
  '/caixa': 'Caixa',
  '/musicos': 'Músicos',
  '/contratos': 'Contratos',
  '/contratos/novo': 'Gerar Contrato',
  '/relatorio': 'Relatório',
  '/config': 'Configurações',
  '/agenda': 'Minha Agenda',
};

function isActive(path: string, pathname: string): boolean {
  if (path === '/eventos') return pathname.startsWith('/eventos');
  if (path === '/contratos') return pathname.startsWith('/contratos');
  return pathname === path;
}

function resolveTitle(pathname: string): string {
  if (PANE_TITLES[pathname]) return PANE_TITLES[pathname];
  if (pathname.startsWith('/eventos/')) return 'Evento';
  return 'Painel';
}

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { group, user, userInitials, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
  const { loadingData } = useAppData();
  const [dropOpen, setDropOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const isAdmin = group?.role === 'Admin';
  const navItems = isAdmin ? NAV_ITEMS : VIEW_NAV_ITEMS;
  const pinnedNavItems = navItems.filter((item) => item.pinned);
  const moreNavItems = [...navItems.filter((item) => !item.pinned), CONFIG_ITEM];
  const isMoreActive = moreNavItems.some((item) => isActive(item.path, pathname));

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function goFromDrawer(path: string) {
    setMoreOpen(false);
    navigate(path);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="grouphead" onClick={() => setDropOpen((v) => !v)}>
          <div className="brandbox">{userInitials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {group?.name}
            </div>
            <div className="faint">Trocar grupo</div>
          </div>
          <Icon name="chev" size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
        </div>
        {dropOpen && (
          <div className="groupdrop">
            <div className="dropitem">
              <div className="brandbox" style={{ width: 22, height: 22, borderRadius: 7, fontSize: 10 }}>{userInitials}</div>
              {group?.name}
            </div>
            {isAdmin && (
              <div className="dropitem" style={{ color: 'var(--brand-ink)' }} onClick={() => navigate('/onboarding')}>
                <Icon name="plus" size={14} />
                Novo grupo
              </div>
            )}
          </div>
        )}
        <nav>
          {navItems.map((item) => (
            <div
              key={item.path}
              className={`navitem${isActive(item.path, pathname) ? ' active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className={`navitem${pathname === '/config' ? ' active' : ''}`} onClick={() => navigate('/config')}>
            <Icon name="settings" size={18} />
            Configurações
          </div>
          <div
            className="navitem"
            style={{ color: 'var(--text-faint)' }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--danger)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
            onClick={handleLogout}
          >
            <Icon name="logout" size={18} />
            Sair
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">{resolveTitle(pathname)}</div>
          <div className="spacer" />
          <button className="iconbtn" onClick={toggleMode}>
            <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
          <button className="iconbtn" style={{ position: 'relative' }}>
            <Icon name="bell" size={18} />
            <span className="notif-dot" />
          </button>
          <div style={{ position: 'relative' }}>
            <div
              className="av"
              style={{ background: 'var(--brand)', cursor: 'pointer' }}
              onClick={() => setAccountOpen((v) => !v)}
            >
              {userInitials}
            </div>
            {accountOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setAccountOpen(false)} />
                <div className="groupdrop" style={{ position: 'absolute', top: 44, right: 0, width: 230, zIndex: 41 }}>
                  <div style={{ padding: '8px 11px 10px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {group?.name}
                    </div>
                    <div className="faint" style={{ marginTop: 2, wordBreak: 'break-all' }}>{user?.email}</div>
                  </div>
                  <div className="dropitem" onClick={() => { setAccountOpen(false); navigate('/config'); }}>
                    <Icon name="settings" size={14} />
                    Configurações
                  </div>
                  <div className="dropitem" style={{ color: 'var(--danger)' }} onClick={() => { setAccountOpen(false); handleLogout(); }}>
                    <Icon name="logout" size={14} />
                    Sair
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="content">
          <div className="inner">
            {loadingData ? <div className="faint">Carregando dados...</div> : <Outlet />}
          </div>
        </div>
      </div>

      <nav className="bottomnav">
        {pinnedNavItems.map((item) => (
          <div
            key={item.path}
            className={`nb${isActive(item.path, pathname) ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </div>
        ))}
        <div className={`nb${isMoreActive ? ' active' : ''}`} onClick={() => setMoreOpen(true)}>
          <Icon name="dots" size={20} />
          Outros
        </div>
      </nav>

      {moreOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setMoreOpen(false)} />
          <div className="drawer">
            <div className="drawer-head">
              <div className="drawer-title">Outros</div>
              <button className="iconbtn" onClick={() => setMoreOpen(false)}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <nav>
              {moreNavItems.map((item) => (
                <div
                  key={item.path}
                  className={`navitem${isActive(item.path, pathname) ? ' active' : ''}`}
                  onClick={() => goFromDrawer(item.path)}
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </div>
              ))}
            </nav>
            <div className="drawer-foot">
              <div
                className="navitem"
                style={{ color: 'var(--text-faint)' }}
                onClick={() => { setMoreOpen(false); handleLogout(); }}
              >
                <Icon name="logout" size={18} />
                Sair
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
