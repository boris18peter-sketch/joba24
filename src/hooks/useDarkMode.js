import { useEffect, useState } from 'react';

// System dark mode — follows the OS preference via prefers-color-scheme
export default function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setIsDark(e.matches);
    mql.addEventListener('change', handler);
    // Sync the <html> class immediately
    document.documentElement.classList.toggle('dark', mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return [isDark, () => {}];
}