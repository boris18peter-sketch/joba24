import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { useBrand } from '@/lib/brand/BrandProvider';
import { resolveTaskBrandUrl } from '@/lib/brand/taskNavigation';

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
  const { currentBrandId } = useBrand();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      // A Task that belongs to another Brand must open on THAT Brand's domain,
      // not fail here as "Task not found". Same-Brand tasks open in place.
      const brandUrl = await resolveTaskBrandUrl(id, currentBrandId);
      if (cancelled) return;
      if (brandUrl) { window.location.href = brandUrl; return; }
      // ORDER MATTERS: navigate FIRST, then openTaskSheet.
      // openTaskSheet pushes a history entry with { taskSheet: id } state.
      // If navigate('/', { replace: true }) runs AFTER, it overwrites that entry
      // — the { taskSheet } state is lost, and TaskDetailSheet's route-change
      // effect sees no taskSheet state and hides the sheet immediately.
      navigate('/', { replace: true });
      openTaskSheet(id);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentBrandId]);

  return null;
}