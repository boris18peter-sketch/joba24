/**
 * BrandTabButton — the tab pill used across the Brand dashboard.
 *
 * Deliberately identical to the platform Admin dashboard's tab button so both
 * dashboards read as one product.
 */
export default function BrandTabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: 13,
        background: active ? '#0f2b6b' : 'var(--surface-2)',
        color: active ? 'white' : 'var(--text-2)',
        border: active ? 'none' : '1px solid var(--border-1)',
        cursor: 'pointer', flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}