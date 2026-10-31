/**
 * The publisher's "view applicants" control on their OWN task card — the gold
 * button that turns gold the moment the first worker applies.
 *
 * It is its own component because TWO surfaces render it: the task card (live,
 * tappable) and the first-task-published flow, which shows the publisher what
 * the button will look like when applicants arrive. One definition means the
 * illustration can never drift from the real control.
 *
 * `inert` renders exactly the same control with no handler and out of the tab
 * order, for the illustration only.
 */
export default function ApplicantsGoldButton({ count = 0, label, onClick, scanning = null, inert = false, fullWidth = false }) {
  const hasApplicants = count > 0;

  return (
    <button
      type="button"
      onClick={inert ? undefined : onClick}
      tabIndex={inert ? -1 : undefined}
      aria-hidden={inert || undefined}
      style={{
        minWidth: 110, height: 42, padding: '0 14px',
        // On the task card the button IS the action row's whole width, so it
        // lines up with the apply button every other card ends with.
        width: fullWidth ? '100%' : undefined,
        borderRadius: 'var(--r-sm)',
        background: hasApplicants
          ? 'linear-gradient(135deg,#f59e0b,var(--color-warning))'
          : 'var(--brand-primary)',
        border: 'none', color: 'white', fontSize: 12, fontWeight: 700,
        cursor: inert ? 'default' : 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 3,
        boxShadow: 'var(--shadow-sm)',
        WebkitTapHighlightColor: 'transparent',
        whiteSpace: 'nowrap',
      }}
    >
      {hasApplicants ? (
        <>
          <span>{label}</span>
          <span style={{ background: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: 900, borderRadius: 8, padding: '1px 7px' }}>
            {count}
          </span>
        </>
      ) : scanning}
    </button>
  );
}