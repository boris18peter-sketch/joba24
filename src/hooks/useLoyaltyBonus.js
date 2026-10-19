import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { isPopupBlocked, subscribePopupGate } from '@/lib/popupGate';
import { hasAnnouncedBonus, rememberBonusAnnounced } from '@/lib/bonusAnnouncement';

/**
 * useLoyaltyBonus — detects a Joba bonus for the current user and raises it as a
 * celebration popup.
 *
 * Two paths, because the bonus is granted by SOMEONE ELSE's action and the
 * worker may not have the app open at that moment:
 *   1. Realtime — the bonus lands while the worker is in the app.
 *   2. Catch-up — the most recent bonus is checked on mount, so a worker who was
 *      away still gets their surprise the next time they open the app.
 *
 * Shown at most once, for ever: the "already announced" marker is kept on the
 * user's record (see @/lib/bonusAnnouncement), not only in this browser's
 * storage — a storage-only guard is what made the same bonus pop up again on
 * every launch for users whose WebView blocks or clears it.
 */
export function useLoyaltyBonus(user) {
  const [bonus, setBonus] = useState(null);
  // A bonus that arrived while the rating sheet was open waits here.
  const pendingRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    let cancelled = false;

    // ── THE BONUS WAITS FOR THE RATING SHEET ────────────────────────────────
    // Shown the instant the gate is free — either because the bonus arrived
    // after the rating was given, or because the rating sheet has just closed.
    const flush = () => {
      if (isPopupBlocked()) return;
      const next = pendingRef.current;
      if (!next) return;
      pendingRef.current = null;
      // Marked only once the bonus is actually shown, so a bonus held while the
      // rating sheet was open is never silently lost.
      rememberBonusAnnounced(userId, next.key);
      setBonus({ amount: next.amount, kind: next.kind });
    };

    const offer = async (tx) => {
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
      // The profile bonus is one-time per worker, so it is keyed per USER; a
      // rating bonus is keyed per TRANSACTION, because a worker earns many.
      // SignupGiftModal marks the same profile key whenever its welcome total
      // already includes the bonus, so the two never both announce it.
      const isProfile = !tx.task_id;
      const key = isProfile ? 'profile_bonus' : `tx_${tx.id}`;
      if (await hasAnnouncedBonus(userId, key)) return;
      if (cancelled) return;
      pendingRef.current = { key, amount: Math.round(value), kind: isProfile ? 'profile' : 'rating' };
      flush();
    };

    const unsubGate = subscribePopupGate(flush);

    const unsub = base44.entities.CreditTransaction.subscribe((event) => {
      if (event.type !== 'create' || !event.data) return;
      const tx = event.data;
      if (tx.user_id !== userId || tx.type !== 'Loyalty_Reward') return;
      offer(tx);
    });

    base44.entities.CreditTransaction
      .filter({ user_id: userId, type: 'Loyalty_Reward' }, '-created_date', 1)
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