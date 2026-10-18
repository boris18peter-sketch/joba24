import { useEffect, useState } from 'react';
import { getCurrentPosition } from '@/lib/nativeGeolocation';
import { Navigation, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import TaskTakenConfetti from '@/components/TaskTakenConfetti';
import BottomSheet from '@/components/BottomSheet';
import { useLanguage } from '@/lib/LanguageContext';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import { scheduleWindows, isExecutionActive, nextOccurrence, formatOccurrence } from '@/lib/scheduling';

/**
 * ApprovedPopup — the celebration shown the moment a worker is selected.
 *
 * It is a CELEBRATION first: being picked is good news and is announced whether
 * or not the job is due yet. What it must never do is quietly start the job.
 *
 * A scheduled job unlocks execution only inside the activation window — the same
 * rule the Active Task banner follows. So the "יצא לדרך" CTA is offered ONLY when
 * that window is open; a job scheduled for tomorrow congratulates the worker and
 * shows the agreed slot instead, leaving the status untouched until it is due.
 */
export default function ApprovedPopup({ task, onClose }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { openTaskSheet } = useTaskSheet();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { settings } = useJobaSettings();
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);

  // May this job actually be started right now? A task with no schedule always
  // may; a scheduled one only once its activation window has opened.
  const windows = scheduleWindows(settings);
  const canDepart = isExecutionActive(task, Date.now(), windows);
  const upcoming = nextOccurrence(task);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(s => {
        if (s <= 1) { clearInterval(interval); onClose(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStartWork = async () => {
    // Guard the celebration from ever becoming an early start — the CTA is
    // hidden in this case, and this is the belt-and-braces behind it.
    if (!canDepart) { onClose(); return; }
    setLoading(true);
    const update = { status: 'TAKEN', worker_status: 'on_the_way', worker_id: me?.id, worker_name: me?.full_name, on_the_way_at: new Date().toISOString() };
    if (navigator.geolocation) {
      await new Promise((resolve) => {
        getCurrentPosition(
          (pos) => { update.worker_lat = pos.coords.latitude; update.worker_lng = pos.coords.longitude; resolve(); },
          () => resolve(), { timeout: 3000 }
        );
      });
    }
    await base44.entities.Task.update(task.id, update);
    await queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    await queryClient.refetchQueries({ queryKey: ['task', task.id] });
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
    setLoading(false);
    onClose();
    openTaskSheet(task.id);
  };

  const progress = (timeLeft / 20) * 100;

  return (
    <>
      <TaskTakenConfetti trigger={true} />
      <BottomSheet onClose={onClose} showCloseBtn={false}>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--surface-3)', position: 'absolute', top: 0, left: 0, right: 0 }}>
          <div style={{
            height: '100%', background: 'linear-gradient(90deg,#059669,var(--brand-modal-cta-bg, var(--brand-primary)))',
            width: `${progress}%`, transition: 'width 1s linear', borderRadius: 2,
          }} />
        </div>

        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '18px auto 0' }} />

        {/* Green header */}
        <div style={{
          background: 'linear-gradient(135deg,#059669,#047857)',
          padding: '20px 24px', textAlign: 'center', margin: '16px 20px 0',
          borderRadius: 'var(--r-lg)',
        }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginBottom: 4 }}>{t('approved_popup_title')}</div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{t('approved_popup_sub')}</div>
        </div>

        {/* Details */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{
            background: 'var(--color-success-bg)', border: `1.5px solid var(--color-success-border)`,
            borderRadius: 'var(--r-md)', padding: 16, marginBottom: 16,
          }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#065f46', marginBottom: 8 }}>{task?.title}</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-success)' }}>₪{task?.price}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('payment_label')}</div>
              </div>
              {task?.location_name && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>📍 {task.location_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('location')}</div>
                </div>
              )}
            </div>
          </div>

          {canDepart ? (
            <button
              onClick={handleStartWork}
              disabled={loading}
              style={{
                width: '100%', height: 56, borderRadius: 'var(--r-md)',
                background: loading ? '#6ee7b7' : 'linear-gradient(135deg,#059669,#047857)',
                color: 'white', fontWeight: 900, fontSize: 16, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 8px 28px rgba(5,150,105,0.4)', marginBottom: 10,
              }}
            >
              {loading ? t('starting_moment') : <><Navigation size={18} /> {t('lets_go')}</>}
            </button>
          ) : (
            /* The job is scheduled ahead — it cannot be started yet, so the popup
               only tells the worker WHEN it starts and sends them to the task. */
            <div style={{
              background: 'var(--brand-primary-light)', border: '1.5px solid var(--border-2)',
              borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: 'var(--surface-2)', border: '1px solid var(--border-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Clock size={18} color="var(--brand-primary)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>{t('td_service_slots')}</div>
                <div style={{ fontSize: 14.5, fontWeight: 900, color: 'var(--brand-primary)' }}>
                  {upcoming ? formatOccurrence(upcoming) : ''}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => { onClose(); if (task?.id) openTaskSheet(task.id); }}
            style={{
              width: '100%', height: 48, borderRadius: 'var(--r-md)',
              background: 'transparent', border: '1px solid var(--border-1)',
              color: 'var(--text-3)', fontSize: 13, cursor: 'pointer',
            }}
          >
            {t('view_later')} ({timeLeft}s)
          </button>
        </div>
      </BottomSheet>
    </>
  );
}