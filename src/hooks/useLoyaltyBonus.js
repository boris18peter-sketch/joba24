import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { isPopupBlocked, setPopupBlock, subscribePopupGate } from '@/lib/popupGate';
import { hasAnnouncedBonus, rememberBonusAnnounced } from '@/lib/bonusAnnouncement';
import { hasAskedCompletionPrompt } from '@/lib/completionPrompt';
import { expectBonus, resolveBonusWindow } from '@/lib/bonusWindow';

/**
 * How long a task-earned bonus waits for that task's rating sheet.
 *
 * The bonus and the ask are one flow, and the ask always comes first: a worker
 * who is told "you got a bonus" before being asked to rate has been paid for a
 * review he is then asked to write, which reads as a bribe and buries the sheet
 * he is actually supposed to answer. The wait is short — the rating sheet is
 * raised within a second or two of the completion — and it expires so a bonus is
 * never lost when the rating can never be raised (the task was already reviewed,
 * or the sheet was dismissed through a path that recorded no ask).
 *
 * ── WHY 45 SECONDS WAS WRONG ────────────────────────────────────────────────
 * It was the ceiling of a wait that almost never needed to be that long, and in
 * the one case it did get used — the ask was never raised for this task — the
 * bonus sat for three quarters of a minute and then landed on top of the closing
 * note, which had long since given up waiting for it. That is exactly the report
 * "the bonus popup comes very late, after the completion popup".
 */
