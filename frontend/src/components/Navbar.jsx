import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Signed out successfully.');
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
      isActive
        ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
    }`;

  return (
    <nav className="bg-[var(--surface)] border-b border-[var(--border)] px-4 md:px-6 py-3 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <NavLink to="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center text-[var(--accent-contrast)] font-black text-sm">M</span>
          <span className="text-sm font-black text-[var(--text-primary)] tracking-tight hidden sm:block">MaintainIQ</span>
        </NavLink>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {isAdmin && <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>}
          {isAdmin && <NavLink to="/assets" className={navLinkClass}>Assets</NavLink>}
          <NavLink to="/issues" className={navLinkClass}>Issues</NavLink>
          {isAdmin && <NavLink to="/users" className={navLinkClass}>Users</NavLink>}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden md:flex items-center gap-2">
            <span className={`font-mono-code text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
              isAdmin
                ? 'bg-[var(--surface-raised)] text-[var(--accent)] border-[var(--border)]'
                : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)]'
            }`}>
              {user.role || 'guest'}
            </span>
            <span className="text-xs text-[var(--text-secondary)] truncate max-w-[120px]">{user.name || 'User'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="hidden md:block text-xs text-[var(--text-secondary)] hover:text-[var(--danger)] bg-[var(--surface-raised)] px-3 py-1.5 rounded-md border border-[var(--border)] transition-colors cursor-pointer font-semibold"
          >
            Sign Out
          </button>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden mt-3 border-t border-[var(--border)] pt-3 space-y-1 pb-1 flex flex-col gap-1">
          {isAdmin && (
            <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Dashboard
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/assets" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Assets
            </NavLink>
          )}
          <NavLink to="/issues" className={navLinkClass} onClick={() => setMobileOpen(false)}>
            Issues
          </NavLink>
          {isAdmin && (
            <NavLink to="/users" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Users
            </NavLink>
          )}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase text-[var(--text-secondary)] bg-[var(--surface-raised)]">
                {user.role || 'guest'}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">{user.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-[var(--danger)] font-semibold cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
