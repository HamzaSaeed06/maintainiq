import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, user } = res.data.data;

      localStorage.setItem('user', JSON.stringify(user));
      setAuth(user, token);

      toast.success(`Welcome back, ${user.name}!`);
      setTimeout(() => navigate('/dashboard'), 300);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Invalid credentials. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4 py-12 transition-colors">
      {/* Theme toggle top-right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent)] mb-4 shadow-lg">
            <span className="text-[var(--accent-contrast)] font-black text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">MaintainIQ</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium uppercase tracking-widest">Enterprise Asset Maintenance</p>
        </div>

        {/* Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm p-8">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-6 uppercase tracking-wider">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="text-[11px] text-[var(--text-secondary)] block uppercase tracking-wider font-semibold mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="input-base"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-[11px] text-[var(--text-secondary)] block uppercase tracking-wider font-semibold mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-base"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full py-3 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-[var(--text-secondary)] mt-6 select-none uppercase tracking-widest">
          MaintainIQ &middot; Secure Operations Platform
        </p>
      </div>
    </div>
  );
}
