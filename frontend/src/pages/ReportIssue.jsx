import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { ShieldAlert, Image as ImageIcon, Camera, Sparkles, AlertTriangle, Send, Loader2, X, Plus, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ISSUE_CATEGORIES = ['HVAC', 'Electrical', 'Plumbing', 'Structural', 'Appliance', 'Safety', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const labelClass = 'text-[11px] font-bold text-[var(--text-secondary)] block uppercase tracking-widest mb-2';
const errorClass = 'text-[var(--danger)] text-xs mt-1.5 font-medium flex items-center gap-1';

export default function ReportIssue() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiError, setAiError] = useState('');

  const [possibleCauses, setPossibleCauses] = useState([]);
  const [initialChecks, setInitialChecks] = useState([]);
  const [newCause, setNewCause] = useState('');
  const [newCheck, setNewCheck] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [evidencePreview, setEvidencePreview] = useState(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { category: '', priority: 'Medium', title: '', description: '', reporterName: '', reporterContact: '' }
  });

  const watchedTitle = watch('title');
  const watchedCategory = watch('category');
  const watchedPriority = watch('priority');
  const descriptionText = watch('description');

  useEffect(() => {
    return () => {
      if (evidencePreview) URL.revokeObjectURL(evidencePreview);
    };
  }, [evidencePreview]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEvidenceName(file.name);
      const url = URL.createObjectURL(file);
      setEvidencePreview(url);
    }
  };

  const clearFile = () => {
    setEvidenceName('');
    if (evidencePreview) URL.revokeObjectURL(evidencePreview);
    setEvidencePreview(null);
    setValue('evidence', null);
  };

  const analyzeWithAI = async () => {
    if (!descriptionText || descriptionText.trim().length < 15) {
      setAiError('Please provide a more detailed description (at least 15 characters) for AI analysis.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    setAiSuggestion(null);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await axios.post(
        `${API_URL}/public/assets/${slug}/ai-triage`,
        { complaint: descriptionText },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      const suggestion = res.data.data;
      setAiSuggestion(suggestion);
      toast.success('AI triage analysis complete!');
      setValue('title', suggestion.title);
      setValue('category', suggestion.category);
      setValue('priority', suggestion.priority);
      setPossibleCauses(suggestion.possibleCauses || []);
      setInitialChecks(suggestion.initialChecks || []);
    } catch (err) {
      const errMsg = err.message === 'canceled' || err.code === 'ECONNABORTED'
        ? 'AI analysis timed out. Please continue manually.'
        : err.response?.data?.error?.message || 'AI Triage service temporarily unavailable. Please fill details manually.';
      setAiError(errMsg);
      toast.error(errMsg);
    } finally {
      setAiLoading(false);
    }
  };

  const addCause = () => { if (newCause.trim()) { setPossibleCauses([...possibleCauses, newCause.trim()]); setNewCause(''); } };
  const removeCause = (index) => setPossibleCauses(possibleCauses.filter((_, i) => i !== index));
  const addCheck = () => { if (newCheck.trim()) { setInitialChecks([...initialChecks, newCheck.trim()]); setNewCheck(''); } };
  const removeCheck = (index) => setInitialChecks(initialChecks.filter((_, i) => i !== index));

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('reporterName', data.reporterName);
      if (data.reporterContact) formData.append('reporterContact', data.reporterContact);
      formData.append('category', data.category);
      formData.append('priority', data.priority);

      if (aiSuggestion) {
        const isEdited = (
          watchedTitle !== aiSuggestion.title ||
          watchedCategory !== aiSuggestion.category ||
          watchedPriority !== aiSuggestion.priority ||
          JSON.stringify(possibleCauses) !== JSON.stringify(aiSuggestion.possibleCauses) ||
          JSON.stringify(initialChecks) !== JSON.stringify(aiSuggestion.initialChecks)
        );
        formData.append('aiSuggestion', JSON.stringify({
          title: aiSuggestion.title,
          category: aiSuggestion.category,
          priority: aiSuggestion.priority,
          possibleCauses,
          initialChecks,
          recurringWarning: aiSuggestion.recurringWarning,
          wasEdited: isEdited
        }));
      }

      if (data.evidence && data.evidence[0]) formData.append('evidence', data.evidence[0]);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await axios.post(`${API_URL}/public/assets/${slug}/issues`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Incident reported successfully!');
      setSuccess(true);
      setTimeout(() => navigate(`/public/asset/${slug}`), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to submit report. Please try again.';
      setServerError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)] flex items-center justify-center p-4 transition-colors">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center max-w-sm w-full shadow-xl">
          <div className="w-16 h-16 bg-[var(--success-muted)] text-[var(--success)] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">Report Submitted</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6 font-medium leading-relaxed">
            Thank you. The facilities maintenance team has been notified and will review this report shortly.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Redirecting
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] flex flex-col items-center p-4 sm:py-8 transition-colors">
      
      {/* Top Bar */}
      <div className="w-full max-w-xl flex justify-between items-center mb-6 px-1">
        <button
          onClick={() => navigate(`/public/asset/${slug}`)}
          className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors px-2 py-1 -ml-2 rounded-lg hover:bg-[var(--surface-raised)]"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Asset
        </button>
        <ThemeToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl pb-10">
        
        <div className="mb-6 px-1">
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight leading-tight">Log Incident</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2 font-medium">Describe the fault. Our AI triage system will help categorize the report for the dispatch team.</p>
        </div>

        <div className="card shadow-xl shadow-black/5 overflow-hidden">
          <form onSubmit={handleSubmit(onSubmit)}>
            
            {serverError && (
              <div className="p-4 bg-[var(--critical-bg)] border-b border-[var(--danger)] text-[var(--danger)] text-sm font-medium flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                {serverError}
              </div>
            )}

            {/* Reporter Info Section */}
            <div className="p-6 space-y-5 bg-[var(--surface-raised)]/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Your Name <span className="text-[var(--danger)]">*</span></label>
                  <input
                    {...register('reporterName', { required: 'Name required' })}
                    className="input-base"
                    placeholder="e.g. John Doe"
                  />
                  {errors.reporterName && <p className={errorClass}><AlertTriangle className="w-3 h-3"/> {errors.reporterName.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Contact (Optional)</label>
                  <input
                    {...register('reporterContact')}
                    className="input-base"
                    placeholder="Email or Phone"
                  />
                </div>
              </div>
            </div>

            {/* Description & AI Section */}
            <div className="p-6 border-t border-[var(--border)] space-y-4">
              <div>
                <label className={labelClass}>Detailed Fault Description <span className="text-[var(--danger)]">*</span></label>
                <textarea
                  {...register('description', { required: 'Description required', minLength: { value: 10, message: 'Please provide more detail.' } })}
                  rows={4}
                  className="input-base resize-none"
                  placeholder="Describe what is wrong, sounds it makes, error codes visible..."
                />
                {errors.description && <p className={errorClass}><AlertTriangle className="w-3 h-3"/> {errors.description.message}</p>}
              </div>

              <div className="bg-[var(--accent-muted)] border border-[var(--accent)]/20 rounded-xl p-4 md:p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[var(--accent-muted-text)] flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4" /> AI Triage Assistant
                  </h4>
                  <p className="text-xs text-[var(--accent-muted-text)]/80 font-medium">Generate a technical summary and categorisation based on your description.</p>
                </div>
                <button
                  type="button"
                  onClick={analyzeWithAI}
                  disabled={aiLoading}
                  className="btn-accent shrink-0 w-full md:w-auto bg-[var(--surface)] text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--surface-raised)]"
                >
                  {aiLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing...</>
                  ) : (
                    'Run AI Triage'
                  )}
                </button>
              </div>
              {aiError && <p className={errorClass}><AlertTriangle className="w-3 h-3"/> {aiError}</p>}

              <AnimatePresence>
                {aiSuggestion?.recurringWarning && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-[var(--critical-bg)] border border-[var(--critical-border)] text-[var(--danger-text)] rounded-xl p-4 text-sm font-medium">
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <ShieldAlert className="w-4 h-4" /> Safety Notice
                    </div>
                    {aiSuggestion.recurringWarning}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Classified Details Section */}
            <div className="p-6 border-t border-[var(--border)] bg-[var(--surface-raised)]/30 space-y-6">
              <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2 mb-4">Technical Classification</h3>
              
              <div>
                <label className={labelClass}>Issue Summary / Title <span className="text-[var(--danger)]">*</span></label>
                <input
                  {...register('title', { required: 'Title required' })}
                  className="input-base font-semibold"
                  placeholder="Short summary of the problem"
                />
                {errors.title && <p className={errorClass}><AlertTriangle className="w-3 h-3"/> {errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Category <span className="text-[var(--danger)]">*</span></label>
                  <select {...register('category', { required: 'Category required' })} className="input-base cursor-pointer appearance-none font-medium">
                    <option value="">Select Category...</option>
                    {ISSUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.category && <p className={errorClass}><AlertTriangle className="w-3 h-3"/> {errors.category.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Priority <span className="text-[var(--danger)]">*</span></label>
                  <select {...register('priority', { required: 'Priority required' })} className="input-base cursor-pointer appearance-none font-medium">
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errors.priority && <p className={errorClass}><AlertTriangle className="w-3 h-3"/> {errors.priority.message}</p>}
                </div>
              </div>

              {/* Tags Section */}
              <div className="grid grid-cols-1 gap-6 pt-2">
                <div>
                  <label className={labelClass}>Possible Causes (Tags)</label>
                  <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                    {possibleCauses.map((cause, i) => (
                      <span key={i} className="bg-[var(--surface)] border border-[var(--border)] shadow-sm text-[var(--text-primary)] rounded-md px-2.5 py-1 text-xs font-medium flex items-center gap-1.5">
                        {cause}
                        <button type="button" onClick={() => removeCause(i)} className="text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors"><X className="w-3 h-3"/></button>
                      </span>
                    ))}
                    {possibleCauses.length === 0 && <span className="text-xs text-[var(--text-tertiary)] italic self-center">None identified.</span>}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newCause} onChange={(e) => setNewCause(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCause())} className="input-base text-sm" placeholder="Add a cause tag..." />
                    <button type="button" onClick={addCause} className="btn-secondary px-3 shrink-0"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Safety Checks / Initial Steps</label>
                  <div className="space-y-2 mb-3 min-h-[32px]">
                    {initialChecks.map((check, i) => (
                      <div key={i} className="bg-[var(--surface)] border border-[var(--border)] shadow-sm rounded-lg p-2.5 text-xs font-medium text-[var(--text-secondary)] flex justify-between items-start gap-2 leading-relaxed">
                        <span>{check}</span>
                        <button type="button" onClick={() => removeCheck(i)} className="text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors mt-0.5"><X className="w-3 h-3"/></button>
                      </div>
                    ))}
                     {initialChecks.length === 0 && <span className="text-xs text-[var(--text-tertiary)] italic self-center">None suggested.</span>}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newCheck} onChange={(e) => setNewCheck(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCheck())} className="input-base text-sm" placeholder="Add a safety check..." />
                    <button type="button" onClick={addCheck} className="btn-secondary px-3 shrink-0"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence Section */}
            <div className="p-6 border-t border-[var(--border)]">
              <label className={labelClass}>Fault Evidence Photo (Optional)</label>
              
              {!evidencePreview ? (
                <div className="relative group mt-2">
                  <div className="absolute inset-0 bg-[var(--accent)]/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex flex-col items-center justify-center w-full bg-[var(--surface-raised)] border-2 border-dashed border-[var(--border)] group-hover:border-[var(--accent)]/50 rounded-xl py-8 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      {...register('evidence')}
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    <div className="w-12 h-12 bg-[var(--surface)] rounded-full border border-[var(--border)] flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                      <Camera className="w-5 h-5 text-[var(--text-secondary)]" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Tap to capture or upload</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">PNG, JPG up to 10MB</p>
                  </div>
                </div>
              ) : (
                <div className="relative mt-2 rounded-xl overflow-hidden border border-[var(--border)] bg-black aspect-video flex items-center justify-center group">
                  <img src={evidencePreview} alt="Evidence Preview" className="w-full h-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button type="button" onClick={clearFile} className="btn-danger flex items-center gap-2">
                      <X className="w-4 h-4" /> Remove Photo
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[var(--border)] bg-[var(--surface-raised)]">
              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full py-3.5 text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent)]/20"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Submitting Report...</>
                ) : (
                  <><Send className="w-5 h-5" /> Submit Incident Report</>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
