import ProfileSheet from './ProfileSheet';

/**
 * TaxonomySheet — the shared detail view for Skills and Activity Areas.
 *
 * Both are plain lists of the same shape, so they share one component instead
 * of two near-identical ones. The chips live here, not on the main Profile page.
 */
export default function TaxonomySheet({ title, subtitle, items = [], renderLabel, emptyText, onClose }) {
  return (
    <ProfileSheet title={title} subtitle={subtitle} onClose={onClose}>
      {items.length === 0 ? (
        <div style={{ padding: '26px 0', textAlign: 'center', fontSize: 14, color: 'var(--text-3)' }}>
          {emptyText}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 8 }}>
          {items.map((key) => (
            <span
              key={key}
              style={{
                fontSize: 14, fontWeight: 600,
                color: 'var(--brand-primary)',
                background: 'rgba(26,111,212,0.07)',
                padding: '8px 14px', borderRadius: 99,
              }}
            >
              {renderLabel(key)}
            </span>
          ))}
        </div>
      )}
    </ProfileSheet>
  );
}