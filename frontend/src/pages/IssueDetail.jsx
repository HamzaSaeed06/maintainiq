import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  'Reported': 'Incident Reported',
  'Assigned': 'Work Assigned',
  'Inspection Started': 'Under Inspection',
  'Maintenance In Progress': 'Under Maintenance',
  'Waiting for Parts': 'Waiting for Parts',
  'Resolved': 'Issue Resolved',
  'Closed': 'Incident Closed',
  'Reopened': 'Issue Reopened',
};

function IssueBadge({ status }) {
  const map = {
    'Reported':               'badge badge-reported text-xs font-semibold',
    'Assigned':               'badge badge-assigned text-xs font-semibold',
    'Inspection Started':     'badge badge-inspection text-xs font-semibold',
    'Maintenance In Progress':'badge badge-maintenance text-xs font-semibold',
    'Waiting for Parts':      'badge badge-waiting text-xs font-semibold',
    'Resolved':               'badge badge-resolved text-xs font-semibold',
    'Closed':                 'badge badge-closed text-xs font-semibold',
    'Reopened':               'badge badge-reopened text-xs font-semibold',
  };
  return <span className={map[status] || 'badge badge-closed text-xs font-semibold'}>{STATUS_LABELS[status] || status}</span>;
}

function PriorityBadge({ priority }) {
  const map = {
    'Low':      'badge badge-low text-xs',
    'Medium':   'badge badge-medium text-xs',
    'High':     'badge badge-high text-xs',
    'Critical': 'badge badge-critical text-xs shadow-[0_0_12px_rgba(var(--danger-rgb),0.35)]',
  };
  return <span className={map[priority] || 'badge badge-low text-xs'}>{priority} Priority</span>;
}

