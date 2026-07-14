import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { assetService } from '../services/assetService';
import AssetForm from '../components/AssetForm';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, Edit2, Trash2, Package } from 'lucide-react';

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

function ConditionBadge({ condition }) {
  const map = { 
    Good: 'bg-[var(--success-muted)] text-[var(--success-text)] border-[var(--success-muted)]', 
    Fair: 'bg-[var(--warning-muted)] text-[var(--warning-text)] border-[var(--warning-muted)]', 
    Poor: 'bg-[var(--danger-muted)] text-[var(--danger-text)] border-[var(--danger-muted)]' 
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${map[condition] || 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)]'}`}>
      {condition}
    </span>
  );
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

  const handleDeleteAsset = (e, assetId, assetName) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, assetId, assetName });
  };

  const confirmDeleteAsset = async () => {
    const { assetId, assetName } = deleteModal;
    try {
      await assetService.delete(assetId); // Assumes delete exists in service
      toast.success(`Asset "${assetName}" deleted successfully.`);
      fetchAssets(1);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to delete asset.';
      toast.error(msg);
    } finally {
      setDeleteModal({ isOpen: false, assetId: null, assetName: '' });
    }
  };

  const handleEditAsset = (e, asset) => {
    e.stopPropagation();
    navigate(`/assets/${asset._id}`);
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] p-4 md:p-6 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight">Assets</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">{pagination.total} total assets registered</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-accent flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Asset</span>
          </button>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by name, code, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-9 font-mono-code"
            />
          </div>
          <div className="relative w-full sm:w-48 shrink-0">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-base pl-9 cursor-pointer appearance-none"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger)] rounded-xl p-4 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 skeleton rounded-xl" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface)]">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center mx-auto mb-4 text-[var(--text-tertiary)]">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No assets found</h3>
            <p className="text-sm text-[var(--text-secondary)]">Adjust your filters or create a new asset.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-[var(--surface-raised)] text-[var(--text-secondary)] border-b border-[var(--border)]">
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Code / Name</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Category</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Location</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Condition</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {assets.map((asset) => (
                    <tr 
                      key={asset._id} 
                      onClick={() => navigate(`/assets/${asset._id}`)}
                      className="hover:bg-[var(--surface-raised)] transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3">
                        <div className="font-semibold text-[var(--text-primary)]">{asset.name}</div>
                        <div className="font-mono-code text-[11px] text-[var(--text-secondary)] mt-0.5">{asset.assetCode}</div>
                      </td>
                      <td className="px-5 py-3 text-[var(--text-secondary)] font-medium">{asset.category}</td>
                      <td className="px-5 py-3 text-[var(--text-secondary)]">{asset.location}</td>
                      <td className="px-5 py-3"><ConditionBadge condition={asset.condition} /></td>
                      <td className="px-5 py-3"><AssetStatusBadge status={asset.status} /></td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleEditAsset(e, asset)}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--surface)] rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteAsset(e, asset._id, asset.name)}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--surface)] rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[var(--border)]">
              {assets.map((asset) => (
                <div
                  key={asset._id}
                  onClick={() => navigate(`/assets/${asset._id}`)}
                  className="p-4 space-y-3 hover:bg-[var(--surface-raised)] active:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">{asset.name}</h3>
                      <span className="font-mono-code text-xs text-[var(--text-secondary)] mt-1 block">{asset.assetCode}</span>
                    </div>
                    <AssetStatusBadge status={asset.status} />
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] pt-1">
                    <span className="font-medium bg-[var(--surface-raised)] px-2 py-0.5 rounded border border-[var(--border)]">{asset.category}</span>
                    <span className="truncate">{asset.location}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-[var(--border)]">
                    <ConditionBadge condition={asset.condition} />
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => handleEditAsset(e, asset)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] bg-[var(--surface-raised)] rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteAsset(e, asset._id, asset.name)}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--danger)] bg-[var(--surface-raised)] rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && !loading && (
          <div className="flex justify-center gap-1.5 mt-6">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => fetchAssets(p)}
                className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                  p === pagination.page
                    ? 'bg-[var(--text-primary)] text-[var(--bg)]'
                    : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

      </div>

      {showForm && (
        <AssetForm onClose={() => setShowForm(false)} onSuccess={handleCreated} />
      )}

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
