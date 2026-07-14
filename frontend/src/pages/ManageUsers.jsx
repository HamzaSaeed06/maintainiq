import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import Avatar from '../components/Avatar';
import { Users, UserPlus, Trash2, Power, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const labelClass = 'text-xs font-semibold text-[var(--text-secondary)] block mb-1.5';
const errorClass = 'text-[var(--danger)] text-xs mt-1 font-medium';

export default function ManageUsers() {
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [listLoading, setListLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, userId: null, userName: '' });
  const [statusModal, setStatusModal] = useState({ isOpen: false, userId: null, userName: null, currentStatus: null });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { name: '', email: '', password: '', role: 'technician', phone: '' },
  });

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (user.role !== 'admin') {
      toast.error('Admin access required.');
      navigate('/dashboard');
    } else {
      fetchTechnicians();
    }
  }, []);

  const fetchTechnicians = async (page = 1) => {
    setListLoading(true);
    try {
      const res = await axios.get(`${API_URL}/auth/technicians`, {
        params: { page, limit: 10 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setTechnicians(res.data.data.technicians || []);
      setPagination(res.data.data.pagination || { total: 0, page: 1, pages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to load technicians.');
    } finally {
      setListLoading(false);
    }
  };

  const handleAvatarUploaded = (techId, updatedUser) => {
    setTechnicians((prev) => prev.map((t) => (t._id === techId ? { ...t, avatarUrl: updatedUser.avatarUrl } : t)));
  };

  const onSubmit = async (data) => {
    setCreating(true);
    try {
      await axios.post(`${API_URL}/auth/register`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`User "${data.name}" created successfully.`);
      reset();
      fetchTechnicians();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to create user.';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteUser = async () => {
    const { userId, userName } = deleteModal;
    try {
      await axios.delete(`${API_URL}/auth/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`User "${userName}" deleted successfully.`);
      fetchTechnicians();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to delete user.';
      toast.error(msg);
    } finally {
      setDeleteModal({ isOpen: false, userId: null, userName: '' });
    }
  };

  const confirmToggleStatus = async () => {
    const { userId, currentStatus } = statusModal;
    try {
      await axios.patch(`${API_URL}/auth/${userId}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`User "${statusModal.userName}" ${currentStatus ? 'deactivated' : 'activated'} successfully.`);
      fetchTechnicians();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to toggle user status.';
      toast.error(msg);
    } finally {
      setStatusModal({ isOpen: false, userId: null, userName: null, currentStatus: null });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] p-4 md:p-6 transition-colors pb-20">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">

        {/* Page Header */}
        <div className="border-b border-[var(--border)] pb-5">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight">Team Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
            Register administrators and dispatch field technicians.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
          
          {/* Create User Form (Left Col on Desktop) */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
              <h2 className="text-base font-bold text-[var(--text-primary)] mb-5 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[var(--accent)]" />
                Register Account
              </h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className={labelClass}>Full Name <span className="text-[var(--danger)]">*</span></label>
                  <input
                    {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })}
                    className="input-base"
                    placeholder="e.g. Ali Hassan"
                  />
                  {errors.name && <p className={errorClass}>{errors.name.message}</p>}
                </div>

                <div>
                  <label className={labelClass}>Email Address <span className="text-[var(--danger)]">*</span></label>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                    })}
                    type="email"
                    className="input-base"
                    placeholder="name@company.com"
                  />
                  {errors.email && <p className={errorClass}>{errors.email.message}</p>}
                </div>

                <div>
                  <label className={labelClass}>Password <span className="text-[var(--danger)]">*</span></label>
                  <input
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Minimum 8 characters' },
                    })}
                    type="password"
                    className="input-base"
                    placeholder="Minimum 8 characters"
                  />
                  {errors.password && <p className={errorClass}>{errors.password.message}</p>}
                </div>

                <div>
                  <label className={labelClass}>Role <span className="text-[var(--danger)]">*</span></label>
                  <select
                    {...register('role', { required: 'Role is required' })}
                    className="input-base cursor-pointer appearance-none"
                  >
                    <option value="technician">Technician</option>
                    <option value="admin">Administrator</option>
                  </select>
                  {errors.role && <p className={errorClass}>{errors.role.message}</p>}
                </div>

                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="input-base"
                    placeholder="Optional"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn-accent w-full justify-center"
                  >
                    {creating ? 'Creating...' : 'Create Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => reset()}
                    className="btn-secondary w-full justify-center text-xs"
                  >
                    Clear Form
                  </button>
                </div>
              </form>
            </motion.div>
          </div>

          {/* Technicians List (Right Col on Desktop) */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card overflow-hidden">
              <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-raised)]">
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--text-secondary)]" />
                  Team Directory
                </h2>
                <span className="font-mono-code text-xs font-semibold text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1 rounded-md shadow-sm">
                  {pagination.total} Member{pagination.total !== 1 ? 's' : ''}
                </span>
              </div>

              {listLoading ? (
                <div className="space-y-0 divide-y divide-[var(--border)]">
                   {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[72px] skeleton rounded-none" />
                  ))}
                </div>
              ) : technicians.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-[var(--surface-raised)] flex items-center justify-center mx-auto mb-4 text-[var(--text-tertiary)] border border-[var(--border)]">
                    <Users className="w-8 h-8" />
                  </div>
                  <p className="text-base font-semibold text-[var(--text-primary)]">No members found</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">Use the form to register your first team member.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {technicians.map((tech) => (
                    <div key={tech._id} className="p-4 md:p-6 hover:bg-[var(--surface-raised)] transition-colors group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        
                        <div className="flex items-center gap-4">
                          <Avatar
                            user={tech}
                            size="lg"
                            editable
                            onUploaded={(updated) => handleAvatarUploaded(tech._id, updated)}
                          />
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-bold text-[var(--text-primary)] leading-none">{tech.name}</p>
                              {tech.isActive ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--success)] bg-[var(--success-muted)] px-1.5 py-0.5 rounded border border-[var(--success-muted)]">
                                  <CheckCircle2 className="w-3 h-3" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                                  <XCircle className="w-3 h-3" /> Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] font-mono-code">{tech.email}</p>
                            {tech.phone && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{tech.phone}</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ml-14 sm:ml-0">
                          <button
                            onClick={() => setStatusModal({ isOpen: true, userId: tech._id, userName: tech.name, currentStatus: tech.isActive })}
                            className={`p-2 rounded-lg border transition-colors ${
                              tech.isActive 
                                ? 'bg-[var(--surface)] text-[var(--warning)] border-[var(--border)] hover:bg-[var(--warning-muted)] hover:border-[var(--warning)]' 
                                : 'bg-[var(--surface)] text-[var(--success)] border-[var(--border)] hover:bg-[var(--success-muted)] hover:border-[var(--success)]'
                            }`}
                            title={tech.isActive ? 'Deactivate Account' : 'Activate Account'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, userId: tech._id, userName: tech.name })}
                            className="p-2 rounded-lg bg-[var(--surface)] text-[var(--danger)] border border-[var(--border)] hover:bg-[var(--danger-muted)] hover:border-[var(--danger)] transition-colors"
                            title="Delete Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pagination.pages > 1 && !listLoading && (
                <div className="flex justify-center gap-1.5 py-4 border-t border-[var(--border)]">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => fetchTechnicians(p)}
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
            </motion.div>
          </div>

        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, userId: null, userName: '' })}
        onConfirm={confirmDeleteUser}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete "${deleteModal.userName}"? This action cannot be undone.`}
        confirmText="Delete Account"
        cancelText="Cancel"
        danger={true}
      />

      <ConfirmModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ isOpen: false, userId: null, userName: null, currentStatus: null })}
        onConfirm={confirmToggleStatus}
        title={`${statusModal.currentStatus ? 'Deactivate' : 'Activate'} User`}
        message={statusModal.currentStatus 
          ? `Deactivating "${statusModal.userName}" will prevent them from logging in until reactivated.` 
          : `Activating "${statusModal.userName}" will restore their login access.`}
        confirmText={statusModal.currentStatus ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        danger={statusModal.currentStatus}
      />
    </div>
  );
}
