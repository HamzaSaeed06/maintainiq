import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assetService } from '../services/assetService';
import AssetForm from '../components/AssetForm';
import toast from 'react-hot-toast';
import { ChevronRight, Edit2, QrCode, Download, Link as LinkIcon, ExternalLink, Calendar, MapPin, Tag, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

function AssetStatusBadge({ status }) {
  const map = {
    'Operational':      'badge badge-resolved text-xs',
    'Issue Reported':   'badge badge-reported text-xs',
    'Under Inspection': 'badge badge-inspection text-xs',
    'Under Maintenance':'badge badge-maintenance text-xs',
    'Out of Service':   'badge badge-critical text-xs',
    'Retired':          'badge badge-closed text-xs',
  };
  return <span className={map[status] || 'badge badge-closed text-xs'}>{status}</span>;
}

export default function AssetDetail() {
  const { id } = useParams();
  const [asset, setAsset] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [assetRes, qrRes, histRes] = await Promise.all([
        assetService.getById(id),
        assetService.getQR(id),
        assetService.getHistory(id),
      ]);
      setAsset(assetRes.data.data);
      setQrData(qrRes.data.data);
      setHistory(histRes.data.data);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to load asset';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleCopyLink = async () => {
    if (!qrData?.publicUrl) return;
    try {
      await navigator.clipboard.writeText(qrData.publicUrl);
      toast.success('Public page URL copied!');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleDownloadQR = () => {
    if (!qrData?.qrCodeUrl) return;
    try {
      const a = document.createElement('a');
      a.href = qrData.qrCodeUrl;
      a.download = `${asset?.assetCode}-qr.png`;
      a.target = '_blank';
      a.click();
      toast.success('QR Code download started!');
    } catch (err) {
      toast.error('Could not download QR image');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)] p-4 md:p-6 transition-colors space-y-6">
        <div className="max-w-6xl mx-auto">
          <div className="h-4 w-32 skeleton mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-[300px] skeleton rounded-xl" />
              <div className="h-[400px] skeleton rounded-xl" />
            </div>
            <div className="h-[400px] skeleton rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)] flex items-center justify-center p-4 transition-colors">
        <div className="bg-[var(--critical-bg)] text-[var(--danger-text)] border border-[var(--danger)] rounded-xl p-6 text-center max-w-sm w-full">
          <p className="font-semibold text-sm mb-4">{error || 'Asset not found'}</p>
          <Link to="/assets" className="btn-danger w-full">Back to Assets</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--text-primary)] p-4 md:p-6 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Breadcrumbs */}
        <nav className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <Link to="/assets" className="hover:text-[var(--text-primary)] transition-colors">Assets</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[var(--text-primary)] font-mono-code bg-[var(--surface-raised)] px-1.5 py-0.5 rounded border border-[var(--border)]">{asset.assetCode}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Details + Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Info Card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">{asset.name}</h1>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="font-mono-code text-xs font-semibold text-[var(--accent)] bg-[var(--accent-muted)] border border-[var(--accent)]/20 px-2 py-0.5 rounded-md">
                      {asset.assetCode}
                    </span>
                    <AssetStatusBadge status={asset.status} />
                  </div>
                </div>
                <button
                  onClick={() => setShowEdit(true)}
                  className="btn-secondary text-xs flex items-center gap-2 shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Asset
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem icon={Tag} label="Category" value={asset.category} />
                <InfoItem icon={MapPin} label="Location" value={asset.location} />
                <InfoItem icon={Activity} label="Condition" value={
                  <span className={`font-semibold ${asset.condition === 'Good' ? 'text-[var(--success)]' : asset.condition === 'Poor' ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>
                    {asset.condition}
                  </span>
                } />
                <InfoItem icon={Calendar} label="Registered" value={new Date(asset.createdAt).toLocaleDateString()} />
                <InfoItem icon={Calendar} label="Last Service" value={asset.lastServiceDate ? new Date(asset.lastServiceDate).toLocaleDateString() : '—'} />
                <InfoItem icon={Calendar} label="Next Service" value={asset.nextServiceDate ? new Date(asset.nextServiceDate).toLocaleDateString() : '—'} />
              </div>
            </motion.div>

            {/* Activity Timeline */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6 md:p-8">
              <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--text-secondary)]" />
                Activity Timeline
              </h2>
              
              {history.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-raised)]">
                  <p className="text-[var(--text-secondary)] text-sm font-medium">No activity recorded yet.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-[var(--border)] pl-6 ml-3 space-y-8">
                  {history.map((h, i) => (
                    <div key={i} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-[var(--surface)] border-2 border-[var(--accent)] shadow-sm" />
                      
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-[var(--text-primary)]">{h.action}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <span className="font-medium px-2 py-0.5 bg-[var(--surface-raised)] rounded border border-[var(--border)]">By: {h.actorName || h.actor}</span>
                          <span className="font-mono-code">{new Date(h.timestamp).toLocaleString()}</span>
                          {h.relatedIssue && (
                            <Link
                              to={`/issues/${typeof h.relatedIssue === 'object' ? h.relatedIssue._id : h.relatedIssue}`}
                              className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-semibold transition-colors flex items-center gap-1 bg-[var(--accent-muted)] px-2 py-0.5 rounded border border-[var(--accent)]/20"
                            >
                              Ticket <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column: QR Code */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6 flex flex-col items-center">
              <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest mb-6 self-start flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[var(--text-secondary)]" />
                QR Identification
              </h2>

              {asset.status === 'Retired' && (
                <div className="bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger-text)] rounded-lg p-3 text-xs mb-6 text-center font-bold tracking-wide w-full">
                  ⚠ RETIRED ASSET
                </div>
              )}

              <div className="bg-white p-4 rounded-2xl border border-[var(--border)] w-full max-w-[240px] aspect-square flex items-center justify-center shadow-sm">
                {qrData?.qrCodeUrl ? (
                  <img
                    src={qrData.qrCodeUrl}
                    alt="Asset QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-[var(--text-secondary)] text-sm font-medium flex flex-col items-center gap-2">
                    <QrCode className="w-8 h-8 opacity-50" />
                    QR Unavailable
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-3 w-full">
                <button
                  onClick={handleDownloadQR}
                  disabled={!qrData?.qrCodeUrl}
                  className="btn-accent w-full flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download QR Code
                </button>
                
                <button
                  onClick={handleCopyLink}
                  disabled={!qrData?.publicUrl}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <LinkIcon className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy Public URL'}
                </button>

                {qrData?.publicUrl && (
                  <a
                    href={qrData.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors py-2"
                  >
                    Test Public View <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </motion.div>
          </div>

        </div>
      </div>

      {showEdit && (
        <AssetForm
          asset={asset}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); fetchAll(); }}
        />
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-4 rounded-xl flex items-start gap-3">
      <div className="p-2 bg-[var(--surface)] rounded-lg border border-[var(--border)] text-[var(--text-secondary)] shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">{label}</p>
        <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}
