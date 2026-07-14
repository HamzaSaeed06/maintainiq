import toast from 'react-hot-toast';

// Toast queue to prevent multiple toasts appearing at once
let toastQueue = [];
let isProcessing = false;

const processQueue = () => {
  if (isProcessing || toastQueue.length === 0) return;
  
  isProcessing = true;
  const { type, message, options } = toastQueue.shift();
  
  // Show toast with delay
  setTimeout(() => {
    if (type === 'success') {
      toast.success(message, options);
    } else if (type === 'error') {
      toast.error(message, options);
    } else if (type === 'info') {
      toast(message, options);
    }
    
    isProcessing = false;
    processQueue(); // Process next toast
  }, 500); // 500ms delay between toasts
};

export const queuedToast = {
  success: (message, options = {}) => {
    toastQueue.push({ type: 'success', message, options });
    processQueue();
  },
  error: (message, options = {}) => {
    toastQueue.push({ type: 'error', message, options });
    processQueue();
  },
  info: (message, options = {}) => {
    toastQueue.push({ type: 'info', message, options });
    processQueue();
  }
};

export default toast;