const RATING_WAIT_MS = 4000;

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
      // ── THE RATING ASK ALWAYS COMES FIRST ─────────────────────────────────
      // A bonus earned by a task waits for that task's rating sheet to be
      // raised. Both are triggered by the same completion, and both used to be
      // decided independently: the bonus catch-up read finished first and
      // celebrated, and the rating sheet then had to wait behind it — the exact
      // order the user reported ("the bonus popped before the rating").
      //
      // The mark is written the moment the ask is DECIDED (see completionPrompt),
      // so this releases the instant the sheet is on its way — and the gate then
      // holds the bonus until the sheet is closed, which is the order:
      // rating → bonus → closing note.
      if (
        next.taskId
        && !hasAskedCompletionPrompt(userId, next.taskId, 'rating')
        && Date.now() - next.since < RATING_WAIT_MS
      ) return;
      pendingRef.current = null;
      // ── THE BONUS HOLDS THE GATE WHILE IT IS ON SCREEN ────────────────────
      // Taken BEFORE it is shown, so the next thing in the chain (the completion
      // note) can never be handed the gate in the instant between this popup
      // being chosen and it actually mounting. Without it the note opened on top
      // of the bonus it was supposed to follow.
      setPopupBlock('bonus', true);
      // Marked only once the bonus is actually shown, so a bonus held while the
      // rating sheet was open is never silently lost.
      rememberBonusAnnounced(userId, next.key);
      setBonus({ amount: next.amount, kind: next.kind });
      // The question "is a bonus coming?" now has its answer — yes, and it is on
      // screen. The gate above already keeps the closing note out until it is
      // closed, so the note does not also have to sit out the safety window.
      resolveBonusWindow();
    };

    // ── ASK THE SERVER AGAIN, DO NOT WAIT FOR A RELAUNCH ────────────────────
    // The bonus is granted by the SERVER the moment a rating is submitted, and
    // two things can stop that reaching this screen while the app is open:
    //   • the realtime socket is down (the app was backgrounded, or the phone
    //     dropped the connection) — the credit is created and no event arrives;
    //   • the popup gate was held by the rating sheet itself.
    // In both cases the reward was marked as owed and simply never announced, and
    // it only surfaced on the next cold start — which is exactly what testers saw
    // ("the bonus popup appears only after I close and reopen the app").
    // A gate release and a return to the foreground are precisely the two moments
    // when the answer can have changed, so both re-read the newest reward.
    const catchUp = async () => {
      const res = await base44.entities.CreditTransaction
        .filter({ user_id: userId, type: 'Loyalty_Reward' }, '-created_date', 1)
        .catch(() => null);
      const rows = Array.isArray(res) ? res : res?.items;
      if (cancelled) return;
      const queued = await offer(rows?.[0]);
      // ── THIS IS THE ANSWER THE CLOSING NOTE IS WAITING FOR ────────────────
      // The server was asked and there is nothing to announce, so the note no
      // longer has to wait for a bonus that will never come. Skipped when a bonus
      // WAS queued: then the screen belongs to the bonus until it is closed.
      if (!cancelled && !queued) resolveBonusWindow();
    };

    const refresh = () => {
      flush();
      if (isPopupBlocked() || pendingRef.current) return;
      catchUp();
    };

    // Returns TRUE when a bonus was queued for display (so the closing note keeps
    // waiting for it) and FALSE when there is nothing to announce (so the note is
    // released — see @/lib/bonusWindow).
    const offer = async (tx) => {
      if (!tx?.id) return false;
      // The popup announces THIS transaction's bonus and nothing else. A record
      // that carries no usable amount is not a bonus to celebrate, so it is
      // skipped rather than shown as a number that is not what the worker earned.
      const value = Number(tx.amount);
      if (!Number.isFinite(value) || value <= 0) return false;

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

      // ── A NEW WORKER GETS ONE CELEBRATION, NOT TWO ────────────────────────
      // The profile bonus is granted on the last step of the worker flow, and
      // the welcome gift popup then opens on the feed with the WHOLE welcome
      // total (signup + referral + profile) in it. Firing this popup first meant
      // a brand-new worker saw "5" and then "30" back to back — the same money
      // announced twice, which reads as a bug (it was one).
      //
      // So the profile bonus announces ITSELF only once the welcome celebration
      // is already behind this user. Until then the welcome total covers it —
      // and that modal marks the same 'profile_bonus' key, so it can never
      // surface again afterwards.
      if (isProfile && !(await hasAnnouncedBonus(userId, 'welcome_gift'))) return false;

      if (await hasAnnouncedBonus(userId, key)) return false;
      if (cancelled) return false;
      pendingRef.current = {
        key,
        amount: Math.round(value),
        kind: isProfile ? 'profile' : 'rating',
        // Which task earned it — the rating ask for THIS task is what the bonus
        // waits behind. A profile bonus has no task and is never held.
        taskId: isProfile ? '' : (tx.task_id || ''),
        since: Date.now(),
      };
      // ── THE CLOSING NOTE MUST NOT OVERTAKE A BONUS THAT IS ALREADY QUEUED ──
      // A bonus found NOW is only held while that task's rating sheet is open, so
      // the window the note watches has to cover the same wait. Without this the
      // note's 3.5s window expired, the note took the screen, and the bonus came
      // up behind it a moment later — the order was inverted for exactly the
      // bonus the user was most likely to notice. The window is closed either way:
      // by the bonus being shown (flush → resolveBonusWindow) or by this ceiling.
      expectBonus(RATING_WAIT_MS);
      flush();
      return true;
    };

    const unsubGate = subscribePopupGate(refresh);
    // ── THE WAIT IS POLLED, NOT ONLY EVENT-DRIVEN ────────────────────────────
    // A held bonus waits for a change of STATE (the rating ask being raised),
    // which raises no popup-gate event of its own — the gate is already held by
    // the sheet, so a second event would never come. Without this tick the
    // bonus would sit until the next gate change, i.e. until the sheet closed
    // and something else happened. It runs only while a bonus is actually
    // pending, so it costs nothing in the ordinary case.
    // 200ms, not 700ms: this tick is what releases a bonus the moment the rating
    // sheet steps aside, and at a seventh of a second the worst case is a wait
    // nobody can feel. It runs only while a bonus is actually pending.
    const holdTick = setInterval(() => {
      if (pendingRef.current) flush();
    }, 200);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    const unsub = base44.entities.CreditTransaction.subscribe((event) => {
      if (event.type !== 'create' || !event.data) return;
      const tx = event.data;
      if (tx.user_id !== userId || tx.type !== 'Loyalty_Reward') return;
      offer(tx);
    });

    // Newest first (both shapes handled inside catchUp: the SDK can hand back a
    // plain array or a page object, and a missed shape is a bonus never shown).
    catchUp();

    return () => {
      cancelled = true;
      unsub();
      unsubGate();
      clearInterval(holdTick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id]);

  // Closing the popup releases the gate it held while it was on screen — that
  // release is what lets the completion note take its turn.
  return {
    bonus,
    clearBonus: () => { setPopupBlock('bonus', false); setBonus(null); },
  };
}