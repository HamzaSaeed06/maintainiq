import { useRef, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Camera, Loader2 } from 'lucide-react';

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-sm',
};

/**
 * Circular avatar used everywhere a person is represented — Navbar, the
 * Users directory, and issue assignee chips. Shows the uploaded photo when
 * present, otherwise falls back to the initial. Pass `editable` + `userId`
 * to let the viewer upload/replace the photo in place.
 */
export default function Avatar({ user, size = 'md', editable = false, onUploaded }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const initial = (user?.name || 'U').charAt(0).toUpperCase();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.patch(`/auth/${user._id || user.id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Profile photo updated.');
      onUploaded?.(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`relative shrink-0 ${sizeClass} group/avatar`}>
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.name || 'User'}
          className={`${sizeClass} rounded-full object-cover border border-[var(--border)]`}
        />
      ) : (
        <div className={`${sizeClass} rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center font-semibold text-[var(--text-secondary)] uppercase`}>
          {initial}
        </div>
      )}

      {editable && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            title="Change photo"
            className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
