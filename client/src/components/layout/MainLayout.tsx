import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Users, FileSignature, Building2, Megaphone,
  GitBranch, Image, BarChart3, LogOut, Mail,
  Settings, HelpCircle, Bell, ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { cn } from '../../utils/cn';
import { useState } from 'react';

const navItems = [
  { to: '/templates', icon: FileSignature, label: 'Signatures' },
  { to: '/rules', icon: GitBranch, label: 'Access rights', adminOnly: true },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { to: '/business-units', icon: Building2, label: 'Business Units', adminOnly: true },
  { to: '/assets', icon: Image, label: 'Assets' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
];

const PAGE_TITLES: Record<string, string> = {
  '/templates': 'Signatures',
  '/rules': 'Access rights',
  '/users': 'Users',
  '/campaigns': 'Campaigns',
  '/business-units': 'Business Units',
  '/assets': 'Assets',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
  '/dashboard': 'Dashboard',
};

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
  };

  const visibleNav = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || 'SignatureHub';

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Left Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight tracking-tight truncate">SignatureHub</p>
            <p className="text-[10px] text-gray-400 leading-tight font-medium uppercase tracking-wide">Enterprise</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-[inset_2px_0_0_0_#2563eb]'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    isActive
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'
                  )}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: certification badges + copyright */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          {/* ISO 27001 / 27018 */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full border border-gray-200">
              <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                <circle cx="16" cy="16" r="13" stroke="#94a3b8" strokeWidth="1.5" />
                <text x="16" y="13" textAnchor="middle" fontSize="5.5" fill="#64748b" fontFamily="Arial" fontWeight="bold">ISO</text>
                <text x="16" y="19" textAnchor="middle" fontSize="4" fill="#94a3b8" fontFamily="Arial">27001</text>
                <text x="16" y="24" textAnchor="middle" fontSize="3.5" fill="#94a3b8" fontFamily="Arial">27018</text>
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 leading-tight">ISO 27001</p>
              <p className="text-[10px] text-gray-400 leading-tight">ISO 27018</p>
            </div>
          </div>

          {/* Microsoft 365 Certified */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <rect x="1" y="1" width="10" height="10" fill="#f25022" rx="0.5" />
                <rect x="13" y="1" width="10" height="10" fill="#7fba00" rx="0.5" />
                <rect x="1" y="13" width="10" height="10" fill="#00a4ef" rx="0.5" />
                <rect x="13" y="13" width="10" height="10" fill="#ffb900" rx="0.5" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 leading-tight">Microsoft 365</p>
              <p className="text-[10px] text-gray-400 leading-tight">Certified</p>
            </div>
          </div>

          {/* Microsoft Partner */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <rect x="1" y="1" width="10" height="10" fill="#737373" rx="0.5" />
                <rect x="13" y="1" width="10" height="10" fill="#737373" rx="0.5" />
                <rect x="1" y="13" width="10" height="10" fill="#737373" rx="0.5" />
                <rect x="13" y="13" width="10" height="10" fill="#737373" rx="0.5" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 leading-tight">Microsoft</p>
              <p className="text-[10px] text-gray-400 leading-tight">Partner · Customer Experience Award</p>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 text-center pt-1">© 2026 SignatureHub<br />All rights reserved.</p>
        </div>
      </aside>

      {/* Right: Top bar + content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navbar — dark navy */}
        <header className="h-12 bg-[#1c2d4a] flex items-center justify-between px-5 shrink-0">
          <h1 className="text-white font-semibold text-base">{pageTitle}</h1>

          <div className="flex items-center gap-3">
            <button className="text-white/60 hover:text-white p-1 rounded">
              <HelpCircle className="w-4 h-4" />
            </button>
            <button className="text-white/60 hover:text-white p-1 rounded">
              <Bell className="w-4 h-4" />
            </button>

            {/* User avatar + dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 text-white/80 hover:text-white"
              >
                <div className="w-7 h-7 rounded-full bg-blue-400 flex items-center justify-center text-xs font-bold text-white">
                  {initials}
                </div>
                <ChevronDown className="w-3 h-3" />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 top-10 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-2"
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="font-bold text-gray-900 text-sm">{user?.displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4" />
                      Settings (Admin Panel)
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
