import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import ThemeToggle from '../components/ThemeToggle';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

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
    <div className="min-h-[100dvh] bg-[var(--bg)] flex items-center justify-center px-4 py-12 transition-colors relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex justify-center items-center opacity-[0.03] dark:opacity-[0.02]">
        <div className="w-[800px] h-[800px] bg-[var(--accent)] rounded-full blur-[120px]" />
      </div>

      {/* Theme toggle top-right */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
        <ThemeToggle />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Brand */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent)] mb-5 shadow-[0_4px_20px_rgba(245,158,11,0.3)] dark:shadow-[0_4px_20px_rgba(245,158,11,0.1)]">
            <span className="text-[var(--accent-contrast)] font-black text-3xl">M</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">MaintainIQ</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5 font-medium">Enterprise Asset Maintenance</p>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-xl shadow-black/5 dark:shadow-none">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="input-base"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="text-xs font-semibold text-[var(--text-secondary)] block mb-1.5">
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
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full py-2.5 mt-2 text-[15px]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--text-tertiary)] mt-8 select-none">
          Secure Operations Platform
        </p>
      </motion.div>
    </div>
  );
}
