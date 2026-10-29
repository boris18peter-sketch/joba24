import { ChevronRight } from 'lucide-react';

/**
 * PublishWizardHeader — the step indicator above the publish slider.
 *
 * The same three parts the Welcome flow uses, in the same order, so the two
 * sliders in the app read as one system: a back button, one pip per step with
 * the current one twice as wide, and the position written out ("2 מתוך 5") for
 * anyone who does not read a bar at a glance.
 *
 * The pips are the primary indicator: they show how much is left at any moment,
 * which a percentage of filled fields cannot. The counter is the precise answer
 * for when the pips are too small to count.
 */
export default function PublishWizardHeader({ index, total, onBack }) {
  const canBack = index > 0;

  return (
    <div
      dir="rtl"
      style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 14px 10px',
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border-1)',
      }}
    >
      <button
        type="button"
        onClick={onBack}
        disabled={!canBack}
        aria-label="לשלב הקודם"
        className="j-onb-icon"
        style={{
          opacity: canBack ? 1 : 0.35,
          cursor: canBack ? 'pointer' : 'default',
        }}
      >
        <ChevronRight size={18} />
      </button>

      <div className="j-onb-progress">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="j-onb-pip"
            style={{
              flex: i === index ? 2 : 1,
              background: i <= index ? 'var(--brand-primary)' : 'var(--border-1)',
              transition: 'flex 0.25s ease, background 0.25s ease',
            }}
          />
        ))}
      </div>

      <span style={{
        fontSize: 11.5, fontWeight: 800, color: 'var(--text-3)',
        whiteSpace: 'nowrap', minWidth: 46, textAlign: 'left',
      }}>
        {index + 1} מתוך {total}
      </span>
    </div>
  );
}