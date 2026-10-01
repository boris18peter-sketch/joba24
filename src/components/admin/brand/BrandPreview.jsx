import { themeToCssVars } from '@/lib/brand/themeTokens';

/**
 * BrandPreview — a live, representative preview of a Brand's design tokens.
 *
 * The tokens are applied as CSS variables on a SCOPED wrapper, so the preview
 * is genuinely rendered by the same variable contract the real components use:
 * what you see here is what the Brand's surface will look like. Nothing is
 * mocked with hardcoded colours.
 */

export default function BrandPreview({ theme, logoUrl, displayName, compact }) {
  const vars = themeToCssVars(theme);
  const v = (name, fallback) => `var(${name}, ${fallback})`;

  const card = {
    background: v('--brand-card-bg', '#ffffff'),
    border: `1px solid ${v('--brand-card-border', '#e4eaf5')}`,
    borderRadius: v('--brand-card-radius', '18px'),
    boxShadow: v('--brand-card-shadow', '0 1px 3px rgba(15,40,107,.06)'),
    padding: 12,
  };
  const btn = (kind) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    height: 42, padding: '0 18px', fontWeight: 800, fontSize: 13,
    borderRadius: v('--brand-btn-radius', '14px'), border: 'none', cursor: 'pointer',
    ...(kind === 'primary'
      ? { background: `linear-gradient(135deg, ${v('--brand-btn-primary-bg', '#1a6fd4')}, ${v('--brand-primary-dark', '#0a52b0')})`, color: v('--brand-btn-primary-text', '#fff') }
      : { background: v('--brand-btn-secondary-bg', '#eef3fc'), color: v('--brand-btn-secondary-text', '#4b6083'), border: `1px solid ${v('--border-1', '#e4eaf5')}` }),
  });
  const input = {
    width: '100%', height: 42, padding: '0 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    borderRadius: v('--brand-input-radius', '14px'),
    border: `1.5px solid ${v('--brand-input-border', '#e4eaf5')}`,
    background: v('--brand-input-bg', '#f2f5fb'),
    color: v('--text-1', '#0d1e40'),
  };

  return (
    <div style={{
      ...vars,
      background: v('--surface-1', '#f2f5fb'),
      border: `1px solid ${v('--border-1', '#e4eaf5')}`,
      borderRadius: 16, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: v('--brand-header-bg', 'rgba(248,250,254,.96)'),
        borderBottom: `1px solid ${v('--border-1', '#e4eaf5')}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          {logoUrl
            ? <img src={logoUrl} alt="" style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }} />
            : <div style={{ width: 30, height: 30, borderRadius: 8, background: v('--brand-primary', '#1a6fd4'), flexShrink: 0 }} />}
          <span style={{
            fontWeight: 900, fontSize: 16, letterSpacing: -0.5,
            color: v('--brand-header-text', '#0d1e40'),
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {displayName || 'Brand'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: v('--brand-header-active', '#1a6fd4') }}>בית</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: v('--brand-header-text', '#0d1e40'), opacity: 0.55 }}>משימות</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: v('--brand-header-text', '#0d1e40'), opacity: 0.55 }}>שלי</span>
        </div>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Banner */}
        <div style={{
          background: v('--brand-banner-bg', '#0f2b6b'),
          color: v('--brand-banner-text', '#ffffff'),
          borderRadius: v('--brand-card-radius', '18px'),
          padding: '13px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 900 }}>פרסם משימה בחינם</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>מצא עובד באזור שלך</div>
          </div>
          <span style={{
            background: v('--brand-banner-accent', '#fbbf24'), color: '#1a3a6b',
            fontWeight: 900, fontSize: 11, padding: '7px 12px', borderRadius: 10, whiteSpace: 'nowrap',
          }}>
            פרסם
          </span>
        </div>

        {/* Task card */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{
              background: v('--brand-primary-light', '#eff6ff'),
              color: v('--brand-primary', '#1a6fd4'),
              fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
            }}>ניקיון</span>
            <span style={{ fontSize: 10, color: v('--text-2', '#4b6083') }}>תל אביב · 2.1 ק״מ</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: v('--text-1', '#0d1e40') }}>
            ניקיון דירה 3 חדרים
          </div>
          <div style={{ fontSize: 12, color: v('--text-2', '#4b6083'), marginTop: 3, lineHeight: 1.5 }}>
            ניקיון יסודי כולל מטבח וחדרי אמבטיה.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
            <span style={{ fontSize: 17, fontWeight: 900, color: v('--brand-primary', '#1a6fd4') }}>₪250</span>
            <span style={{ fontSize: 11, color: v('--text-2', '#4b6083') }}>היום · 14:00</span>
          </div>
        </div>

        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: v('--text-2', '#4b6083') }}>תיאור המשימה</span>
          <input readOnly value="לדוגמה: ניקיון דירה" style={input} />
          <span style={{ fontSize: 10, color: v('--brand-input-focus', '#1a6fd4') }}>
            ● צבע המיקוד של השדה
          </span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btn('primary')}>פרסם משימה</button>
          <button style={btn('secondary')}>ביטול</button>
        </div>

        {/* Popup */}
        {!compact && (
          <div style={{
            background: v('--overlay-bg', 'rgba(5,15,40,.6)'),
            borderRadius: 14, padding: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              background: v('--brand-modal-bg', '#ffffff'),
              borderRadius: v('--brand-modal-radius', '28px'),
              padding: 16, width: '100%', maxWidth: 300,
              boxShadow: '0 16px 56px rgba(15,40,107,.25)',
            }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: v('--text-1', '#0d1e40') }}>
                אישור הגשה
              </div>
              <div style={{ fontSize: 12, color: v('--text-2', '#4b6083'), marginTop: 4, lineHeight: 1.55 }}>
                חלון זה מציג את ערכת המותג — רקע, רדיוס וכפתורים.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={{ ...btn('primary'), flex: 1 }}>אישור</button>
                <button style={{ ...btn('secondary'), flex: 1 }}>סגור</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}