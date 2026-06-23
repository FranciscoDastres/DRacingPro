import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Icon, type IconName } from '../components/ui/Icon';
import { useAuth } from '../features/auth/auth-context';

interface NavItem {
  label: string;
  to: string;
  icon: IconName;
  end?: boolean;
}

const customerNav: NavItem[] = [
  { end: true, icon: 'chart', label: 'Resumen', to: '/app' },
  { icon: 'calendar', label: 'Agenda', to: '/app/appointments' },
  { icon: 'spark', label: 'Novedades', to: '/app/notifications' },
  { icon: 'bike', label: 'Mis motos', to: '/app/motorcycles' },
  { icon: 'tool', label: 'Servicios', to: '/app/services' },
  { icon: 'user', label: 'Mi cuenta', to: '/app/account' },
];

const adminNav: NavItem[] = [
  { end: true, icon: 'chart', label: 'Panel', to: '/app/admin' },
  { icon: 'calendar', label: 'Agenda taller', to: '/app/admin/agenda' },
  { icon: 'users', label: 'Usuarios', to: '/app/admin/users' },
  { icon: 'settings', label: 'Configuración', to: '/app/admin/settings' },
];

export function AppShell() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const initials = (user?.displayName ?? 'D R')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="bg-surface/80 sticky top-0 z-30 border-b border-white/10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <NavLink className="flex items-center gap-3" to="/app">
            <span className="bg-primary grid size-9 place-items-center rounded-xl text-xs font-black text-white italic">
              DR
            </span>
            <span className="hidden text-sm font-bold tracking-[0.18em] uppercase sm:block">
              D Racing <span className="text-accent">Pro</span>
            </span>
          </NavLink>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-sm font-semibold">{user?.displayName}</p>
                <p className="text-muted text-xs">{user?.email}</p>
              </div>
              <span
                className={`grid size-10 place-items-center rounded-full text-xs font-black ${
                  isAdmin
                    ? 'bg-primary text-white'
                    : 'bg-white/10 text-foreground'
                }`}
              >
                {initials}
              </span>
            </div>
            <button
              className="text-muted hover:border-primary/50 hover:text-foreground flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold transition"
              onClick={() => void handleLogout()}
              type="button"
            >
              <Icon className="size-4" name="logout" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl lg:grid-cols-[232px_1fr]">
        <nav
          aria-label="Navegación principal"
          className="flex gap-2 overflow-x-auto border-b border-white/10 px-5 py-3 lg:min-h-[calc(100vh-73px)] lg:flex-col lg:gap-1 lg:border-r lg:border-b-0 lg:px-4 lg:py-6"
        >
          <p className="text-muted hidden px-3 pb-1 text-[0.62rem] font-semibold tracking-[0.16em] uppercase lg:block">
            Mi taller
          </p>
          {customerNav.map((item) => (
            <NavItemLink item={item} key={item.to} />
          ))}

          {isAdmin && (
            <>
              <p className="text-accent mt-4 hidden px-3 pb-1 text-[0.62rem] font-semibold tracking-[0.16em] uppercase lg:block">
                Administración
              </p>
              {adminNav.map((item) => (
                <NavItemLink item={item} key={item.to} />
              ))}
            </>
          )}
        </nav>

        <main className="min-w-0 px-5 py-8 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
          isActive
            ? 'bg-accent/10 text-accent'
            : 'text-muted hover:text-foreground hover:bg-white/5'
        }`
      }
      end={item.end ?? false}
      to={item.to}
    >
      <Icon className="size-4.5 shrink-0" name={item.icon} />
      {item.label}
    </NavLink>
  );
}
