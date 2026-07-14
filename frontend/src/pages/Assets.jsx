import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { assetService } from '../services/assetService';
import AssetForm from '../components/AssetForm';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['Operational', 'Issue Reported', 'Under Inspection', 'Under Maintenance', 'Out of Service', 'Retired'];

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

function ConditionText({ condition }) {
  const map = { Good: 'text-[var(--success)]', Fair: 'text-[var(--warning)]', Poor: 'text-[var(--danger)]' };
  return <span className={`font-semibold text-sm ${map[condition] || 'text-[var(--text-secondary)]'}`}>{condition}</span>;
}

export default function Assets() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qSearch = searchParams.get('search') || '';
  const qStatus = searchParams.get('status') || '';

  const [assets, setAssets] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(qSearch);
  const [statusFilter, setStatusFilter] = useState(qStatus);
  const [showForm, setShowForm] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, assetId: null, assetName: '' });

  useEffect(() => {
    setSearch(qSearch);
    setStatusFilter(qStatus);
  }, [qSearch, qStatus]);

  const fetchAssets = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await assetService.getAll(params);
      setAssets(res.data.data.assets);
      setPagination(res.data.data.pagination);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to load assets';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchAssets(1), 300);
    return () => clearTimeout(timer);
  }, [fetchAssets]);

  const handleCreated = () => {
    setShowForm(false);
    fetchAssets(1);
  };

  const handleDeleteAsset = async (assetId, assetName) => {
    setDeleteModal({ isOpen: true, assetId, assetName });
  };

  const confirmDeleteAsset = async () => {
    const { assetId, assetName } = deleteModal;
    try {
      await axios.delete(`${API_URL}/assets/${assetId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success(`Asset "${assetName}" deleted successfully.`);
      fetchAssets(1);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to delete asset.';
      toast.error(msg);
    } finally {
      setDeleteModal({ isOpen: false, assetId: null, assetName: '' });
    }
  };

  const handleEditAsset = (asset) => {
    // For now, navigate to asset detail page
    // Could implement inline edit modal later
    navigate(`/assets/${asset._id}`);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-6 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Assets</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{pagination.total} total assets registered</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-accent text-xs px-4 py-2"
        >
          + Create Asset
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, code, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base flex-1 font-mono-code"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-base w-auto cursor-pointer"
          style={{ width: 'auto' }}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Error */}
      {error && <div className="bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger)] rounded-lg p-3 text-sm mb-4">{error}</div>}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)] select-none">
          <div className="w-8 h-8 border-[3px] border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs">Fetching asset registry...</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center text-[var(--text-secondary)] py-20 border border-dashed border-[var(--border)] rounded-xl">
          No assets found. Create your first asset.
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] hidden md:block bg-[var(--surface)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface-raised)] text-[var(--text-secondary)] text-left">
                  <th className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Condition</th>
                  <th className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {assets.map((asset) => (
                  <tr key={asset._id} className="hover:bg-[var(--surface-raised)] transition-colors">
                    <td className="px-4 py-3 font-mono-code text-[var(--accent)] text-xs">{asset.assetCode}</td>
                    <td className="px-4 py-3 text-[var(--text-primary)] font-medium">{asset.name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{asset.category}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{asset.location}</td>
                    <td className="px-4 py-3"><ConditionText condition={asset.condition} /></td>
                    <td className="px-4 py-3"><AssetStatusBadge status={asset.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditAsset(asset)}
                          className="text-xs px-3 py-1.5 bg-[var(--accent)] text-white rounded hover:opacity-80"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset._id, asset.name)}
                          className="text-xs px-3 py-1.5 bg-[var(--danger)] text-white rounded hover:opacity-80"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {assets.map((asset) => (
              <div
                key={asset._id}
                className="card p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{asset.name}</h3>
                    <span className="font-mono-code text-xs text-[var(--accent)] mt-0.5 block">{asset.assetCode}</span>
                  </div>
                  <AssetStatusBadge status={asset.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[var(--border)]">
                  <div>
                    <span className="text-[var(--text-secondary)] block text-[9px] uppercase tracking-wider font-semibold mb-0.5">Category</span>
                    <span className="text-[var(--text-primary)]">{asset.category}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)] block text-[9px] uppercase tracking-wider font-semibold mb-0.5">Location</span>
                    <span className="text-[var(--text-primary)]">{asset.location}</span>
                  </div>
                  <div className="col-span-2 flex justify-between items-center border-t border-[var(--border)] pt-2 mt-1">
                    <span className="text-[var(--text-secondary)] text-[10px]">Condition</span>
                    <ConditionText condition={asset.condition} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                  <button
                    onClick={() => handleEditAsset(asset)}
                    className="text-xs px-3 py-1.5 bg-[var(--accent)] text-white rounded flex-1 hover:opacity-80"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAsset(asset._id, asset.name)}
                    className="text-xs px-3 py-1.5 bg-[var(--danger)] text-white rounded flex-1 hover:opacity-80"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => fetchAssets(p)}
              className={`w-8 h-8 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                p === pagination.page
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <AssetForm onClose={() => setShowForm(false)} onSuccess={handleCreated} />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, assetId: null, assetName: '' })}
        onConfirm={confirmDeleteAsset}
        title="Delete Asset"
        message={`Are you sure you want to delete "${deleteModal.assetName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
      />
    </div>
  );
}
