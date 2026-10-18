import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useLoyaltyBonus — detects a professionalism bonus (5-star rating) for the
 * current user and raises it as a celebration popup.
 *
 * Two paths, because the bonus is granted by the CLIENT's action and the worker
 * may not have the app open at that moment:
 *   1. Realtime — the bonus lands while the worker is in the app.
 *   2. Catch-up — the most recent bonus is checked on mount, so a worker who was
 *      away still gets their surprise the next time they open the app.
 *
 * Shown at most once per transaction: the transaction id is the dedupe key,
 * stored locally, so closing the popup never brings it back.
 */
export function useLoyaltyBonus(user) {
  const [bonus, setBonus] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const offer = (tx) => {
      if (!tx?.id) return;
      const key = `joba24_loyalty_popup_${tx.id}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
      setBonus({ amount: tx.amount || 0, tasksCompleted: user.tasks_completed || 0 });
    };

    const unsub = base44.entities.CreditTransaction.subscribe((event) => {
      if (event.type !== 'create' || !event.data) return;
      const tx = event.data;
      if (tx.user_id !== user.id || tx.type !== 'Loyalty_Reward') return;
      offer(tx);
    });

    base44.entities.CreditTransaction
      .filter({ user_id: user.id, type: 'Loyalty_Reward' }, '-created_date', 1)
      .then((rows) => { if (!cancelled) offer(rows?.[0]); })
      .catch(() => {});

    return () => { cancelled = true; unsub(); };
  }, [user?.id, user?.tasks_completed]);

  return { bonus, clearBonus: () => setBonus(null) };
}