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
      // The popup announces THIS transaction's bonus and nothing else. A record
      // that carries no usable amount is not a bonus to celebrate, so it is
      // skipped rather than shown as a number that is not what the worker earned.
      const value = Number(tx.amount);
      if (!Number.isFinite(value) || value <= 0) return;
      const key = `joba24_loyalty_popup_${tx.id}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
      setBonus({ amount: Math.round(value), tasksCompleted: user.tasks_completed || 0 });
    };

    const unsub = base44.entities.CreditTransaction.subscribe((event) => {
      if (event.type !== 'create' || !event.data) return;
      const tx = event.data;
      if (tx.user_id !== user.id || tx.type !== 'Loyalty_Reward') return;
      offer(tx);
    });

    base44.entities.CreditTransaction
      .filter({ user_id: user.id, type: 'Loyalty_Reward' }, '-created_date', 1)
      // Newest first. The SDK can hand back either a plain array or a page
      // object depending on the call form, so both shapes are read — otherwise
      // the catch-up silently finds nothing and the bonus is never announced.
      .then((res) => {
        const rows = Array.isArray(res) ? res : res?.items;
        if (!cancelled) offer(rows?.[0]);
      })
      .catch(() => {});

    return () => { cancelled = true; unsub(); };
  }, [user?.id, user?.tasks_completed]);

  return { bonus, clearBonus: () => setBonus(null) };
}