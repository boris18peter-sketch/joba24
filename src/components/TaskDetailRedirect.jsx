import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';

/**
 * TaskDetailRedirect — replaces the legacy standalone /task/:id PAGE.
 *
 * Every task deep-link (push-notification tap on web, share links like
 * joba24.com/task/{id}, in-app navigations to /task/{id}) now opens the
 * global TaskDetailSheet overlay instead of a full-page view, matching the
 * in-app notification popup behaviour. The underlying URL snaps back to the
 * feed so the back button never lands on a no-op redirect.
 */
export default function TaskDetailRedirect() {
  const { id } = useParams();
  const { openTaskSheet } = useTaskSheet();
  const navigate = useNavigate();

  useEffect(() => {
    // ORDER MATTERS: navigate FIRST, then openTaskSheet.
    // openTaskSheet pushes a history entry with { taskSheet: id } state.
    // If navigate('/', { replace: true }) runs AFTER, it overwrites that entry
    // — the { taskSheet } state is lost, and TaskDetailSheet's route-change
    // effect sees no taskSheet state and hides the sheet immediately.
    // Navigating first ensures openTaskSheet's pushState lands on top cleanly.
    navigate('/', { replace: true });
    if (id) openTaskSheet(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return null;
}