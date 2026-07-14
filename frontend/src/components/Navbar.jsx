import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ThemeToggle from './ThemeToggle';
import Avatar from './Avatar';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const isAdmin = user.role === 'admin';
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleAvatarUploaded = (updatedUser) => {
    const merged = { ...user, avatarUrl: updatedUser.avatarUrl };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Signed out successfully.');
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
      isActive
        ? 'bg-[var(--surface-raised)] text-[var(--text-primary)]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
    }`;

  return (
    <nav className="bg-[var(--surface)] border-b border-[var(--border)] px-4 md:px-6 py-3 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <NavLink to="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--accent-contrast)] font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
            M
          </div>
          <span className="text-base font-bold text-[var(--text-primary)] tracking-tight hidden sm:block">
            MaintainIQ
          </span>
        </NavLink>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1.5 ml-8 mr-auto">
          {isAdmin && <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>}
          {isAdmin && <NavLink to="/assets" className={navLinkClass}>Assets</NavLink>}
          <NavLink to="/issues" className={navLinkClass}>Issues</NavLink>
          {isAdmin && <NavLink to="/users" className={navLinkClass}>Users</NavLink>}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="hidden md:flex items-center gap-3 pl-3 border-l border-[var(--border)]">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-[var(--text-primary)] leading-tight truncate max-w-[120px]">
                {user.name || 'User'}
              </span>
              <span className="font-mono-code text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
                {user.role || 'guest'}
              </span>
            </div>
            <Avatar user={user} size="md" editable userId={user._id || user.id} onUploaded={handleAvatarUploaded} />
          </div>
          <button
            onClick={handleLogout}
            className="hidden md:block text-sm text-[var(--text-secondary)] hover:text-[var(--danger)] ml-2 transition-colors cursor-pointer font-medium"
          >
            Sign Out
          </button>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 rounded-lg hover:bg-[var(--surface-raised)] transition-colors"
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
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden"
          >
            <div className="pt-4 pb-2 space-y-1 flex flex-col gap-1 border-t border-[var(--border)] mt-3">
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
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <Avatar user={user} size="md" editable userId={user._id || user.id} onUploaded={handleAvatarUploaded} />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-[var(--danger)] font-medium cursor-pointer px-3 py-1.5"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
