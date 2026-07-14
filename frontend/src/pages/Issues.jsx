import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';
import { queuedToast } from '../lib/toastQueue';
import { Search, Filter, AlertTriangle, ArrowRight, User } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_OPTIONS = ['Reported', 'Assigned', 'Inspection Started', 'Maintenance In Progress', 'Waiting for Parts', 'Resolved', 'Closed', 'Reopened'];

function IssueBadge({ status }) {
  const map = {
    'Reported':               'badge badge-reported',
    'Assigned':               'badge badge-assigned',
    'Inspection Started':     'badge badge-inspection',
    'Maintenance In Progress':'badge badge-maintenance',
    'Waiting for Parts':      'badge badge-waiting',
    'Resolved':               'badge badge-resolved',
    'Closed':                 'badge badge-closed',
    'Reopened':               'badge badge-reopened',
  };
  return <span className={map[status] || 'badge badge-closed'}>{status}</span>;
}

function PriorityBadge({ priority }) {
  const map = {
    'Low':      'badge badge-low',
    'Medium':   'badge badge-medium',
    'High':     'badge badge-high',
    'Critical': 'badge badge-critical',
  };
  return <span className={map[priority] || 'badge badge-low'}>{priority}</span>;
}

export default function Issues() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qSearch = searchParams.get('search') || '';
  const qStatus = searchParams.get('status') || '';
  const qPriority = searchParams.get('priority') || '';

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(qStatus);
  const [priority, setPriority] = useState(qPriority);
  const [search, setSearch] = useState(qSearch);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { socket } = useSocket();

  const fetchTechnicians = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${API_URL}/auth/technicians`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTechnicians(res.data.data || []);
    } catch (e) {
      console.error('Failed to load technicians:', e);
    }
  }, []);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (selectedTech) params.technician = selectedTech;
      if (search) params.search = search;

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${API_URL}/issues`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setIssues(res.data.data);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to load issues.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [status, priority, selectedTech, search]);

  useEffect(() => {
    setStatus(qStatus);
    setPriority(qPriority);
    setSearch(qSearch);
  }, [qStatus, qPriority, qSearch]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setIsAdmin(user.role === 'admin');
    if (user.role === 'admin') fetchTechnicians();
  }, [fetchTechnicians]);

  useEffect(() => {
    if (socket) {
      const refetch = () => fetchIssues();
      socket.on('issue:created', () => { refetch(); queuedToast.success('New issue reported!'); });
      socket.on('issue:assigned', () => refetch());
      socket.on('issue:unassigned', () => refetch());
      socket.on('issue:status_updated', () => refetch());
      socket.on('maintenance:logged', () => refetch());
      socket.on('issue:resolved', () => refetch());

      return () => {
        socket.off('issue:created');
        socket.off('issue:assigned');
        socket.off('issue:unassigned');
        socket.off('issue:status_updated');
        socket.off('maintenance:logged');
        socket.off('issue:resolved');
      };
    }
  }, [socket, fetchIssues]);

  useEffect(() => {
    fetchIssues();
  }, [status, priority, selectedTech, fetchIssues]); // Fixed deps

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') fetchIssues();
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] p-4 md:p-6 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight">Issues Board</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
              Review incident reports and manage dispatch queues.
            </p>
          </div>
          <button
            onClick={() => navigate('/assets')}
            className="btn-secondary text-xs"
          >
            Asset Catalog &rarr;
          </button>
        </div>

        {/* Filter Bar */}
        <div className="card p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search ID, title, or asset..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                className="input-base pl-9 font-mono-code text-sm"
              />
            </div>
            
            <div className="flex gap-3 flex-wrap md:flex-nowrap">
              <div className="relative flex-1 md:flex-none min-w-[140px]">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input-base pl-9 text-sm cursor-pointer appearance-none"
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="relative flex-1 md:flex-none min-w-[140px]">
                <AlertTriangle className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="input-base pl-9 text-sm cursor-pointer appearance-none"
                >
                  <option value="">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {isAdmin && (
                <div className="relative flex-1 md:flex-none min-w-[160px]">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
                  <select
                    value={selectedTech}
                    onChange={(e) => setSelectedTech(e.target.value)}
                    className="input-base pl-9 text-sm cursor-pointer appearance-none"
                  >
                    <option value="">All Technicians</option>
                    {technicians.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
             {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 skeleton rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger)] rounded-xl text-center font-medium">
            {error}
          </div>
        ) : issues.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface)]">
             <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center mx-auto mb-4 text-[var(--text-tertiary)]">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No issues found</h3>
            <p className="text-sm text-[var(--text-secondary)]">Adjust your filters to see more results.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden lg:block">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--surface-raised)] border-b border-[var(--border)] text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                    <th className="px-5 py-4 w-32">Issue ID</th>
                    <th className="px-5 py-4 w-48">Asset</th>
                    <th className="px-5 py-4">Summary</th>
                    <th className="px-5 py-4 w-32">Priority</th>
                    <th className="px-5 py-4 w-40">Status</th>
                    <th className="px-5 py-4 w-40">Assignee</th>
                    <th className="px-5 py-4 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {issues.map(issue => {
                    const isCritical = issue.priority === 'Critical';
                    return (
                      <tr
                        key={issue._id}
                        onClick={() => navigate(`/issues/${issue._id}`)}
                        className={`hover:bg-[var(--surface-raised)] transition-colors cursor-pointer group ${isCritical ? 'bg-[var(--critical-bg)] hover:bg-[var(--danger-muted)]' : ''}`}
                      >
                        <td className="px-5 py-4 font-mono-code font-bold text-[var(--text-primary)]">
                          {issue.issueNumber}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[var(--text-primary)] truncate max-w-[160px]">{issue.asset?.name || 'Unknown'}</div>
                          <div className="font-mono-code text-[11px] text-[var(--text-secondary)] mt-0.5">{issue.asset?.assetCode || '—'}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-[var(--text-primary)] truncate max-w-sm">{issue.title}</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">By {issue.reporterName}</div>
                        </td>
                        <td className="px-5 py-4"><PriorityBadge priority={issue.priority} /></td>
                        <td className="px-5 py-4"><IssueBadge status={issue.status} /></td>
                        <td className="px-5 py-4 text-[var(--text-secondary)] font-medium">
                          {issue.assignedTechnician ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[9px] uppercase font-bold text-[var(--text-primary)]">
                                {issue.assignedTechnician.name.charAt(0)}
                              </div>
                              <span className="truncate max-w-[100px]">{issue.assignedTechnician.name}</span>
                            </div>
                          ) : (
                            <span className="italic text-[var(--text-tertiary)]">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards */}
            <div className="lg:hidden divide-y divide-[var(--border)]">
              {issues.map(issue => {
                const isCritical = issue.priority === 'Critical';
                return (
                  <div
                    key={issue._id}
                    onClick={() => navigate(`/issues/${issue._id}`)}
                    className={`p-4 space-y-3 transition-colors cursor-pointer ${isCritical ? 'bg-[var(--critical-bg)] active:bg-[var(--danger-muted)]' : 'hover:bg-[var(--surface-raised)] active:bg-[var(--surface-hover)]'}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-mono-code font-bold text-[var(--text-primary)] text-sm">{issue.issueNumber}</span>
                      <IssueBadge status={issue.status} />
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-[var(--text-primary)] text-base leading-tight mb-1">{issue.title}</h4>
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                        Asset: <span className="font-mono-code font-semibold text-[var(--text-primary)]">{issue.asset?.assetCode}</span>
                        <span className="truncate max-w-[120px]">({issue.asset?.name})</span>
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-[var(--border)] border-dashed">
                      <PriorityBadge priority={issue.priority} />
                      <div className="text-xs flex items-center gap-1.5 text-[var(--text-secondary)]">
                         <User className="w-3.5 h-3.5" />
                         <span className="font-medium">{issue.assignedTechnician?.name || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
