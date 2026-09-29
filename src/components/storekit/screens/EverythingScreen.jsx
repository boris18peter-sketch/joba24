import AppTopBar from '@/components/storekit/AppTopBar';
import { CATEGORIES } from '@/lib/categories';

/**
 * FRAME 08 — "כל משימה. מישהו כבר בדרך."
 * The full breadth of Joba24 — every category that actually exists in the app's
 * own category list, rendered as the app's category tiles.
 */
export default function EverythingScreen() {
  return (
    <>
      <AppTopBar />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--surface-1)', padding: '12px 12px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-1)', marginBottom: 3 }}>
          מה צריך לעשות היום?
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600, marginBottom: 11 }}>
          {CATEGORIES.length} קטגוריות פתוחות באזור שלכם
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
          {CATEGORIES.map(cat => {
            const [emoji, ...rest] = cat.label.split(' ');
            return (
              <div
                key={cat.value}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-1)',
                  borderRadius: 13,
                  padding: '10px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  minHeight: 62,
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 19, lineHeight: 1 }}>{emoji}</span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: 'var(--text-2)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {rest.join(' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}