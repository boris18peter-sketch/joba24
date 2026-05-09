import { useState } from 'react';

/**
 * useVerifyGuard — centralized KYC gate hook.
 *
 * Usage:
 *   const { gate, VerifyGate } = useVerifyGuard(me);
 *   gate(() => doSomething());  // shows VerifyModal if not verified, else runs callback
 *   // Render <VerifyGate /> anywhere in JSX
 */
export function useVerifyGuard(me) {
  const [showVerify, setShowVerify] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const gate = (action) => {
    if (me?.is_verified) {
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

  return { gate, showVerify, onSuccess, onClose };
}