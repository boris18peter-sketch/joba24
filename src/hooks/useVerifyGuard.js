import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { isUserVerified } from '@/lib/utils';

/**
 * useVerifyGuard — centralized KYC gate hook.
 *
 * Usage:
 *   const { gate, VerifyGate } = useVerifyGuard(me);
 *   gate(() => doSomething());  // redirects to login if not authenticated, shows VerifyModal if not verified, else runs callback
 *   // Render <VerifyGate /> anywhere in JSX
 */
export function useVerifyGuard(me) {
  const [showVerify, setShowVerify] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // ── TWO GATES, TWO DIFFERENT QUESTIONS ────────────────────────────────────
  // `gateAuth` asks only "are you signed in?". `gate` asks that AND "has your
  // identity been verified?".
  //
  // Identity verification (KYC) exists to make TAKING WORK trustworthy — it is
  // what lets a publisher trust the stranger who turns up at their door. It was
  // never meant to govern CONVERSATION. Routing chat through `gate` meant a
  // brand-new user could not send a single message: they opened the thread,
  // typed, pressed send, and the verification sheet appeared instead of their
  // message. Nothing said why, so it read as a broken app — the worst possible
  // first impression, because talking to the other side is the entire point.
  //
  // The rule: KYC gates taking work; signing in gates talking. Anything that
  // only reads or writes a conversation uses `gateAuth`.
  const gateAuth = (action) => {
    if (!me) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    action();
  };

  const gate = (action) => {
    // Not logged in → redirect to login
    if (!me) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    if (isUserVerified(me)) {
      action();
    } else {
      setPendingAction(() => action);
      setShowVerify(true);
    }
  };

  const onSuccess = () => {
    setShowVerify(false);
    pendingAction?.();
    setPendingAction(null);
  };

  const onClose = () => {
    setShowVerify(false);
    setPendingAction(null);
  };

  return { gate, gateAuth, showVerify, setShowVerify, onSuccess, onClose };
}