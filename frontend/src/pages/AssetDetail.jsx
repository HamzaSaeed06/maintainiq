import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assetService } from '../services/assetService';
import AssetForm from '../components/AssetForm';
import toast from 'react-hot-toast';

function AssetStatusBadge({ status }) {
  const map = {
    'Operational':      'badge badge-resolved text-xs font-semibold',
    'Issue Reported':   'badge badge-reported text-xs font-semibold',
    'Under Inspection': 'badge badge-inspection text-xs font-semibold',
    'Under Maintenance':'badge badge-maintenance text-xs font-semibold',
    'Out of Service':   'badge badge-critical text-xs font-semibold',
    'Retired':          'badge badge-closed text-xs font-semibold',
  };
  return <span className={map[status] || 'badge badge-closed text-xs font-semibold'}>{status}</span>;
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

  const labelClass = 'text-[11px] text-[var(--text-secondary)] block uppercase tracking-wider font-semibold mb-1';

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center text-[var(--text-secondary)] gap-3 transition-colors">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Loading asset details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 transition-colors">
        <div className="bg-[var(--surface)] text-[var(--danger)] border border-[var(--danger)] rounded-xl p-6 text-center max-w-sm">
          <p className="font-semibold text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!asset) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] p-4 md:p-6 transition-colors">
      
      {/* Breadcrumbs */}
      <div className="text-xs text-[var(--text-secondary)] mb-6 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
        <Link to="/assets" className="hover:text-[var(--accent)] transition-colors">Assets</Link>
        <span>&rsaquo;</span>
        <span className="text-[var(--text-primary)] font-mono-code">{asset.assetCode}</span>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Asset info + Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pb-4 border-b border-[var(--border)]">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{asset.name}</h1>
                <p className="font-mono-code text-sm text-[var(--accent)] mt-0.5 uppercase">{asset.assetCode}</p>
              </div>
              <div className="flex items-center gap-3">
                <AssetStatusBadge status={asset.status} />
                <button
                  onClick={() => setShowEdit(true)}
                  className="px-4.5 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] bg-[var(--surface)] transition-all cursor-pointer"
                >
                  Edit Asset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {[
                ['Category', asset.category],
                ['Location', asset.location],
                ['Condition', asset.condition],
                ['Assigned Technician', asset.assignedTechnician?.name || '—'],
                ['Last Service Event', asset.lastServiceDate ? new Date(asset.lastServiceDate).toLocaleDateString() : '—'],
                ['Next Scheduled Service', asset.nextServiceDate ? new Date(asset.nextServiceDate).toLocaleDateString() : '—'],
                ['Registered By', asset.createdBy?.name || '—'],
                ['Registration Date', new Date(asset.createdAt).toLocaleDateString()],
              ].map(([lbl, val]) => (
                <div key={lbl} className="bg-[var(--surface-raised)] border border-[var(--border)] p-3 rounded-lg">
                  <span className={labelClass}>{lbl}</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-5 pb-3 border-b border-[var(--border)] flex items-center gap-2">
              📜 Asset Activity Timeline
            </h2>
            {history.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-[var(--border)] rounded-xl">
                <p className="text-[var(--text-secondary)] text-xs">No activity log entries recorded.</p>
              </div>
            ) : (
              <div className="relative border-l border-[var(--border)] pl-4 ml-2 space-y-5">
                {history.map((h, i) => (
                  <div key={i} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--accent)] border-2 border-[var(--surface)]" />
                    
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{h.action}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--text-secondary)] font-light">
                        <span className="font-semibold text-[var(--text-primary)]">By: {h.actorName || h.actor}</span>
                        <span>&bull;</span>
                        <span className="font-mono-code">{new Date(h.timestamp).toLocaleString()}</span>
                        {h.relatedIssue && (
                          <>
                            <span>&bull;</span>
                            <Link
                              to={`/issues/${typeof h.relatedIssue === 'object' ? h.relatedIssue._id : h.relatedIssue}`}
                              className="text-[var(--accent)] hover:underline font-mono-code font-bold uppercase"
                            >
                              Ticket Details &rarr;
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side: QR code card */}
        <div className="space-y-4">
          <div className="card p-6 flex flex-col items-center">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4 self-start">QR Identification</h2>

            {asset.status === 'Retired' && (
              <div className="bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger)] rounded-lg p-2 text-xs mb-3 text-center font-bold tracking-wide w-full">
                ⚠ RETIRED ASSET
              </div>
            )}

            <div className="bg-white p-3 rounded-xl border border-[var(--border)] w-full max-w-[240px] flex items-center justify-center shadow-inner">
              {qrData?.qrCodeUrl ? (
                <img
                  src={qrData.qrCodeUrl}
                  alt="Asset QR Verification Code"
                  className="w-full h-auto aspect-square object-contain"
                />
              ) : (
                <div className="w-full aspect-square bg-[var(--surface-raised)] rounded-lg flex items-center justify-center text-[var(--text-secondary)] text-xs">
                  QR Code Unavailable
                </div>
              )}
            </div>

            <div className="mt-5 space-y-2.5 w-full">
              <button
                onClick={handleDownloadQR}
                disabled={!qrData?.qrCodeUrl}
                className="btn-accent w-full py-2.5 text-xs rounded-lg flex items-center justify-center gap-1"
              >
                📥 Download QR Code
              </button>
              
              <button
                onClick={handleCopyLink}
                disabled={!qrData?.publicUrl}
                className="w-full py-2.5 bg-[var(--surface-raised)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                {copied ? '✓ Copied Public Link' : '🔗 Copy Public URL'}
              </button>

              {qrData?.publicUrl && (
                <a
                  href={qrData.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2.5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-secondary)] hover:text-[var(--accent)] rounded-lg text-xs font-semibold transition-colors"
                >
                  ↗ Inspect Public View
                </a>
              )}
            </div>

            {qrData?.publicUrl && (
              <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-2 rounded-lg mt-4 w-full">
                <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider block font-semibold mb-0.5">Physical QR URL</span>
                <p className="text-[10px] text-[var(--text-primary)] font-mono-code break-all select-all">{qrData.publicUrl}</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Edit Form Modal */}
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
