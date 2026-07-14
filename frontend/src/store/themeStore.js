import { create } from 'zustand';

// Detect OS preference on first load
const getSystemPreference = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

// Apply theme class to <html> and persist
const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem('theme', theme);
};

// Initialize: saved preference > system preference
const savedTheme = localStorage.getItem('theme');
const initialTheme = savedTheme || getSystemPreference();
applyTheme(initialTheme);

const useThemeStore = create((set) => ({
  theme: initialTheme,
  toggle: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return { theme: next };
    }),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));

export default useThemeStore;
