import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';
import { queuedToast } from '../lib/toastQueue';
import { Activity, AlertTriangle, CheckCircle2, Clock, PackageSearch, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

function MetricCard({ title, value, subtitle, icon: Icon, onClick, variant = 'default', delay = 0 }) {
  const isCritical = variant === 'critical' && value > 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      onClick={onClick}
      className={`relative p-5 rounded-xl cursor-pointer transition-all group overflow-hidden ${
        isCritical
          ? 'bg-[var(--critical-bg)] border border-[var(--critical-border)]'
          : 'card hover:border-[var(--accent)] hover:shadow-md'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <p className={`text-xs font-semibold uppercase tracking-wider ${
          isCritical ? 'text-[var(--danger)] animate-pulse' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors'
        }`}>
          {title}
        </p>
        <div className={`p-2 rounded-lg ${isCritical ? 'bg-[var(--danger-muted)] text-[var(--danger)]' : 'bg-[var(--surface-raised)] text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors'}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      
      <p className={`text-3xl font-bold tracking-tight font-mono-code ${
        isCritical ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'
      }`}>
        {value}
      </p>
      <p className="text-xs text-[var(--text-secondary)] mt-2 font-medium flex items-center gap-1">
        {subtitle}
      </p>
    </motion.div>
  );
}

function SkeletonMetricCard() {
  return (
    <div className="card p-5">
      <div className="flex justify-between items-start mb-4">
        <div className="w-24 h-4 skeleton" />
        <div className="w-8 h-8 skeleton rounded-lg" />
      </div>
      <div className="w-16 h-8 skeleton mb-2" />
      <div className="w-32 h-3 skeleton" />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { socket, isConnected } = useSocket();

  const fetchStats = useCallback(async () => {
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

    const handleDashboardRefresh = () => fetchStats();
    const handleIssueCreated = () => { fetchStats(); queuedToast.success('New issue reported!'); };
    const handleIssueResolved = () => { fetchStats(); queuedToast.success('Issue resolved successfully!'); };
    const handleAssetCreated = () => { fetchStats(); queuedToast.success('New asset added!'); };

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

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)] flex flex-col justify-center items-center p-6">
        <div className="bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger)] p-6 rounded-xl max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-8 h-8 mx-auto" />
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchStats(); }}
            className="btn-danger w-full mt-2"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] p-4 md:p-6 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Operational Control
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
              Real-time asset telemetry, technician dispatch queues, and maintenance pipelines.
            </p>
          </div>
          <div className="flex gap-2.5 w-full md:w-auto">
            <button
              onClick={() => navigate('/assets')}
              className="btn-secondary flex-1 md:flex-none text-xs px-4"
            >
              Assets Catalog
            </button>
            <button
              onClick={() => navigate('/issues')}
              className="btn-accent flex-1 md:flex-none text-xs px-4"
            >
              Issues Board
            </button>
          </div>
        </div>

        {/* Global Search */}
        <form onSubmit={handleGlobalSearch} className="card p-2 md:p-2.5 flex gap-2 items-center">
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search AST-0001, ISS-0002, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-[var(--text-primary)] text-sm py-2 pl-10 pr-10 outline-none font-mono-code placeholder:font-sans placeholder:text-[var(--text-tertiary)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors rounded-md hover:bg-[var(--surface-raised)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="btn-secondary px-5 py-2 text-sm whitespace-nowrap hidden md:block"
          >
            Search
          </button>
        </form>

        {/* Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonMetricCard key={i} />)
          ) : (
            <>
              <MetricCard
                title="Total Assets"
                value={stats?.totalAssets || 0}
                subtitle="View catalog &rarr;"
                icon={PackageSearch}
                onClick={() => navigate('/assets')}
                delay={0.1}
              />
              <MetricCard
                title="Open Incidents"
                value={stats?.openIssues || 0}
                subtitle="Awaiting action &rarr;"
                icon={Activity}
                onClick={() => navigate('/issues?status=Reported,Assigned,Inspection Started,Maintenance In Progress,Waiting for Parts,Reopened')}
                delay={0.2}
              />
              <MetricCard
                title="Critical Incidents"
                value={stats?.criticalIssues || 0}
                subtitle="Risk overrides &rarr;"
                icon={AlertTriangle}
                variant="critical"
                onClick={() => navigate('/issues?priority=Critical')}
                delay={0.3}
              />
              <MetricCard
                title="Resolved (7d)"
                value={stats?.resolvedThisWeek || 0}
                subtitle={`Avg ${stats?.avgResolutionTime !== undefined ? `${stats.avgResolutionTime}h` : '0h'} to close`}
                icon={CheckCircle2}
                onClick={() => navigate('/issues?status=Resolved,Closed')}
                delay={0.4}
              />
            </>
          )}
        </div>

      </div>
    </div>
  );
}
