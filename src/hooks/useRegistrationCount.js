import { useState, useEffect } from 'react';

const STORAGE_KEY = 'joba24_worker_count';
const START_COUNT = 648;
const BASE_DATE = new Date('2026-09-09T00:00:00').getTime();

function getExpectedCount() {
  const hoursSinceBase = (Date.now() - BASE_DATE) / 3600000;
  const growth = Math.max(0, Math.floor(hoursSinceBase * 2.3));
  return START_COUNT + growth;
}

/**
 * Shared registration counter — time-based growth that never decreases.
 * Used by PreLaunchWaitingPage, WorkerOnboarding, and Landing page.
 */
export function useRegistrationCount() {
  const [count, setCount] = useState(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    const expected = getExpectedCount();
    return Math.max(stored, expected);
  });

  useEffect(() => {
    const expected = getExpectedCount();
    setCount(c => {
      const next = Math.max(c, expected);
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
    const interval = setInterval(() => {
      setCount(c => {
        const next = c + Math.floor(Math.random() * 3) + 1;
        localStorage.setItem(STORAGE_KEY, String(next));
        return next;
      });
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  return count;
}