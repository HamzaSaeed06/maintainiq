import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ChevronRight, ExternalLink, Calendar, MapPin, Tag, Wrench, ShieldAlert, Image as ImageIcon, MessageSquare, ClipboardList, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    'Reported':               'badge badge-reported text-xs',
    'Assigned':               'badge badge-assigned text-xs',
    'Inspection Started':     'badge badge-inspection text-xs',
    'Maintenance In Progress':'badge badge-maintenance text-xs',
    'Waiting for Parts':      'badge badge-waiting text-xs',
    'Resolved':               'badge badge-resolved text-xs',
    'Closed':                 'badge badge-closed text-xs',
    'Reopened':               'badge badge-reopened text-xs',
  };
  return <span className={map[status] || 'badge badge-closed text-xs'}>{STATUS_LABELS[status] || status}</span>;
}

function PriorityBadge({ priority }) {
  const map = {
    'Low':      'badge badge-low text-xs',
    'Medium':   'badge badge-medium text-xs',
    'High':     'badge badge-high text-xs',
    'Critical': 'badge badge-critical text-xs shadow-[0_0_10px_rgba(239,68,68,0.2)]',
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
      fetchIssueDetails();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to save maintenance records.';
      toast.error(msg);
      setLogError(msg);
    } finally {
      setLogLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)] p-4 md:p-6 transition-colors space-y-6">
        <div className="max-w-4xl mx-auto">
          <div className="h-4 w-48 skeleton mb-6" />
          <div className="h-[400px] skeleton rounded-xl mb-6" />
          <div className="h-[200px] skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)] flex items-center justify-center p-4 transition-colors">
        <div className="bg-[var(--critical-bg)] border border-[var(--danger)] rounded-xl p-6 text-center max-w-sm w-full">
          <ShieldAlert className="w-8 h-8 text-[var(--danger)] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--danger)] mb-4">{error || 'Incident file not found'}</p>
          <button onClick={() => navigate('/issues')} className="btn-danger w-full">
            Back to Issues Board
          </button>
        </div>
      </div>
    );
  }

  const isCritical = issue.priority === 'Critical';

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--text-primary)] p-4 md:p-6 transition-colors pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Breadcrumbs */}
        <div className="flex justify-between items-center">
           <nav className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-2">
            <Link to="/issues" className="hover:text-[var(--text-primary)] transition-colors">Issues</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[var(--text-primary)] font-mono-code">{issue.issueNumber}</span>
          </nav>
          <IssueBadge status={issue.status} />
        </div>

        {/* Issue Details Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`card p-6 md:p-8 space-y-8 ${isCritical ? 'border-2 border-[var(--danger)]' : ''}`}>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[var(--border)]">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-mono-code font-bold text-[var(--text-secondary)] bg-[var(--surface-raised)] px-2 py-0.5 rounded border border-[var(--border)] text-sm">{issue.issueNumber}</span>
                <PriorityBadge priority={issue.priority} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">{issue.title}</h1>
            </div>
            
            {isAdmin && (
              <div className="bg-[var(--surface-raised)] p-4 rounded-xl border border-[var(--border)] shrink-0 w-full md:w-auto">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Assign Technician</label>
                <div className="flex gap-2">
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    disabled={assignLoading}
                    className="input-base text-sm w-full md:w-48 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {technicians.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                  <button
                    onClick={handleAssignClick}
                    disabled={assignLoading || !assigneeId}
                    className="btn-accent px-4 py-2"
                  >
                    {assignLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                <Tag className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Asset Info</h3>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{issue.asset?.name || 'Unknown Asset'}</p>
                <Link to={`/assets/${issue.asset?._id}`} className="font-mono-code text-[11px] text-[var(--accent)] hover:underline inline-flex items-center gap-1 mt-1">
                  {issue.asset?.assetCode} <ExternalLink className="w-3 h-3" />
                </Link>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {issue.asset?.location || 'Unknown Location'}
                </p>
              </div>
            </div>

            <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                <MessageSquare className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Reporter Info</h3>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{issue.reporterName}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{issue.reporterContact || 'No contact provided'}</p>
                <p className="text-xs text-[var(--text-tertiary)] font-mono-code mt-1.5 flex items-center gap-1.5">
                   <Calendar className="w-3.5 h-3.5" /> {new Date(issue.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Description</h3>
            <div className="bg-[var(--surface-raised)] p-5 border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm leading-relaxed whitespace-pre-wrap">
              {issue.description}
            </div>
          </div>

          {issue.evidenceUrls && issue.evidenceUrls.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Evidence Photos
              </h3>
              <div className="flex flex-wrap gap-3">
                {issue.evidenceUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-xl border border-[var(--border)] hover:border-[var(--accent)] transition-colors h-32 w-48">
                    <img src={url} alt={`Evidence ${i+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ExternalLink className="w-6 h-6" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {issue.aiSuggestion && (
            <div className="bg-[var(--accent-muted)] border border-[var(--accent)]/20 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-[var(--accent)]/10 pb-3">
                <h4 className="text-xs font-bold text-[var(--accent-muted-text)] tracking-wider uppercase flex items-center gap-2">
                  ✨ AI Triage Analysis
                </h4>
                <span className="text-[10px] bg-[var(--surface)] text-[var(--text-secondary)] px-2 py-1 rounded font-medium">
                  {issue.aiSuggestion.wasEdited ? 'Edited by reporter' : 'Original Match'}
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-[var(--accent-muted-text)] uppercase tracking-wider block mb-1.5">Possible Causes</span>
                  <div className="flex flex-wrap gap-2">
                    {issue.aiSuggestion.possibleCauses.map((c, i) => (
                      <span key={i} className="bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] rounded px-2.5 py-1 text-xs font-medium shadow-sm">{c}</span>
                    ))}
                  </div>
                </div>
                
                {issue.aiSuggestion.initialChecks && issue.aiSuggestion.initialChecks.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-[var(--accent-muted-text)] uppercase tracking-wider block mb-1.5">Safety Checks</span>
                    <ul className="list-disc pl-5 space-y-1 text-[var(--text-primary)] text-sm">
                      {issue.aiSuggestion.initialChecks.map((ch, idx) => <li key={idx}>{ch}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {statusError && (
          <div className="bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger-text)] p-4 rounded-xl text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            {statusError}
          </div>
        )}

        {/* Technician Workflow Controls */}
        {(isAssignedTech || isAdmin) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6 md:p-8 space-y-5">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[var(--accent)]" /> Workflow Controls
            </h3>
            
            <div className="flex flex-wrap gap-3">
              {issue.status === 'Reported' && (
                <p className="text-sm text-[var(--text-secondary)] p-4 bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] w-full">
                  Please assign a technician. Assigned technicians will see workflow actions here.
                </p>
              )}

              {issue.status === 'Assigned' && (
                <button onClick={() => executeStatusTransition('Inspection Started')} disabled={statusLoading} className="btn-accent px-5 py-2.5">
                  Begin Inspection
                </button>
              )}

              {issue.status === 'Inspection Started' && (
                <button onClick={() => executeStatusTransition('Maintenance In Progress')} disabled={statusLoading} className="btn-accent px-5 py-2.5">
                  Start Maintenance
                </button>
              )}

              {(issue.status === 'Maintenance In Progress' || issue.status === 'Waiting for Parts') && (
                <div className="flex flex-wrap gap-3 w-full p-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl">
                  {issue.status === 'Maintenance In Progress' ? (
                     <button onClick={() => executeStatusTransition('Waiting for Parts')} disabled={statusLoading} className="btn-secondary">
                        Pause: Waiting for Parts
                     </button>
                  ) : (
                    <button onClick={() => executeStatusTransition('Maintenance In Progress')} disabled={statusLoading} className="btn-secondary">
                        Resume Maintenance
                    </button>
                  )}
                  
                  <button onClick={() => setShowLogModal(true)} className="btn-accent bg-[var(--success)] hover:bg-[var(--success)]/90 text-white ml-auto flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> Log Work & Resolve
                  </button>
                </div>
              )}

              {issue.status === 'Resolved' && (
                <div className="flex gap-3">
                  <button onClick={() => executeStatusTransition('Closed')} disabled={statusLoading} className="btn-secondary bg-[var(--success-muted)] text-[var(--success-text)] border-[var(--success-muted)] hover:bg-[var(--success-muted)]/80">
                    Close Incident
                  </button>
                  <button onClick={() => executeStatusTransition('Reopened')} disabled={statusLoading} className="btn-danger">
                    Reopen Incident
                  </button>
                </div>
              )}

              {issue.status === 'Closed' && (
                <button onClick={() => executeStatusTransition('Reopened')} disabled={statusLoading} className="btn-danger">
                  Reopen Incident
                </button>
              )}

              {issue.status === 'Reopened' && (
                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => executeStatusTransition('Assigned')} disabled={statusLoading} className="btn-secondary">
                    Reset to Assigned
                  </button>
                  <button onClick={() => executeStatusTransition('Inspection Started')} disabled={statusLoading} className="btn-accent">
                    Begin Inspection
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Maintenance Logs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-widest uppercase flex items-center gap-2 px-1">
            <ClipboardList className="w-4 h-4 text-[var(--text-secondary)]" /> Maintenance Logs
          </h3>
          
          {logs.length === 0 ? (
            <div className="card p-10 text-center bg-[var(--surface)] shadow-none border-dashed text-[var(--text-secondary)]">
              No maintenance actions recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log._id} className="card p-6 space-y-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)] opacity-50" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
                    <div>
                      <p className="font-bold text-[var(--text-primary)] text-base">{log.technician?.name || 'System'}</p>
                      <p className="text-xs text-[var(--text-secondary)] font-mono-code mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium">
                       <span className="bg-[var(--surface-raised)] px-3 py-1 rounded-md border border-[var(--border)]">
                          Cost: <span className="font-mono-code text-[var(--accent)] font-bold ml-1">${log.cost}</span>
                       </span>
                       <span className={`px-3 py-1 rounded-md border ${log.finalCondition === 'Good' ? 'bg-[var(--success-muted)] text-[var(--success-text)] border-[var(--success-muted)]' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)]'}`}>
                          {log.finalCondition}
                       </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Inspection Findings</span>
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed italic bg-[var(--surface-raised)] p-4 rounded-xl border border-[var(--border)]">"{log.inspectionNotes}"</p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Work Performed</span>
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed bg-[var(--surface-raised)] p-4 rounded-xl border border-[var(--border)]">{log.workPerformed}</p>
                    </div>
                  </div>

                  {log.partsUsed && log.partsUsed.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Parts Replaced</span>
                      <div className="flex flex-wrap gap-2">
                        {log.partsUsed.map((p, idx) => (
                          <span key={idx} className="bg-[var(--surface)] border border-[var(--border)] px-3 py-1 rounded-md text-xs font-medium shadow-sm">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {log.evidenceUrls && log.evidenceUrls.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Evidence Files</span>
                      <div className="flex flex-wrap gap-3">
                        {log.evidenceUrls.map((eUrl, eIdx) => (
                          <a key={eIdx} href={eUrl} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition-colors h-20 w-20">
                            <img src={eUrl} alt="Log evidence" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Modal: Service logs form */}
        <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogModal(false)} />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center shrink-0">
                <h3 className="text-base font-bold text-[var(--text-primary)]">Log Maintenance Work</h3>
                <button onClick={() => setShowLogModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-raised)] text-[var(--text-secondary)] transition-colors">&times;</button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                {logError && <div className="bg-[var(--critical-bg)] text-[var(--danger)] border border-[var(--danger)] p-3 rounded-lg text-sm font-medium">{logError}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Started At <span className="text-[var(--danger)]">*</span></label>
                    <input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className="input-base" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Completed At <span className="text-[var(--danger)]">*</span></label>
                    <input type="datetime-local" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} className="input-base" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Inspection Findings <span className="text-[var(--danger)]">*</span></label>
                  <textarea value={inspectionNotes} onChange={(e) => setInspectionNotes(e.target.value)} rows={3} className="input-base resize-none" placeholder="What did you find upon inspection?" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Work Performed <span className="text-[var(--danger)]">*</span></label>
                  <textarea value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} rows={3} className="input-base resize-none" placeholder="Describe the repairs made..." required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Parts Used (comma separated)</label>
                  <input type="text" value={partsInput} onChange={(e) => setPartsInput(e.target.value)} className="input-base font-mono-code text-sm" placeholder="e.g. 10mm bolt, AC filter" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Total Cost ($)</label>
                    <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className="input-base font-mono-code text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Final Condition</label>
                    <select value={finalCondition} onChange={(e) => setFinalCondition(e.target.value)} className="input-base cursor-pointer appearance-none">
                      <option value="Good">Good (Operational)</option>
                      <option value="Fair">Fair (Needs Monitoring)</option>
                      <option value="Poor">Poor (Degraded)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">Evidence Photos (Multiple allowed)</label>
                   <input type="file" multiple accept="image/*" onChange={(e) => setEvidenceFiles(Array.from(e.target.files))} className="input-base py-2 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[var(--surface-raised)] file:text-[var(--text-primary)] cursor-pointer text-sm" />
                </div>

                 <div className="space-y-1.5 pt-4 border-t border-[var(--border)]">
                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block text-[var(--accent)]">Schedule Next Service (Optional)</label>
                    <input type="date" value={nextServiceDate} onChange={(e) => setNextServiceDate(e.target.value)} className="input-base" />
                 </div>
              </div>

              <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-raised)] flex gap-3 shrink-0">
                <button type="button" onClick={() => setShowLogModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAddMaintenanceLog} disabled={logLoading} className="btn-accent flex-1 bg-[var(--success)] hover:bg-[var(--success)]/90 text-white flex items-center justify-center gap-2">
                  {logLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Save & Resolve</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
