import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const labelClass = 'text-[11px] text-[var(--text-secondary)] block uppercase tracking-wider font-semibold mb-1.5';
const errorClass = 'text-[var(--danger)] text-[11px] mt-1';

export default function ManageUsers() {
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, userId: null, userName: '' });
  const [statusModal, setStatusModal] = useState({ isOpen: false, userId: null, userName: null, currentStatus: null });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { name: '', email: '', password: '', role: 'technician', phone: '' },
  });

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Admin guard
  useEffect(() => {
    if (user.role !== 'admin') {
      toast.error('Admin access required.');
      navigate('/dashboard');
    }
  }, []);

  const fetchTechnicians = async () => {
    setListLoading(true);
    try {
      const res = await axios.get(`${API_URL}/auth/technicians`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTechnicians(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to load technicians.');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { fetchTechnicians(); }, []);

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

  const handleDeleteUser = async (userId, userName) => {
    setDeleteModal({ isOpen: true, userId, userName });
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

  const handleToggleStatus = async (userId, userName, currentStatus) => {
    setStatusModal({ isOpen: true, userId, userName, currentStatus });
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
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-6 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Page Header */}
        <div className="border-b border-[var(--border)] pb-5">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Manage Users</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Register new platform accounts and view existing technician team members.
          </p>
        </div>

        {/* Create User Form */}
        <div className="card p-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-5 pb-3 border-b border-[var(--border)]">
            Register New Account
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })}
                  className="input-base"
                  placeholder="e.g. Ali Hassan"
                />
                {errors.name && <p className={errorClass}>{errors.name.message}</p>}
              </div>

              <div>
                <label className={labelClass}>Email Address *</label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                  })}
                  type="email"
                  className="input-base"
                  placeholder="e.g. ali@company.com"
                />
                {errors.email && <p className={errorClass}>{errors.email.message}</p>}
              </div>

              <div>
                <label className={labelClass}>Password *</label>
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
                <label className={labelClass}>Role *</label>
                <select
                  {...register('role', { required: 'Role is required' })}
                  className="input-base cursor-pointer"
                >
                  <option value="technician">Technician</option>
                  <option value="admin">Admin</option>
                </select>
                {errors.role && <p className={errorClass}>{errors.role.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Phone Number (Optional)</label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="input-base"
                  placeholder="e.g. +92 300 1234567"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="btn-accent px-6 py-2.5 text-sm"
              >
                {creating ? 'Creating...' : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => reset()}
                className="px-5 py-2.5 bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Technicians List */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Technician Team</h2>
            <span className="font-mono-code text-[11px] text-[var(--text-secondary)] bg-[var(--surface-raised)] border border-[var(--border)] px-2 py-0.5 rounded">
              {technicians.length} member{technicians.length !== 1 ? 's' : ''}
            </span>
          </div>

          {listLoading ? (
            <div className="py-12 text-center text-[var(--text-secondary)]">
              <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs">Loading team members...</p>
            </div>
          ) : technicians.length === 0 ? (
            <div className="py-12 text-center border-t border-[var(--border)]">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center mx-auto mb-3 text-2xl">
                👷
              </div>
              <p className="text-sm text-[var(--text-primary)] font-medium">No technicians yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Register a new account above to add your first team member.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[var(--surface-raised)] border-b border-[var(--border)] text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Phone</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Joined</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-sm">
                    {technicians.map((tech) => (
                      <tr key={tech._id} className="hover:bg-[var(--surface-raised)] transition-colors">
                        <td className="px-6 py-3 font-medium text-[var(--text-primary)]">{tech.name}</td>
                        <td className="px-6 py-3 text-[var(--text-secondary)] font-mono-code text-xs">{tech.email}</td>
                        <td className="px-6 py-3 text-[var(--text-secondary)] text-xs">{tech.phone || '—'}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${tech.isActive ? 'bg-[var(--success)] text-white' : 'bg-[var(--danger)] text-white'}`}>
                            {tech.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-[var(--text-secondary)] text-xs font-mono-code">
                          {tech.createdAt ? new Date(tech.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleStatus(tech._id, tech.name, tech.isActive)}
                              className={`text-xs px-2 py-1 rounded ${tech.isActive ? 'bg-[var(--warning)] text-white' : 'bg-[var(--success)] text-white'} hover:opacity-80`}
                            >
                              {tech.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(tech._id, tech.name)}
                              className="text-xs px-2 py-1 bg-[var(--danger)] text-white rounded hover:opacity-80"
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

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-[var(--border)]">
                {technicians.map((tech) => (
                  <div key={tech._id} className="px-5 py-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{tech.name}</p>
                        <p className="text-xs text-[var(--text-secondary)] font-mono-code">{tech.email}</p>
                        {tech.phone && <p className="text-xs text-[var(--text-secondary)]">{tech.phone}</p>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${tech.isActive ? 'bg-[var(--success)] text-white' : 'bg-[var(--danger)] text-white'}`}>
                        {tech.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleToggleStatus(tech._id, tech.name, tech.isActive)}
                        className={`text-xs px-3 py-1.5 rounded flex-1 ${tech.isActive ? 'bg-[var(--warning)] text-white' : 'bg-[var(--success)] text-white'} hover:opacity-80`}
                      >
                        {tech.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(tech._id, tech.name)}
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
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, userId: null, userName: '' })}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteModal.userName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
      />

      {/* Status Toggle Confirmation Modal */}
      <ConfirmModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ isOpen: false, userId: null, userName: null, currentStatus: null })}
        onConfirm={confirmToggleStatus}
        title={`${statusModal.currentStatus ? 'Deactivate' : 'Activate'} User`}
        message={`Are you sure you want to ${statusModal.currentStatus ? 'deactivate' : 'activate'} "${statusModal.userName}"?`}
        confirmText={statusModal.currentStatus ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        danger={statusModal.currentStatus}
      />
    </div>
  );
}
