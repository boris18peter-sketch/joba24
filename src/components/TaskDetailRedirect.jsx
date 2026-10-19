import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { setPendingTask } from '@/lib/pendingTask';

/**
 * TaskDetailRedirect — the handler for the /task/:id deep-link URL.
 *
 * It does NOT open the task itself. It hands the id to DeepLinkHandler, which
 * is the one component that knows how to open a task safely: it waits for auth
 * to resolve, respects the pre-launch gate, waits out the /join onboarding
 * redirect, and resolves the Task's own Brand before opening the sheet.
 *
 * Opening the sheet from here instead raced every one of those. A cold open
 * from a Facebook link is unauthenticated, so the sheet was opened and then
 * immediately hidden again by the login/onboarding redirect — the visitor saw
 * the feed and never the task. Routing the id through the proven handler fixes
 * that without duplicating its logic.
 */
export default function TaskDetailRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    // Both stores — see @/lib/pendingTask for why.
    setPendingTask(id);
    // Replace, so the back button never lands on this no-op redirect.
    navigate('/', { replace: true });
  }, [id, navigate]);

  return null;
}