import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../features/auth/auth-context';

const navigation = [
  { label: 'Resumen', to: '/app' },
  { label: 'Mis motos', to: '/app/motorcycles' },
  { label: 'Servicios', to: '/app/services' },
];

export function AppShell() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="bg-surface/80 border-b border-white/10 backdrop-blur-xl">
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
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user?.displayName}</p>
              <p className="text-muted text-xs">{user?.email}</p>
            </div>
            <button
              className="text-muted hover:border-primary/50 hover:text-foreground rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold transition"
              onClick={() => void handleLogout()}
              type="button"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto border-b border-white/10 px-5 py-3 lg:min-h-[calc(100vh-73px)] lg:flex-col lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
          {navigation.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `rounded-lg px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted hover:text-foreground hover:bg-white/5'
                }`
              }
              end={item.to === '/app'}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="min-w-0 px-5 py-8 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
