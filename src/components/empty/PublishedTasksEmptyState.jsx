import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import BenefitsBanner from '@/components/empty/BenefitsBanner';

/**
 * The empty state of My Published Tasks › Active — and ONLY that.
 *
 * ── TWO THINGS, SPREAD OVER THE SCREEN ───────────────────────────────────
 * The hero banner carries the whole message, and the publish button is the one
 * action the screen exists for. The category rail and the explainer video were
 * removed: with them the screen stacked four blocks in the top half and left
 * the bottom empty. What is left is centred in the space it is given, so the
 * banner and the button read as one composition instead of a column that
 * stops halfway down the screen.
 */
export default function PublishedTasksEmptyState() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const publish = () => {
    try { navigator.vibrate?.(12); } catch {}
    navigate('/create-task');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 26,
        /* Fills the room the two removed sections left behind. A floor, not a
           fixed height: on a short screen the composition simply starts higher
           and the page keeps scrolling as it always did. */
        minHeight: 'min(58vh, 520px)',
        paddingTop: 8,
        paddingBottom: 16,
      }}
    >
      {/* 1. The hero — message and illustration in one compact banner */}
      <BenefitsBanner />

      {/* 2. The one action this screen exists for, under the banner */}
      <button
        type="button"
        onClick={publish}
        style={{
          width: '100%', height: 52, borderRadius: 15, border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          background: 'linear-gradient(135deg, var(--brand-btn-primary-bg, var(--brand-primary)), var(--brand-btn-primary-bg, var(--brand-primary-dark)))',
          color: 'var(--brand-btn-primary-text, #ffffff)',
          fontSize: 16, fontWeight: 900, cursor: 'pointer',
          boxShadow: '0 8px 20px rgba(26,111,212,0.26)',
          fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Plus size={18} strokeWidth={2.8} />
        {t('post_task_btn')}
      </button>

    </div>
  );
}