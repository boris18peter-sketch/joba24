import { useNavigate } from 'react-router-dom';
import { Search, Clock } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * TaskUnavailablePopup — what the task screen shows when there is no task to show.
 *
 * ── THE CASE IT EXISTS FOR ─────────────────────────────────────────────────
 * A worker gets a push about a new task and taps it a minute later, after someone
 * else has taken it. The sheet opened onto nothing: the task is no longer his to
 * see, so the screen was a bare rectangle with a line of grey text. That reads as
 * a broken app rather than as an answer, and the person is left with no way
 * forward from it.
 *
 * This is the same answer the app gives everywhere else — a card in the app's own
 * language, with the reason and one thing to do next: go and look at the tasks
 * that ARE available.
 *
 * ── TWO WAYS IN, ONE CARD ──────────────────────────────────────────────────
 *  • `taken`   — the task exists but belongs to another worker now.
 *  • `missing` — the task cannot be read at all (deleted, expired, another Brand).
 */
export default function TaskUnavailablePopup({ kind = 'missing' }) {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const taken = kind === 'taken';

  const close = () => window.dispatchEvent(new CustomEvent('close_task_sheet'));
  const goToFeed = () => {
    close();
    navigate('/');
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        padding: '34px 22px 26px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', gap: 12,
      }}
    >
      <div style={{
        width: 60, height: 60, borderRadius: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--brand-primary-light)', border: '1px solid var(--border-2)',
        color: 'var(--brand-primary)',
      }}>
        {taken ? <Clock size={26} strokeWidth={2.1} /> : <Search size={26} strokeWidth={2.1} />}
      </div>

      <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.3 }}>
        {t(taken ? 'task_taken_popup_title' : 'task_unavailable_popup_title')}
      </div>
      <div style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 320 }}>
        {t(taken ? 'task_taken_popup_body' : 'task_unavailable_popup_body')}
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
        <button
          type="button"
          onClick={goToFeed}
          className="j-btn j-btn-primary"
          style={{ width: '100%', height: 52, fontSize: 16, fontWeight: 900 }}
        >
          <Search size={18} strokeWidth={2.4} />
          {t('find_other_tasks_btn')}
        </button>
        <button
          type="button"
          onClick={close}
          className="j-btn j-btn-ghost"
          style={{ width: '100%', height: 46, fontSize: 14.5, fontWeight: 800 }}
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
}