export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [_currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAssignedTech, setIsAssignedTech] = useState(false);

  const [technicians, setTechnicians] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const [showLogModal, setShowLogModal] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState('');
  
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [cost, setCost] = useState(0);
  const [finalCondition, setFinalCondition] = useState('Good');
  const [startedAt, setStartedAt] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [partsInput, setPartsInput] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [nextServiceDate, setNextServiceDate] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    setIsAdmin(user.role === 'admin');
    fetchIssueDetails();
    if (user.role === 'admin') {
      fetchTechnicianUsers();
    }
  }, [id]);

  const fetchIssueDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${API_URL}/issues/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data.data;
      setIssue(data.issue);
      setLogs(data.logs || []);
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setIsAssignedTech(data.issue.assignedTechnician?._id === user.id);
      
      if (data.issue.assignedTechnician) {
        setAssigneeId(data.issue.assignedTechnician._id);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch issue details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicianUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.get(`${API_URL}/auth/technicians`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTechnicians(res.data.data || []);
    } catch (e) {
      console.error('Failed to load technician users:', e);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault(); // Prevent form submission
    const freshId = e.target.value;
    setAssigneeId(freshId);
    // Don't auto-assign on select change, wait for button click
  };

  const handleAssignClick = async () => {
    if (!assigneeId) {
      toast.error('Please select a technician first');
      return;
    }

    setAssignLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await axios.patch(
        `${API_URL}/issues/${id}/assign`,
        { technicianId: assigneeId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Technician assigned successfully.');
      fetchIssueDetails();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to assign technician.';
      toast.error(msg);
      setError(msg);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignClick = async () => {
    if (!issue.assignedTechnician) {
     toast.error('No technician assigned to this issue');
      return;
    }

    setAssignLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await axios.patch(
        `${API_URL}/issues/${id}/unassign`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Technician unassigned successfully.');
      setAssigneeId('');
      fetchIssueDetails();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to unassign technician.';
      toast.error(msg);
      setError(msg);
    } finally {
      setAssignLoading(false);
    }
  };

  const executeStatusTransition = async (newStatus) => {
    setStatusLoading(true);
    setStatusError('');
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const payload = { status: newStatus };
      if (newStatus === 'Resolved' && nextServiceDate) {
        payload.nextServiceDate = nextServiceDate;
      }

      await axios.patch(
        `${API_URL}/issues/${id}/status`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Status updated to "${newStatus}".`);
      fetchIssueDetails();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to transition issue status.';
      toast.error(msg);
      setStatusError(msg);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAddMaintenanceLog = async (e) => {
    e.preventDefault();
    setLogError('');
    setLogLoading(true);

    if (!inspectionNotes.trim() || !workPerformed.trim() || !startedAt || !completedAt) {
      setLogError('All primary description texts and date times are required.');
      setLogLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const formData = new FormData();
      formData.append('inspectionNotes', inspectionNotes);
      formData.append('workPerformed', workPerformed);
      formData.append('cost', cost);
      formData.append('finalCondition', finalCondition);
      formData.append('startedAt', startedAt);
      formData.append('completedAt', completedAt);

      if (partsInput.trim()) {
        const parts = partsInput.split(',').map(p => p.trim()).filter(Boolean);
        formData.append('partsUsed', JSON.stringify(parts));
      }

      for (let i = 0; i < evidenceFiles.length; i++) {
        formData.append('evidence', evidenceFiles[i]);
      }

      await axios.post(
        `${API_URL}/issues/${id}/maintenance-log`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setShowLogModal(false);
      setInspectionNotes('');
      setWorkPerformed('');
      setCost(0);
      setPartsInput('');
      setEvidenceFiles([]);
      setStartedAt('');
      setCompletedAt('');

      toast.success('Maintenance log saved. Issue marked as Resolved.');
      toast.success('📧 Resolution notification email sent to reporter.');
      fetchIssueDetails();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to save maintenance records.';
      toast.error(msg);
      setLogError(msg);
    } finally {
      setLogLoading(false);
    }
  };

  const labelClass = 'text-[11px] text-[var(--text-secondary)] block uppercase tracking-wider font-semibold mb-1';

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 transition-colors">
        <div className="text-center text-[var(--text-secondary)]">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Gathering incident details...</p>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 transition-colors">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-center max-w-sm w-full select-none">
          <p className="text-sm font-semibold text-[var(--danger)] mb-4">{error || 'Incident file not found'}</p>
          <button onClick={() => navigate('/issues')} className="btn-accent px-4 py-2 text-xs rounded-xl">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isCritical = issue.priority === 'Critical';

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] p-4 md:p-6 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Back navigation + Status */}
        <div className="flex justify-between items-center pb-2">
          <button onClick={() => navigate('/issues')} className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] font-semibold transition-colors flex items-center gap-1">
            &larr; Back to Dispatch Board
          </button>
          
          <IssueBadge status={issue.status} />
        </div>

        {/* Issue Details Card */}
        <div className={`card p-6 space-y-6 ${isCritical ? 'border-2 border-[var(--danger)] shadow-[0_0_20px_rgba(var(--danger-rgb),0.08)]' : ''}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[var(--border)]">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-mono-code font-bold text-[var(--text-secondary)] text-sm uppercase">{issue.issueNumber}</span>
                <PriorityBadge priority={issue.priority} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{issue.title}</h2>
            </div>
            
            {isAdmin && (
              <div className="w-full md:w-auto flex gap-2">
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block font-bold mb-1.5">Assign Technician</label>
                  <select
                    value={assigneeId}
                    onChange={handleAssign}
                    disabled={assignLoading}
                    className="input-base text-xs py-2 w-full md:w-56 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {technicians.map(t => <option key={t._id} value={t._id}>{t.name} ({t.email})</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAssignClick}
                    disabled={assignLoading || !assigneeId}
                    className="btn-accent px-4 py-2 text-xs h-[34px] mt-auto"
                  >
                    {assignLoading ? '...' : 'Assign'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h3 className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold mb-2">Linked Asset</h3>
              <div className="bg-[var(--surface-raised)] p-4 border border-[var(--border)] rounded-xl space-y-1.5">
                <p className="text-xs font-semibold text-[var(--text-primary)]">{issue.asset?.name || 'Asset Deleted'}</p>
                <p className="text-[11px] text-[var(--text-secondary)] flex gap-2">
                  <span>Code: <Link to={`/assets/${issue.asset?._id}`} className="font-mono-code text-[var(--accent)] hover:underline font-semibold">{issue.asset?.assetCode}</Link></span>
                  <span>|</span>
                  <span>Category: <strong>{issue.asset?.category}</strong></span>
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">Location: {issue.asset?.location || 'Unknown'}</p>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold mb-2">Reporter Information</h3>
              <div className="bg-[var(--surface-raised)] p-4 border border-[var(--border)] rounded-xl space-y-1.5">
                <p className="text-xs text-[var(--text-primary)]">Name: <strong className="font-semibold">{issue.reporterName}</strong></p>
                <p className="text-xs text-[var(--text-secondary)]">Contact: {issue.reporterContact || <span className="italic text-[var(--text-secondary)]">None provided</span>}</p>
                <p className="text-[10px] text-[var(--text-secondary)] font-mono-code">Logged: {new Date(issue.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Complaint Description</h3>
            <p className="bg-[var(--surface-raised)] p-4 border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] font-light leading-6 italic">
              &ldquo;{issue.description}&rdquo;
            </p>
          </div>

          {/* Evidence photos */}
          {issue.evidenceUrls && issue.evidenceUrls.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Logged Evidence Photos</h3>
              <div className="grid grid-cols-2 gap-4">
                {issue.evidenceUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block border border-[var(--border)] hover:border-[var(--accent)] rounded-xl overflow-hidden cursor-zoom-in shadow-sm transition-colors">
                    <img src={url} alt={`Evidence #${i+1}`} className="w-full h-32 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI triage assist suggestions */}
          {issue.aiSuggestion && (
            <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-4.5 space-y-3">
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
                <h4 className="text-[10px] font-bold text-[var(--accent)] tracking-wider uppercase">💡 Gemini AI Triage Logs</h4>
                {issue.aiSuggestion.wasEdited ? (
                  <span className="text-[9px] bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] rounded px-1.5 py-0.5">Edited by reporter</span>
                ) : (
                  <span className="text-[9px] bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 rounded px-1.5 py-0.5">Matched Suggestion</span>
                )}
              </div>
              <div className="text-xs space-y-2 text-[var(--text-primary)] font-light">
                <p><span className="text-[var(--text-secondary)] uppercase text-[10px] font-semibold mr-1.5">Triage Title:</span> {issue.aiSuggestion.title}</p>
                <div>
                  <span className="text-[var(--text-secondary)] uppercase text-[10px] font-semibold block mb-1">Possible Causes:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {issue.aiSuggestion.possibleCauses.map((c, i) => (
                      <span key={i} className="bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] rounded px-2 py-0.5 text-[11px]">{c}</span>
                    ))}
                  </div>
                </div>
                {issue.aiSuggestion.initialChecks && issue.aiSuggestion.initialChecks.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[var(--text-secondary)] uppercase text-[10px] font-semibold block mb-1">Recommended Safety Checks:</span>
                    <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)] italic text-[11px]">
                      {issue.aiSuggestion.initialChecks.map((ch, idx) => <li key={idx}>{ch}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Error Display */}
        {statusError && (
          <div className="bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger)] p-3.5 rounded-xl text-xs font-semibold">
            ⚠ {statusError}
          </div>
        )}

        {/* Technician Action Board */}
        {(isAssignedTech || isAdmin) && (
          <div className="card p-6 space-y-4">
            <h3 className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-bold">🔧 Technician Workflow Controls</h3>
            
            <div className="flex flex-wrap gap-3">
              {issue.status === 'Reported' && (
                <p className="text-xs text-[var(--text-secondary)] italic">Please assign a technician. Assigned technicians will see state transitions.</p>
              )}

              {issue.status === 'Assigned' && (
                <button
                  onClick={() => executeStatusTransition('Inspection Started')}
                  disabled={statusLoading}
                  className="btn-accent px-4 py-2 text-xs"
                >
                  🔍 Start On-Site Inspection
                </button>
              )}

              {issue.status === 'Inspection Started' && (
                <button
                  onClick={() => executeStatusTransition('Maintenance In Progress')}
                  disabled={statusLoading}
                  className="btn-accent px-4 py-2 text-xs bg-[var(--accent)] hover:bg-[var(--accent)]"
                >
                  🔧 Begin Repairs
                </button>
              )}

              {issue.status === 'Maintenance In Progress' && (
                <>
                  <button
                    onClick={() => executeStatusTransition('Waiting for Parts')}
                    disabled={statusLoading}
                    className="px-4 py-2 text-xs rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer font-semibold"
                  >
                    📦 Wait for Spare Parts
                  </button>
                  <button
                    onClick={() => setShowLogModal(true)}
                    className="btn-accent px-4 py-2 text-xs"
                  >
                    ✓ Log Service &amp; Resolve
                  </button>
                </>
              )}

              {issue.status === 'Waiting for Parts' && (
                <>
                  <button
                    onClick={() => executeStatusTransition('Maintenance In Progress')}
                    disabled={statusLoading}
                    className="px-4 py-2 text-xs rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer font-semibold"
                  >
                    🔧 Resume Repairs
                  </button>
                  <button
                    onClick={() => setShowLogModal(true)}
                    className="btn-accent px-4 py-2 text-xs"
                  >
                    ✓ Log Service &amp; Resolve
                  </button>
                </>
              )}

              {issue.status === 'Resolved' && (
                <>
                  <button
                    onClick={() => executeStatusTransition('Closed')}
                    disabled={statusLoading}
                    className="px-4 py-2 text-xs rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer font-semibold"
                  >
                    🔒 Close Incident File
                  </button>
                  <button
                    onClick={() => executeStatusTransition('Reopened')}
                    disabled={statusLoading}
                    className="px-4 py-2 text-xs rounded-xl bg-[var(--surface-raised)] border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--critical-bg)] transition-all cursor-pointer font-semibold"
                  >
                    reopen Issue
                  </button>
                </>
              )}

              {issue.status === 'Closed' && (
                <button
                  onClick={() => executeStatusTransition('Reopened')}
                  disabled={statusLoading}
                  className="px-4 py-2 text-xs rounded-xl bg-[var(--surface-raised)] border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--critical-bg)] transition-all cursor-pointer font-semibold"
                >
                  reopen Incident File
                </button>
              )}

              {issue.status === 'Reopened' && (
                <>
                  <button
                    onClick={() => executeStatusTransition('Assigned')}
                    disabled={statusLoading}
                    className="px-4 py-2 text-xs rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer font-semibold"
                  >
                    Re-Assign Tech
                  </button>
                  <button
                    onClick={() => executeStatusTransition('Inspection Started')}
                    disabled={statusLoading}
                    className="btn-accent px-4 py-2 text-xs"
                  >
                    🔍 Run Re-Inspection
                  </button>
                  <button
                    onClick={() => executeStatusTransition('Maintenance In Progress')}
                    disabled={statusLoading}
                    className="btn-accent px-4 py-2 text-xs"
                  >
                    🔧 Resume Maintenance
                  </button>
                </>
              )}
            </div>

            {(issue.status === 'Maintenance In Progress' || issue.status === 'Waiting for Parts') && (
              <p className="text-[10px] text-[var(--text-secondary)] font-light mt-1">
                * Note: The issue cannot transition to &ldquo;Resolved&rdquo; status until a detailed Maintenance Log is submitted.
              </p>
            )}
          </div>
        )}

        {/* Maintenance Logs list */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[var(--text-primary)] tracking-widest uppercase">📋 Maintenance Activity Log History</h3>
          
          {logs.length === 0 ? (
            <div className="border border-dashed border-[var(--border)] p-8 text-center rounded-xl text-xs text-[var(--text-secondary)] italic select-none">
              No technical maintenance actions recorded.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log._id} className="card p-5 space-y-4 text-xs">
                  <div className="flex justify-between items-start flex-wrap gap-2 border-b border-[var(--border)] pb-3">
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">Tech: {log.technician?.name || 'System'}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-mono-code">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--accent)] font-bold font-mono-code text-sm">Cost: ${log.cost}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Asset Condition: <strong className="text-[var(--text-primary)]">{log.finalCondition}</strong></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[var(--text-secondary)] uppercase tracking-wider block font-bold text-[9px] mb-1">Inspection Findings</span>
                      <p className="text-[var(--text-primary)] font-light italic leading-5">&ldquo;{log.inspectionNotes}&rdquo;</p>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)] uppercase tracking-wider block font-bold text-[9px] mb-1">Work Performed</span>
                      <p className="text-[var(--text-primary)] font-light leading-5">{log.workPerformed}</p>
                    </div>
                  </div>

                  {log.partsUsed && log.partsUsed.length > 0 && (
                    <div className="pt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-[var(--text-secondary)] text-[10px] uppercase font-bold">Components Replaced:</span>
                      <div className="flex flex-wrap gap-1">
                        {log.partsUsed.map((p, idx) => (
                          <span key={idx} className="bg-[var(--surface-raised)] border border-[var(--border)] px-2 py-0.5 rounded font-mono-code text-[10px] text-[var(--text-primary)]">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {log.evidenceUrls && log.evidenceUrls.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[var(--text-secondary)] text-[10px] uppercase font-bold block mb-1.5">Repair Proof Photos:</span>
                      <div className="flex gap-2">
                        {log.evidenceUrls.map((eUrl, eIdx) => (
                          <a key={eIdx} href={eUrl} target="_blank" rel="noreferrer" className="block border border-[var(--border)] hover:border-[var(--accent)] rounded overflow-hidden cursor-zoom-in">
                            <img src={eUrl} alt="Log evidence file" className="w-12 h-12 object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Service logs form */}
        {showLogModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
              
              <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Log Service Details</h3>
                <button onClick={() => setShowLogModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-lg leading-none cursor-pointer">&times;</button>
              </div>

              <form onSubmit={handleAddMaintenanceLog} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {logError && (
                  <div className="bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger)] p-3 rounded-lg text-xs font-semibold">
                    {logError}
                  </div>
                )}

                <div>
                  <label className={labelClass}>Inspection Findings *</label>
                  <textarea
                    required
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    rows={2}
                    className="input-base resize-none"
                    placeholder="Describe issue diagnostic findings..."
                  />
                </div>

                <div>
                  <label className={labelClass}>Work Details Performed *</label>
                  <textarea
                    required
                    value={workPerformed}
                    onChange={(e) => setWorkPerformed(e.target.value)}
                    rows={2}
                    className="input-base resize-none"
                    placeholder="Describe parts replaced, tests run, repairs made..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Work Cost ($) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={cost}
                      onChange={(e) => setCost(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="input-base"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Final Asset Condition *</label>
                    <select
                      value={finalCondition}
                      onChange={(e) => setFinalCondition(e.target.value)}
                      className="input-base cursor-pointer"
                    >
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Time Started *</label>
                    <input
                      type="datetime-local"
                      required
                      value={startedAt}
                      onChange={(e) => setStartedAt(e.target.value)}
                      className="input-base cursor-pointer text-xs"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Time Completed *</label>
                    <input
                      type="datetime-local"
                      required
                      value={completedAt}
                      onChange={(e) => setCompletedAt(e.target.value)}
                      className="input-base cursor-pointer text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Parts Replaced (Comma-separated list)</label>
                  <input
                    type="text"
                    value={partsInput}
                    onChange={(e) => setPartsInput(e.target.value)}
                    className="input-base"
                    placeholder="e.g. Capacitor, compressor fan blade, fuse"
                  />
                </div>

                <div>
                  <label className={labelClass}>Repair Proof Photos (Max 5)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))}
                    className="w-full text-xs text-[var(--text-secondary)] file:bg-[var(--surface-raised)] file:border file:border-[var(--border)] file:text-[var(--text-secondary)] file:py-2 file:px-4 file:rounded-lg file:mr-3 hover:file:text-[var(--accent)] hover:file:border-[var(--accent)] file:font-semibold cursor-pointer"
                  />
                </div>

                <div className="border-t border-[var(--border)] pt-4">
                  <label className="text-xs text-[var(--accent)] block uppercase font-bold mb-1.5">Set Next Service Schedule (Required)</label>
                  <input
                    type="date"
                    required
                    value={nextServiceDate}
                    onChange={(e) => setNextServiceDate(e.target.value)}
                    className="input-base cursor-pointer font-mono-code text-xs border-[var(--accent)]/50 focus:border-[var(--accent)]"
                  />
                  <span className="text-[10px] text-[var(--text-secondary)] italic mt-1 block">
                    * The linked asset status will revert to Operational, and next service schedules will be updated.
                  </span>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="flex-1 py-2.5 bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text-secondary)] font-semibold border border-[var(--border)] rounded-xl text-center text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={logLoading}
                    className="btn-accent flex-1 py-2.5 text-xs"
                  >
                    {logLoading ? 'Saving...' : 'Submit Log & Resolve'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
