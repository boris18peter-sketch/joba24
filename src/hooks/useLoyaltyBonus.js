import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { isPopupBlocked, subscribePopupGate } from '@/lib/popupGate';

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
  // A bonus that arrived while the rating sheet was open waits here.
  const pendingRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    // ── THE BONUS WAITS FOR THE RATING SHEET ────────────────────────────────
    // Shown the instant the gate is free — either because the bonus arrived
    // after the rating was given, or because the rating sheet has just closed.
    const flush = () => {
      if (isPopupBlocked()) return;
      const next = pendingRef.current;
      if (!next) return;
      pendingRef.current = null;
      // The dedupe key is written only once the bonus is actually shown, so a
      // bonus held while the sheet was open is never silently lost.
      try { localStorage.setItem(next.key, '1'); } catch { /* storage blocked */ }
      setBonus({ amount: next.amount, kind: next.kind });
    };

    const offer = (tx) => {
      if (!tx?.id) return;
      // The popup announces THIS transaction's bonus and nothing else. A record
      // that carries no usable amount is not a bonus to celebrate, so it is
      // skipped rather than shown as a number that is not what the worker earned.
      const value = Number(tx.amount);
      if (!Number.isFinite(value) || value <= 0) return;
      // ── TWO BONUSES, TWO DIFFERENT ANNOUNCEMENTS ──────────────────────────
      // The two are told apart by `task_id`: a rating reward is always tied to a
      // task, a profile-completion bonus never is. The popup carries copy for
      // both (`kind`), and each must announce its own bonus.
      //
      // A profile bonus was skipped here on the assumption that the welcome
      // popup had already covered it. It had not: a worker who completes the
      // profile AFTER signing up — the normal path, from the blue banner — was
      // granted the Jobas with no popup at all, so the bonus arrived silently.
      //
      // The profile bonus is one-time per worker, so it is deduped per USER; a
      // rating bonus is deduped per TRANSACTION, because a worker earns many.
      // SignupGiftModal writes the same per-user key whenever its welcome total
      // already includes the profile bonus, so the two never both announce it.
      const isProfile = !tx.task_id;
      const key = isProfile ? `joba24_profile_bonus_popup_${user.id}` : `joba24_loyalty_popup_${tx.id}`;
      if (localStorage.getItem(key)) return;
      pendingRef.current = { key, amount: Math.round(value), kind: isProfile ? 'profile' : 'rating' };
      flush();
    };

    const unsubGate = subscribePopupGate(flush);

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

    return () => { cancelled = true; unsub(); unsubGate(); };
  }, [user?.id]);

  return { bonus, clearBonus: () => setBonus(null) };
}