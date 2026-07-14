import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ThemeToggle from '../components/ThemeToggle';

function AssetStatusBadge({ status }) {
  const map = {
    'Operational':      'badge badge-resolved',
    'Issue Reported':   'badge badge-reported',
    'Under Inspection': 'badge badge-inspection',
    'Under Maintenance':'badge badge-maintenance',
    'Out of Service':   'badge badge-critical',
    'Retired':          'badge badge-closed',
  };
  return <span className={map[status] || 'badge badge-closed'}>{status}</span>;
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
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 transition-colors">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Retrieving asset data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 transition-colors">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center mx-auto mb-4 text-xl">
            🔍
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">{error}</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4 font-light">The QR code or link matches an invalid slug.</p>
          <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono-code text-[var(--text-secondary)] select-all">
            Slug: {slug}
          </div>
        </div>
      </div>
    );
  }

  if (!asset) return null;

  const conditionColor = { Good: 'text-[var(--success)]', Fair: 'text-[var(--warning)]', Poor: 'text-[var(--danger)]' };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center p-4 pb-10 transition-colors">
      {/* Theme toggle */}
      <div className="w-full max-w-md flex justify-end mb-2 py-2">
        <ThemeToggle />
      </div>

      {/* Asset card */}
      <div className="w-full max-w-md card shadow-xl overflow-hidden flex flex-col">

        {/* Retired banner */}
        {asset.status === 'Retired' && (
          <div className="bg-[var(--critical-bg)] border-b border-[var(--danger)] text-[var(--danger)] px-4 py-3 text-center text-sm font-bold tracking-wide">
            ⚠ RETIRED ASSET — OUT OF SERVICE
          </div>
        )}

        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] bg-[var(--surface-raised)]">
          <div className="flex justify-between items-start mb-3">
            <span className="font-mono-code text-xs font-bold text-[var(--accent)] uppercase bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1 rounded-md">
              {asset.assetCode}
            </span>
            <AssetStatusBadge status={asset.status} />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{asset.name}</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 uppercase tracking-wider font-medium">{asset.category}</p>
        </div>

        {/* Details */}
        <div className="p-5 space-y-5 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-[var(--text-secondary)] block uppercase tracking-wider font-semibold mb-1">Location</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{asset.location}</span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-secondary)] block uppercase tracking-wider font-semibold mb-1">Condition</span>
              <span className={`text-sm font-semibold ${conditionColor[asset.condition] || 'text-[var(--text-primary)]'}`}>
                {asset.condition}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-secondary)] block uppercase tracking-wider font-semibold mb-1">Last Inspected</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {asset.lastServiceDate ? new Date(asset.lastServiceDate).toLocaleDateString() : 'Never'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-secondary)] block uppercase tracking-wider font-semibold mb-1">Next Inspection</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {asset.nextServiceDate ? new Date(asset.nextServiceDate).toLocaleDateString() : 'TBD'}
              </span>
            </div>
          </div>

          {/* Activity timeline */}
          <div className="border-t border-[var(--border)] pt-4 mt-2">
            <h3 className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold mb-3">Recent Status Logs</h3>
            {asset.recentActivity.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] italic">No recent updates logged.</p>
            ) : (
              <div className="space-y-4">
                {asset.recentActivity.map((log, i) => (
                  <div key={i} className="flex gap-3 text-xs leading-5">
                    <div className="relative flex items-start justify-center shrink-0 pt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] z-10" />
                      {i < asset.recentActivity.length - 1 && (
                        <div className="absolute top-2 bottom-[-16px] w-[1px] bg-[var(--border)]" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{log.action}</p>
                      <p className="font-mono-code text-[10px] text-[var(--text-secondary)]">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        {asset.status !== 'Retired' && (
          <div className="p-5 border-t border-[var(--border)] bg-[var(--surface-raised)]">
            <Link
              to={`/report/${slug}`}
              className="block w-full btn-accent text-center py-3 text-sm rounded-xl"
            >
              Report a Fault / Issue
            </Link>
            <p className="text-center text-[10px] text-[var(--text-secondary)] mt-3">
              Found a problem? Tap above to submit a maintenance request.
            </p>
          </div>
        )}
      </div>

      <footer className="text-[10px] text-[var(--text-secondary)] mt-6 uppercase tracking-widest">
        Powered by MaintainIQ
      </footer>
    </div>
  );
}
