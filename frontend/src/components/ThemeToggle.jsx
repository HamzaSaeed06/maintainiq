import { Sun, Moon } from 'lucide-react';
import useThemeStore from '../store/themeStore';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer
        text-[var(--text-secondary)] hover:text-[var(--text-primary)]
        hover:bg-[var(--surface-raised)] border border-transparent
        hover:border-[var(--border)] ${className}`}
    >
      {isDark
        ? <Sun size={16} strokeWidth={2} />
        : <Moon size={16} strokeWidth={2} />
      }
    </button>
  );
}
