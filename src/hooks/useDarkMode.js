import { useState, useEffect } from 'react';

export default function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('joba24_dark');
    if (stored !== null) return stored === 'true';
    // Fall back to system preference
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  // Listen for system preference changes (when no manual override is set)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e) => {
      // Only follow system if user hasn't manually set a preference
      if (localStorage.getItem('joba24_dark') === null) {
        setDark(e.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('joba24_dark', dark);
  }, [dark]);

  return [dark, setDark];
}