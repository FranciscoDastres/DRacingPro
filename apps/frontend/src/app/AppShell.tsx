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
  { icon: 'tool', label: 'Servicios', to: '/app/services' },
];

const adminNav: NavItem[] = [
  { end: true, icon: 'chart', label: 'Panel', to: '/app/admin' },
  { icon: 'calendar', label: 'Agenda taller', to: '/app/admin/agenda' },
  { icon: 'users', label: 'Usuarios', to: '/app/admin/users' },
  { icon: 'tool', label: 'Servicios', to: '/app/admin/services' },
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
    <div className="admin-grid-bg bg-background text-foreground min-h-screen">
      <header className="bg-background/75 sticky top-0 z-30 border-b border-white/8 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3.5 lg:px-6">
          <NavLink
            className="flex items-center gap-3"
            to={isAdmin ? '/app/admin' : '/app'}
          >
            <span className="bg-primary shadow-primary/20 grid size-9 place-items-center rounded-lg text-xs font-black text-white italic shadow-lg">
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
                className={`grid size-9 place-items-center rounded-full text-xs font-black ${
                  isAdmin
                    ? 'bg-primary text-white'
                    : 'text-foreground bg-white/10'
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

      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav
          aria-label="Navegación principal"
          className="bg-background/55 flex gap-2 overflow-x-auto border-b border-white/8 px-4 py-3 backdrop-blur-lg lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] lg:flex-col lg:gap-1 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-4 lg:py-6"
        >
          <p className="text-muted hidden px-3 pb-2 text-[0.62rem] font-semibold tracking-[0.18em] uppercase lg:block">
            {isAdmin ? 'Centro de operaciones' : 'Mi taller'}
          </p>
          {(isAdmin ? adminNav : customerNav).map((item) => (
            <NavItemLink item={item} key={item.to} />
          ))}

          {isAdmin && (
            <div className="mt-auto hidden rounded-xl border border-white/8 bg-white/[0.025] p-3 lg:block">
              <p className="text-muted text-[0.65rem] font-semibold tracking-wider uppercase">
                Sistema
              </p>
              <p className="mt-1.5 text-xs text-emerald-400">● Operativo</p>
            </div>
          )}
        </nav>

        <main className="min-w-0 px-4 py-7 sm:px-6 lg:px-8 lg:py-8 xl:px-10">
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
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-all ${
          isActive
            ? 'bg-primary/12 text-foreground shadow-[inset_2px_0_0_var(--color-primary)]'
            : 'text-muted hover:text-foreground hover:bg-white/[0.04]'
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
