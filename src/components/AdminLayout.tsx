import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, LogOut, MessageSquareText, Users } from 'lucide-react';

import { api } from '../api/client';

const navItems = [
  { to: '/painel', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/painel/usuarios', label: 'Usuários', icon: Users },
  { to: '/painel/avaliacoes', label: 'Avaliações', icon: MessageSquareText },
];

export function AdminLayout() {
  const handleLogout = async () => {
    await api.auth.logout();
    window.location.href = '/login';
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">R</span>
          <div>
            <strong>Restitua</strong>
            <span>Painel Admin</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegação administrativa">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <Icon size={17} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={17} />
          Sair
        </button>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
