import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';

const NAV_ITEMS = [
  { path: '/painel', icon: 'home', label: 'Painel' },
  { path: '/eventos', icon: 'calendar', label: 'Eventos' },
  { path: '/caixa', icon: 'wallet', label: 'Caixa' },
  { path: '/musicos', icon: 'users', label: 'Músicos' },
  { path: '/contratos', icon: 'file', label: 'Contratos' },
  { path: '/relatorio', icon: 'chart', label: 'Relatório' },
];

const BOTTOM_NAV_ITEMS = [
  { path: '/painel', icon: 'home', label: 'Painel' },
  { path: '/eventos', icon: 'calendar', label: 'Eventos' },
  { path: '/caixa', icon: 'wallet', label: 'Caixa' },
  { path: '/musicos', icon: 'users', label: 'Músicos' },
  { path: '/config', icon: 'settings', label: 'Config' },
];

const PANE_TITLES: Record<string, string> = {
  '/painel': 'Painel',
  '/eventos': 'Eventos',
  '/caixa': 'Caixa',
  '/musicos': 'Músicos',
  '/contratos': 'Contratos',
  '/contratos/novo': 'Gerar Contrato',
  '/relatorio': 'Relatório',
  '/config': 'Configurações',
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

  async function handleLogout() {
    await logout();
    navigate('/login');
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
            <div className="dropitem" style={{ color: 'var(--brand-ink)' }} onClick={() => navigate('/onboarding')}>
              <Icon name="plus" size={14} />
              Novo grupo
            </div>
          </div>
        )}
        <nav>
          {NAV_ITEMS.map((item) => (
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
        {BOTTOM_NAV_ITEMS.map((item) => (
          <div
            key={item.path}
            className={`nb${isActive(item.path, pathname) ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </div>
        ))}
      </nav>
    </div>
  );
}
