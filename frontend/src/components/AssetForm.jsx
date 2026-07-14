import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { assetService } from '../services/assetService';
import toast from 'react-hot-toast';

const CONDITION_OPTIONS = ['Good', 'Fair', 'Poor'];
const STATUS_OPTIONS = ['Operational', 'Issue Reported', 'Under Inspection', 'Under Maintenance', 'Out of Service', 'Retired'];

const labelClass = 'text-[11px] text-[var(--text-secondary)] block uppercase tracking-wider font-semibold mb-1.5';
const errorClass = 'text-[var(--danger)] text-xs mt-1';

export default function AssetForm({ asset, onClose, onSuccess }) {
  const isEdit = !!asset;
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset: _reset } = useForm({
    defaultValues: isEdit ? {
      name: asset.name,
      category: asset.category,
      location: asset.location,
      condition: asset.condition,
      status: asset.status,
    } : {}
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');
    try {
      if (isEdit) {
        await assetService.update(asset._id, data);
        toast.success('Asset updated successfully.');
      } else {
        await assetService.create(data);
        toast.success('Asset created successfully.');
      }
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Something went wrong';
      toast.error(msg);
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">{isEdit ? 'Edit Asset' : 'Register Asset'}</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-lg leading-none cursor-pointer">&times;</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {serverError && (
            <div className="bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger)] rounded-lg p-3 text-sm">{serverError}</div>
          )}

          <div>
            <label className={labelClass}>Asset Name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="input-base"
              placeholder="e.g. HVAC Unit A"
            />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Category *</label>
            <input
              {...register('category', { required: 'Category is required' })}
              className="input-base"
              placeholder="e.g. HVAC, Electrical, Plumbing"
            />
            {errors.category && <p className={errorClass}>{errors.category.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Location *</label>
            <input
              {...register('location', { required: 'Location is required' })}
              className="input-base"
              placeholder="e.g. Floor 3, Server Room"
            />
            {errors.location && <p className={errorClass}>{errors.location.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Condition *</label>
              <select
                {...register('condition', { required: 'Condition is required' })}
                className="input-base cursor-pointer"
              >
                <option value="">Select...</option>
                {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.condition && <p className={errorClass}>{errors.condition.message}</p>}
            </div>

            {isEdit && (
              <div>
                <label className={labelClass}>Status</label>
                <select
                  {...register('status')}
                  className="input-base cursor-pointer"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          <p className="text-[var(--text-secondary)] text-xs">
            {!isEdit
              ? 'Asset code and QR code will be auto-generated on creation.'
              : '⚠ The public slug and QR code will not change when editing.'}
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text-secondary)] py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer border border-[var(--border)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-accent flex-1 py-2.5"
            >
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
