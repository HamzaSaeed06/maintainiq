import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { assetService } from '../services/assetService';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const CONDITION_OPTIONS = ['Good', 'Fair', 'Poor'];
const STATUS_OPTIONS = ['Operational', 'Issue Reported', 'Under Inspection', 'Under Maintenance', 'Out of Service', 'Retired'];

const labelClass = 'text-xs font-semibold text-[var(--text-secondary)] block mb-1.5';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
        className="relative bg-[var(--surface)] rounded-2xl border border-[var(--border)] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {isEdit ? 'Edit Asset' : 'Register New Asset'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-raised)] transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto p-6">
          <form id="asset-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && (
              <div className="bg-[var(--critical-bg)] border border-[var(--danger)] text-[var(--danger)] rounded-lg p-3 text-sm">
                {serverError}
              </div>
            )}

            <div>
              <label className={labelClass}>Asset Name <span className="text-[var(--danger)]">*</span></label>
              <input
                {...register('name', { required: 'Name is required' })}
                className="input-base"
                placeholder="e.g. HVAC Unit A"
              />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Category <span className="text-[var(--danger)]">*</span></label>
              <input
                {...register('category', { required: 'Category is required' })}
                className="input-base"
                placeholder="e.g. HVAC, Electrical, Plumbing"
              />
              {errors.category && <p className={errorClass}>{errors.category.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Location <span className="text-[var(--danger)]">*</span></label>
              <input
                {...register('location', { required: 'Location is required' })}
                className="input-base"
                placeholder="e.g. Floor 3, Server Room"
              />
              {errors.location && <p className={errorClass}>{errors.location.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Condition <span className="text-[var(--danger)]">*</span></label>
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

            <p className="text-[var(--text-tertiary)] text-xs mt-2">
              {!isEdit
                ? 'Asset code and QR code will be auto-generated upon creation.'
                : 'Note: The public slug and QR code remain unchanged when editing.'}
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-raised)] flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="asset-form"
            disabled={loading}
            className="btn-accent flex-1"
          >
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Asset'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
