import { useEffect } from 'react';

// Dark mode is disabled — always force light mode
export default function useDarkMode() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('joba24_dark');
  }, []);

  return [false, () => {}];
}