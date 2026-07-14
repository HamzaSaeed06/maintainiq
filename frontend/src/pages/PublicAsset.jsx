import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';
import { ShieldAlert, AlertTriangle, CheckCircle2, Info, Activity, Clock, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

function AssetStatusBadge({ status }) {
  const map = {
    'Operational':      'bg-[var(--success-muted)] text-[var(--success-text)] border-[var(--success-muted)]',
    'Issue Reported':   'bg-[var(--warning-muted)] text-[var(--warning-text)] border-[var(--warning-muted)]',
    'Under Inspection': 'bg-[var(--status-inspection-bg)] text-[var(--status-inspection-text)] border-[var(--status-inspection-bg)]',
    'Under Maintenance':'bg-[var(--status-maintenance-bg)] text-[var(--status-maintenance-text)] border-[var(--status-maintenance-bg)]',
    'Out of Service':   'bg-[var(--danger-muted)] text-[var(--danger-text)] border-[var(--danger-muted)]',
    'Retired':          'bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border)]',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase border ${map[status] || 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border)]'}`}>
      {status}
    </span>
  );
}

export default function PublicAsset() {
  const { slug } = useParams();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAsset = async () => {
      setLoading(true);
      setError('');
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await axios.get(`${API_URL}/public/assets/${slug}`);
        setAsset(res.data.data);
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Asset not found. Please scan again.');
      } finally {
        setLoading(false);
      }
    };
    fetchAsset();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)] flex items-center justify-center p-4 transition-colors">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-[3px] border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">Retrieving asset data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)] flex flex-col items-center p-4 transition-colors">
        <div className="w-full max-w-md flex justify-end mb-4 pt-4">
          <ThemeToggle />
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 max-w-md w-full text-center shadow-xl shadow-black/5 mt-10">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-raised)] flex items-center justify-center mx-auto mb-5 text-2xl border border-[var(--border)]">
            <ShieldAlert className="w-8 h-8 text-[var(--text-secondary)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Verification Failed</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6 font-medium leading-relaxed">The QR code or link you scanned matches an invalid or unrecognized asset.</p>
          <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-3 text-xs font-mono-code text-[var(--text-secondary)] select-all break-all text-center">
            {slug}
          </div>
        </div>
      </div>
    );
  }

  if (!asset) return null;

  const conditionColor = { 
    Good: 'text-[var(--success)]', 
    Fair: 'text-[var(--warning)]', 
    Poor: 'text-[var(--danger)]' 
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] flex flex-col items-center p-4 sm:py-8 transition-colors">
      
      {/* Top Bar */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 px-1">
        <div className="flex items-center gap-2">
           <div className="w-6 h-6 rounded bg-[var(--accent)] flex items-center justify-center text-[var(--accent-contrast)] font-black text-xs shadow-sm">M</div>
           <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">MaintainIQ</span>
        </div>
        <ThemeToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6 pb-10">
        
        {/* Main Card */}
        <div className="card overflow-hidden shadow-xl shadow-black/5">
          {asset.status === 'Retired' && (
            <div className="bg-[var(--critical-bg)] border-b border-[var(--critical-border)] text-[var(--danger-text)] px-4 py-3 text-center text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Out of Service
            </div>
          )}

          <div className="p-6 bg-[var(--surface)]">
            <div className="flex justify-between items-start mb-4 gap-4">
              <span className="font-mono-code text-xs font-bold text-[var(--text-primary)] bg-[var(--surface-raised)] border border-[var(--border)] px-3 py-1 rounded-md shadow-sm shrink-0">
                {asset.assetCode}
              </span>
              <AssetStatusBadge status={asset.status} />
            </div>
            
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight leading-tight mb-2">{asset.name}</h1>
            <p className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]" /> {asset.category}
            </p>
          </div>

          <div className="grid grid-cols-2 divide-x divide-[var(--border)] border-t border-[var(--border)] bg-[var(--surface-raised)]/50">
            <div className="p-4 space-y-1 text-center">
              <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 mb-1.5"><MapPin className="w-3 h-3"/> Location</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{asset.location}</span>
            </div>
            <div className="p-4 space-y-1 text-center">
              <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 mb-1.5"><Activity className="w-3 h-3"/> Condition</span>
              <span className={`text-sm font-bold ${conditionColor[asset.condition] || 'text-[var(--text-primary)]'}`}>
                {asset.condition}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[var(--border)] border-t border-[var(--border)] bg-[var(--surface-raised)]/50">
             <div className="p-4 space-y-1 text-center">
              <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 mb-1.5"><Clock className="w-3 h-3"/> Last Inspection</span>
              <span className="text-xs font-semibold text-[var(--text-primary)] font-mono-code">
                {asset.lastServiceDate ? new Date(asset.lastServiceDate).toLocaleDateString() : 'Never'}
              </span>
            </div>
            <div className="p-4 space-y-1 text-center">
              <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 mb-1.5"><Clock className="w-3 h-3"/> Next Due</span>
              <span className="text-xs font-semibold text-[var(--text-primary)] font-mono-code">
                {asset.nextServiceDate ? new Date(asset.nextServiceDate).toLocaleDateString() : 'TBD'}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {asset.recentActivity.length > 0 && (
          <div className="px-2">
            <h3 className="text-[11px] text-[var(--text-secondary)] uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
               Recent Log History
            </h3>
            <div className="space-y-4">
              {asset.recentActivity.slice(0, 3).map((log, i) => (
                <div key={i} className="flex gap-4 text-sm relative group">
                  <div className="relative flex flex-col items-center shrink-0 w-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--surface-raised)] border-[2px] border-[var(--accent)] z-10 mt-1 shadow-sm" />
                    {i < Math.min(asset.recentActivity.length, 3) - 1 && (
                      <div className="absolute top-4 w-[2px] h-full bg-[var(--border)] group-hover:bg-[var(--accent)]/30 transition-colors" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="font-semibold text-[var(--text-primary)] leading-tight">{log.action}</p>
                    <p className="font-mono-code text-[11px] text-[var(--text-secondary)] mt-1 font-medium">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        {asset.status !== 'Retired' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="pt-2">
            <Link
              to={`/report/${slug}`}
              className="btn-accent w-full py-3.5 text-[15px] shadow-lg shadow-[var(--accent)]/20 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-5 h-5" />
              Report Fault / Incident
            </Link>
            <p className="text-center text-xs text-[var(--text-secondary)] mt-4 font-medium leading-relaxed px-4">
              Use this tool to alert the facilities team of physical damage, malfunction, or safety concerns.
            </p>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}
