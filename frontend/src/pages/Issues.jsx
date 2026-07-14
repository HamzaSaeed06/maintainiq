import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';
import { queuedToast } from '../lib/toastQueue';

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
  const { socket, isConnected } = useSocket();

  // Debug: Log socket connection status
  useEffect(() => {
    console.log('[Issues Page] Socket connection status:', isConnected);
    console.log('[Issues Page] Socket object:', socket);
  }, [socket, isConnected]);

  const fetchTechnicians = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${API_URL}/auth/technicians`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTechnicians(res.data.data || []);
    } catch (e) {
      console.error('Failed to load technicians list:', e);
      toast.error('Failed to retrieve technicians list');
    }
  }, []);

  const fetchIssues = useCallback(async () => {
    console.log('[Issues Page] fetchIssues called');
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
      console.log('[Issues Page] Fetching issues with params:', params);
      
      const res = await axios.get(`${API_URL}/issues`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('[Issues Page] API response:', res.data);
      console.log('[Issues Page] Issues received:', res.data.data?.length || 0);
      
      setIssues(res.data.data);
    } catch (err) {
      console.error('[Issues Page] Fetch error:', err);
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

  // Listen for real-time issue updates
  useEffect(() => {
    console.log('[Issues Page] Socket listener useEffect running');
    console.log('[Issues Page] Socket exists:', !!socket);
    console.log('[Issues Page] Is connected:', isConnected);
    console.log('[Issues Page] Current user role:', isAdmin ? 'admin' : 'technician/other');

    const handleIssueCreated = (data) => {
      console.log('[Issues Page] New issue created:', data);
      console.log('[Issues Page] Calling fetchIssues()');
      fetchIssues();
      queuedToast.success('New issue reported!');
    };

    const handleIssueAssigned = (data) => {
      console.log('[Issues Page] Issue assigned:', data);
      console.log('[Issues Page] Calling fetchIssues()');
      fetchIssues();
      
      // Only show toast if current user is the assigned technician
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('[Issues Page] Current user ID:', currentUser._id);
      console.log('[Issues Page] Assigned technician:', data.assignedTechnician);
      
      // Handle both string ID and object with _id
      const assignedTechnicianId = typeof data.assignedTechnician === 'string' 
        ? data.assignedTechnician 
        : data.assignedTechnician?._id;
      
      console.log('[Issues Page] Assigned technician ID:', assignedTechnicianId);
      
      if (assignedTechnicianId && assignedTechnicianId === currentUser._id) {
        console.log('[Issues Page] Showing toast for assigned technician');
        queuedToast.success('New issue assigned to you!');
      } else {
        console.log('[Issues Page] Not showing toast - not assigned to this user');
      }
    };

    const handleIssueStatusUpdated = (data) => {
      console.log('[Issues Page] Issue status updated:', data);
      console.log('[Issues Page] Calling fetchIssues()');
      fetchIssues();
    };

    const handleMaintenanceLogged = (data) => {
      console.log('[Issues Page] Maintenance logged:', data);
      console.log('[Issues Page] Calling fetchIssues()');
      fetchIssues();
      queuedToast.success('Maintenance work logged!');
    };

    const handleIssueResolved = (data) => {
      console.log('[Issues Page] Issue resolved:', data);
      console.log('[Issues Page] Calling fetchIssues()');
      fetchIssues();
      queuedToast.success('Issue resolved successfully!');
    };

    const handleIssueUnassigned = (data) => {
      console.log('[Issues Page] Issue unassigned:', data);
      console.log('[Issues Page] Calling fetchIssues()');
      fetchIssues();
      
      // Show toast if current user was the assigned technician
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('[Issues Page] Current user ID:', currentUser._id);
      
      if (currentUser._id) {
        console.log('[Issues Page] Issue unassigned notification');
        queuedToast.success('Issue unassigned');
      }
    };

    // Set up listeners even if socket is not connected yet
    if (socket) {
      console.log('[Issues Page] Registering socket listeners');
      socket.on('issue:created', handleIssueCreated);
      socket.on('issue:assigned', handleIssueAssigned);
      socket.on('issue:unassigned', handleIssueUnassigned);
      socket.on('issue:status_updated', handleIssueStatusUpdated);
      socket.on('maintenance:logged', handleMaintenanceLogged);
      socket.on('issue:resolved', handleIssueResolved);
      console.log('[Issues Page] Socket listeners registered');
    } else {
      console.log('[Issues Page] Socket not available, listeners not registered');
    }

    return () => {
      if (socket) {
        socket.off('issue:created', handleIssueCreated);
        socket.off('issue:assigned', handleIssueAssigned);
        socket.off('issue:unassigned', handleIssueUnassigned);
        socket.off('issue:status_updated', handleIssueStatusUpdated);
        socket.off('maintenance:logged', handleMaintenanceLogged);
        socket.off('issue:resolved', handleIssueResolved);
        console.log('[Issues Page] Socket listeners cleaned up');
      }
    };
  }, [socket, fetchIssues, isAdmin]); // Removed isConnected dependency to ensure listeners are set up

  useEffect(() => {
    fetchIssues();
  }, [status, priority, selectedTech]);

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') fetchIssues();
  };

  const labelClass = 'text-[10px] text-[var(--text-secondary)] block uppercase tracking-wider font-semibold mb-1';

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-6 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border)] pb-5">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Issues Board</h1>
            <p className="text-sm text-[var(--text-secondary)] font-light mt-0.5">
              Review and manage logged incident reports and technician logs.
            </p>
          </div>
          <button
            onClick={() => navigate('/assets')}
            className="text-xs px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] bg-[var(--surface)] transition-colors cursor-pointer"
          >
            &larr; Assets Catalog
          </button>
        </div>

        {/* Filter controls */}
        <div className={`grid grid-cols-1 gap-3 bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl ${isAdmin ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          <div>
            <label className={labelClass}>Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="ID or title, press Enter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                className="input-base font-mono-code text-xs py-1.5"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setTimeout(fetchIssues, 0); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-base text-xs py-1.5 cursor-pointer"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="input-base text-xs py-1.5 cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {isAdmin && (
            <div>
              <label className={labelClass}>Technician</label>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="input-base text-xs py-1.5 cursor-pointer"
              >
                <option value="">All Technicians</option>
                {technicians.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={fetchIssues}
              className="btn-accent w-full py-1.5 text-xs"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-12 text-center text-[var(--text-secondary)]">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Fetching incidents...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger)] rounded-xl text-center text-xs">
            {error}
          </div>
        ) : issues.length === 0 ? (
          <div className="py-12 border border-dashed border-[var(--border)] rounded-xl text-center text-[var(--text-secondary)]">
            <p className="text-sm font-light">No issues match the current filters.</p>
          </div>
        ) : (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
            {/* Desktop table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[var(--surface-raised)] border-b border-[var(--border)] text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">
                    <th className="p-4">Issue #</th>
                    <th className="p-4">Asset</th>
                    <th className="p-4">Summary</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-xs">
                  {issues.map(issue => {
                    const isCritical = issue.priority === 'Critical';
                    return (
                      <tr
                        key={issue._id}
                        className={`hover:bg-[var(--surface-raised)] transition-colors cursor-pointer ${isCritical ? 'border-l-4 border-l-[var(--danger)]' : ''}`}
                        onClick={() => navigate(`/issues/${issue._id}`)}
                      >
                        <td className="p-4 font-mono-code font-bold text-[var(--text-primary)] uppercase select-all text-xs">
                          {issue.issueNumber}
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-[var(--text-primary)]">{issue.asset?.name || 'Unknown'}</p>
                          <p className="font-mono-code text-[10px] text-[var(--text-secondary)] mt-0.5">{issue.asset?.assetCode || '—'}</p>
                        </td>
                        <td className="p-4 max-w-xs">
                          <p className="font-medium text-[var(--text-primary)] truncate">{issue.title}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 italic">By: {issue.reporterName}</p>
                        </td>
                        <td className="p-4"><PriorityBadge priority={issue.priority} /></td>
                        <td className="p-4"><IssueBadge status={issue.status} /></td>
                        <td className="p-4 text-[var(--text-secondary)]">
                          {issue.assignedTechnician?.name || <span className="italic">Unassigned</span>}
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/issues/${issue._id}`)}
                            className="px-3 py-1 rounded-md text-[10px] font-semibold text-[var(--accent)] border border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)] transition-all cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[var(--border)]">
              {issues.map(issue => {
                const isCritical = issue.priority === 'Critical';
                return (
                  <div
                    key={issue._id}
                    className={`p-4 space-y-3 active:bg-[var(--surface-raised)] transition-all cursor-pointer ${isCritical ? 'border-l-4 border-l-[var(--danger)]' : ''}`}
                    onClick={() => navigate(`/issues/${issue._id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono-code font-bold text-[var(--text-primary)] uppercase text-xs">{issue.issueNumber}</span>
                      <IssueBadge status={issue.status} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)] text-sm">{issue.title}</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Asset: <span className="font-mono-code text-[var(--accent)]">{issue.asset?.assetCode}</span> ({issue.asset?.name})
                      </p>
                    </div>
                    <div className="flex justify-between items-center text-[10px] pt-1">
                      <PriorityBadge priority={issue.priority} />
                      <span className="text-[var(--text-secondary)]">
                        Assignee: <span className="text-[var(--text-primary)] font-medium">{issue.assignedTechnician?.name || 'None'}</span>
                      </span>
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
