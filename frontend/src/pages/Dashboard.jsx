import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';
import { queuedToast } from '../lib/toastQueue';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { socket, isConnected } = useSocket();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Failed to fetch dashboard metrics.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Listen for real-time dashboard refresh events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDashboardRefresh = () => {
      console.log('Dashboard refresh event received');
      fetchStats();
    };

    const handleIssueCreated = (data) => {
      console.log('New issue created:', data);
      fetchStats();
      queuedToast.success('New issue reported!');
    };

    const handleIssueResolved = (data) => {
      console.log('Issue resolved:', data);
      fetchStats();
      queuedToast.success('Issue resolved successfully!');
    };

    const handleAssetCreated = (data) => {
      console.log('New asset created:', data);
      fetchStats();
      queuedToast.success('New asset added!');
    };

    socket.on('dashboard:refresh', handleDashboardRefresh);
    socket.on('issue:created', handleIssueCreated);
    socket.on('issue:resolved', handleIssueResolved);
    socket.on('asset:created', handleAssetCreated);

    return () => {
      socket.off('dashboard:refresh', handleDashboardRefresh);
      socket.off('issue:created', handleIssueCreated);
      socket.off('issue:resolved', handleIssueResolved);
      socket.off('asset:created', handleAssetCreated);
    };
  }, [socket, isConnected, fetchStats]);

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim().toUpperCase();
    if (query.startsWith('AST-')) {
      navigate(`/assets?search=${encodeURIComponent(query)}`);
    } else if (query.startsWith('ISS-')) {
      navigate(`/issues?search=${encodeURIComponent(query)}`);
    } else {
      navigate(`/assets?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-[var(--text-secondary)]">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col justify-center items-center p-6">
        <div className="bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger)] p-6 rounded-xl max-w-md text-center space-y-4">
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={fetchStats}
            className="w-full text-xs py-2 rounded-lg border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-colors cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-6 transition-colors">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border)] pb-6">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
              Operational Control
            </h1>
            <p className="text-xs text-[var(--text-secondary)] font-light mt-1">
              Real-time asset telemetry, technician dispatch queues, and maintenance history pipelines.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/assets')}
              className="btn-accent text-xs px-4 py-2"
            >
              Assets Catalog
            </button>
            <button
              onClick={() => navigate('/issues')}
              className="text-xs px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] bg-[var(--surface)] transition-colors cursor-pointer"
            >
              Issues Board
            </button>
          </div>
        </div>

        {/* Global Search */}
        <form onSubmit={handleGlobalSearch} className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl flex gap-3 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search assets or issues (e.g. AST-0001, ISS-0002, or general term)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-base font-mono-code"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold"
              >
                &times;
              </button>
            )}
          </div>
          <button
            type="submit"
            className="text-xs px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] bg-[var(--surface-raised)] transition-colors cursor-pointer font-semibold whitespace-nowrap"
          >
            Search
          </button>
        </form>

        {/* Metric Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Total Assets */}
          <div
            onClick={() => navigate('/assets')}
            className="bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] p-5 rounded-xl cursor-pointer transition-all group col-span-1"
          >
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold group-hover:text-[var(--accent)] transition-colors">
              Total Assets
            </p>
            <p className="text-3xl font-extrabold text-[var(--text-primary)] mt-2 font-mono-code">
              {stats?.totalAssets || 0}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-light">View catalog &rarr;</p>
          </div>

          {/* Open Issues */}
          <div
            onClick={() => navigate('/issues?status=Reported,Assigned,Inspection Started,Maintenance In Progress,Waiting for Parts,Reopened')}
            className="bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] p-5 rounded-xl cursor-pointer transition-all group col-span-1"
          >
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold group-hover:text-[var(--accent)] transition-colors">
              Open Incidents
            </p>
            <p className="text-3xl font-extrabold text-[var(--text-primary)] mt-2 font-mono-code">
              {stats?.openIssues || 0}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-light">Awaiting action &rarr;</p>
          </div>

          {/* Critical */}
          <div
            onClick={() => navigate('/issues?priority=Critical')}
            className={`border p-5 rounded-xl cursor-pointer transition-all group col-span-1 ${
              (stats?.criticalIssues || 0) > 0
                ? 'bg-[var(--critical-bg)] border-[var(--danger)]'
                : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]'
            }`}
          >
            <p className={`text-[10px] uppercase tracking-widest font-bold transition-colors ${
              (stats?.criticalIssues || 0) > 0 ? 'text-[var(--danger)] animate-pulse' : 'text-[var(--text-secondary)] group-hover:text-[var(--accent)]'
            }`}>
              Critical
            </p>
            <p className={`text-3xl font-extrabold mt-2 font-mono-code ${
              (stats?.criticalIssues || 0) > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'
            }`}>
              {stats?.criticalIssues || 0}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-light">Risk overrides &rarr;</p>
          </div>

          {/* Resolved 7d */}
          <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-xl col-span-1">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">Resolved (7d)</p>
            <p className="text-3xl font-extrabold text-[var(--text-primary)] mt-2 font-mono-code">
              {stats?.resolvedThisWeek || 0}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-light">Closed tasks</p>
          </div>

          {/* Avg Resolution */}
          <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-xl col-span-1">
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">Avg Speed</p>
            <p className="text-3xl font-extrabold text-[var(--text-primary)] mt-2 font-mono-code">
              {stats?.avgResolutionTime !== undefined ? `${stats.avgResolutionTime}h` : '0h'}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-light">Triage-to-close</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => navigate('/assets')}
            className="p-6 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-xl cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-[var(--accent)] text-[var(--accent-contrast)] text-[10px] font-black flex items-center justify-center">A</span>
              Asset Registry Index
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-light leading-relaxed">
              Verify real-time conditions of all managed equipment. Perform full CRUD operations or acquire QR codes here.
            </p>
          </div>
          <div
            onClick={() => navigate('/issues')}
            className="p-6 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-xl cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)] text-[10px] font-black flex items-center justify-center">I</span>
              Incident Dispatch Desk
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-light leading-relaxed">
              Update issue reports, configure ownership dispatch filters, and launch diagnostic state transitions on pending tickets.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
