import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';

const ISSUE_CATEGORIES = ['HVAC', 'Electrical', 'Plumbing', 'Structural', 'Appliance', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const labelClass = 'text-[11px] text-[var(--text-secondary)] block uppercase tracking-wider font-semibold mb-1.5';
const errorClass = 'text-[var(--danger)] text-[11px] mt-1';

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

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { category: '', priority: 'Medium', title: '', description: '', reporterName: '', reporterContact: '' }
  });

  const watchedTitle = watch('title');
  const watchedCategory = watch('category');
  const watchedPriority = watch('priority');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setEvidenceName(file.name);
  };

  const analyzeWithAI = async () => {
    const descriptionText = watch('description');
    if (!descriptionText || descriptionText.trim().length < 10) {
      setAiError('Please enter a longer description (at least 10 chars) before running AI analysis.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    setAiSuggestion(null);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await axios.post(
        `${API_URL}/public/assets/${slug}/ai-triage`,
        { complaint: descriptionText },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      const suggestion = res.data.data;
      setAiSuggestion(suggestion);
      toast.success('AI triage suggestions successfully prefilled!');
      setValue('title', suggestion.title);
      setValue('category', suggestion.category);
      setValue('priority', suggestion.priority);
      setPossibleCauses(suggestion.possibleCauses || []);
      setInitialChecks(suggestion.initialChecks || []);
    } catch (err) {
      const errMsg = err.message === 'canceled' || err.code === 'ECONNABORTED'
        ? 'AI analysis timed out. Please fill in the details manually.'
        : err.response?.data?.error?.message || 'AI Triage service temporarily offline. Continue manually.';
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
      setTimeout(() => navigate(`/public/asset/${slug}`), 2500);
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
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 transition-colors">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center max-w-sm w-full shadow-xl">
          <div className="w-14 h-14 bg-[var(--success)]/10 border-2 border-[var(--success)] text-[var(--success)] rounded-full flex items-center justify-center mx-auto text-2xl mb-4 animate-bounce">
            ✓
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Issue Reported Successfully</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4 font-light">
            The maintenance team has been notified. A technician will be dispatched shortly.
          </p>
          <span className="font-mono-code text-[11px] text-[var(--accent)]">Redirecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center p-4 pb-10 transition-colors">
      {/* Theme + Header row */}
      <div className="w-full max-w-md flex justify-end mb-2 py-2">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden mb-8">

        {/* Page header */}
        <div className="p-5 border-b border-[var(--border)] bg-[var(--surface-raised)]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider">Triage &amp; Report</span>
            <button
              onClick={() => navigate(`/public/asset/${slug}`)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs flex items-center gap-1 font-medium transition-colors"
            >
              &larr; Back
            </button>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Post Asset Incident</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Submit description to automatically run AI triage before logging.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">

          {serverError && (
            <div className="bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger)] rounded-lg p-3 text-xs leading-5">
              {serverError}
            </div>
          )}

          <div>
            <label className={labelClass}>Your Name *</label>
            <input
              {...register('reporterName', { required: 'Please enter your name' })}
              className="input-base"
              placeholder="e.g. John Doe"
            />
            {errors.reporterName && <p className={errorClass}>{errors.reporterName.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Contact Email / Phone (Optional)</label>
            <input
              {...register('reporterContact')}
              className="input-base"
              placeholder="e.g. john@example.com"
            />
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <label className={labelClass}>Detailed Description *</label>
            <textarea
              {...register('description', { required: 'Provide details about the fault' })}
              rows={3}
              className="input-base resize-none mb-2"
              placeholder="e.g. AC compressor makes grinding noise and smells like burning wire..."
            />
            {errors.description && <p className={errorClass}>{errors.description.message}</p>}

            {/* AI Analyze trigger */}
            <div className="flex items-center justify-between gap-2 mt-2">
              <button
                type="button"
                onClick={analyzeWithAI}
                disabled={aiLoading}
                className="bg-[var(--surface-raised)] hover:bg-[var(--border)] border border-[var(--accent)] disabled:opacity-50 text-[var(--accent)] font-semibold px-3 py-1.5 rounded-lg text-xs tracking-wide transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  '✨ Analyze with AI'
                )}
              </button>
              <span className="text-[10px] text-[var(--text-secondary)] italic">Powered by Gemini AI</span>
            </div>
            {aiError && <p className="text-[var(--danger)] text-[11px] mt-2 font-medium">⚠ {aiError}</p>}
          </div>

          {/* AI recurring warning */}
          {aiSuggestion?.recurringWarning && (
            <div className="bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger)] rounded-xl p-3.5 text-xs leading-5">
              <p className="font-bold mb-0.5">⚠ AI SAFETY NOTICE</p>
              <p className="font-light text-[var(--text-secondary)]">{aiSuggestion.recurringWarning}</p>
            </div>
          )}

          {/* Prefilled section */}
          <div className="border-t border-[var(--border)] pt-4 space-y-4">
            <h3 className="text-[10px] text-[var(--accent)] uppercase tracking-widest font-bold">Issue Details (AI Triage Preview)</h3>

            <div>
              <label className={labelClass}>Issue Summary / Title *</label>
              <input
                {...register('title', { required: 'Please outline a summary title' })}
                className="input-base"
                placeholder="Fill manually or trigger AI triage"
              />
              {errors.title && <p className={errorClass}>{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Category *</label>
                <select {...register('category', { required: 'Select a category' })} className="input-base cursor-pointer">
                  <option value="">Select...</option>
                  {ISSUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className={errorClass}>{errors.category.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Priority *</label>
                <select {...register('priority', { required: 'Select a priority' })} className="input-base cursor-pointer">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {errors.priority && <p className={errorClass}>{errors.priority.message}</p>}
              </div>
            </div>

            {/* Possible causes tags */}
            <div>
              <label className={labelClass}>Possible Causes</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {possibleCauses.map((cause, i) => (
                  <span key={i} className="bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-2 py-0.5 text-xs flex items-center gap-1">
                    {cause}
                    <button type="button" onClick={() => removeCause(i)} className="text-[var(--text-secondary)] hover:text-[var(--danger)] font-bold">&times;</button>
                  </span>
                ))}
                {possibleCauses.length === 0 && <span className="text-xs text-[var(--text-secondary)] italic">No causes suggested.</span>}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newCause} onChange={(e) => setNewCause(e.target.value)} className="input-base flex-1 text-xs py-1.5" placeholder="Add possible cause..." />
                <button type="button" onClick={addCause} className="bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--accent)] border border-[var(--border)] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer">+ Add</button>
              </div>
            </div>

            {/* Initial checks */}
            <div>
              <label className={labelClass}>Recommended Initial Checks</label>
              <div className="space-y-1.5 mb-2">
                {initialChecks.map((check, i) => (
                  <div key={i} className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-xs flex justify-between items-center gap-2">
                    <span className="text-[var(--text-secondary)] italic font-light">{check}</span>
                    <button type="button" onClick={() => removeCheck(i)} className="text-[var(--text-secondary)] hover:text-[var(--danger)] font-semibold px-1">&times;</button>
                  </div>
                ))}
                {initialChecks.length === 0 && <span className="text-xs text-[var(--text-secondary)] italic">No initial checks suggested.</span>}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newCheck} onChange={(e) => setNewCheck(e.target.value)} className="input-base flex-1 text-xs py-1.5" placeholder="Add safety check step..." />
                <button type="button" onClick={addCheck} className="bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--accent)] border border-[var(--border)] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer">+ Add</button>
              </div>
            </div>
          </div>

          {/* Photo upload */}
          <div className="border-t border-[var(--border)] pt-4">
            <label className={labelClass}>Fault Photo / Evidence (Optional)</label>
            <div className="relative flex items-center justify-center w-full bg-[var(--surface-raised)] hover:bg-[var(--border)] border border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-xl py-5 cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/*"
                {...register('evidence')}
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 w-full cursor-pointer"
              />
              <div className="text-center text-xs text-[var(--text-secondary)] font-medium">
                📸 {evidenceName || 'Tap to capture / select photo'}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)]">
            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full py-3 text-sm rounded-xl"
            >
              {loading ? 'Submitting Report...' : 'Submit Incident Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
