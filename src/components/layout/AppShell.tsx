import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { INSTITUTION, ROLE_LABEL } from '@/lib/constants';
import { cx } from '@/lib/cx';
import { Avatar } from '@/components/ui/Avatar';
import { Brand } from './Brand';
import { NAVIGATION } from './navigation';

/**
 * Application frame.
 *
 * One frame serves all four roles: a persistent rail on large screens, a
 * drawer below that. Only the navigation items change, so someone who moves
 * between roles (an admin who also monitors a gate) does not relearn the app.
 */
export function AppShell() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  if (!user) return null;
  const items = NAVIGATION[user.role];

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-signal-50 text-signal-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-paper">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to={items[0].to} className="flex items-center gap-2">
            <Brand />
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen((open) => !open)}
            aria-expanded={drawerOpen}
            aria-controls="mobile-navigation"
            className="rounded-control border border-ink-200 p-2 text-ink-700"
          >
            {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">{drawerOpen ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
        {drawerOpen && (
          <div id="mobile-navigation" className="border-t border-ink-100 px-4 py-3">
            {nav}
            <button
              type="button"
              onClick={signOut}
              className="mt-2 flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
              Sign out
            </button>
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-[100rem]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink-100 bg-white px-4 py-5 lg:flex">
          <Link to={items[0].to} className="flex flex-col gap-0.5 px-1">
            <Brand className="text-2xl" />
            <span className="text-xs text-ink-500">{INSTITUTION}</span>
          </Link>

          <div className="mt-7 flex-1">{nav}</div>

          <div className="border-t border-ink-100 pt-3">
            <div className="flex items-center gap-3 px-1 py-2">
              <Avatar name={user.name} src={user.photoPath} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
                <p className="truncate text-xs text-ink-500">{ROLE_LABEL[user.role]}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="mt-1 flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900"
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </aside>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
