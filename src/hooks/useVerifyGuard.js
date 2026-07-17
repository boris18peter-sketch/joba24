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

  return { gate, showVerify, setShowVerify, onSuccess, onClose };
}