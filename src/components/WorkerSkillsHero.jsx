/**
 * WorkerSkillsHero — Prominent skills display for worker profile
 * Shows the worker's preferred categories as visually distinct skill cards
 */
import { getCategoryIcon } from '@/lib/categoryIcons';

export default function WorkerSkillsHero({ categories = [] }) {
  if (!categories.length) return null;

  return (
    <div style={{
      background: 'var(--surface-2)',
      borderRadius: 22,
      border: '1px solid var(--border-1)',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(15,40,107,0.06)',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 20px 10px',
        background: 'linear-gradient(135deg, #f8faff, #f0f7ff)',
        borderBottom: '1px solid var(--border-1)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.2 }}>
            תחומי מומחיות
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1, fontWeight: 600 }}>
            {categories.length} תחומים בהם העובד מתמחה
          </div>
        </div>
      </div>

      {/* Skills grid */}
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {categories.map(cat => {
          const icon = getCategoryIcon(cat);
          return (
            <div key={cat} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px',
              borderRadius: 14,
              background: icon.bg,
              border: `1px solid ${icon.border}`,
              transition: 'transform 0.15s ease',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11,
                background: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 19, flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}>
                {icon.emoji}
              </div>
              <span style={{
                fontSize: 13, fontWeight: 800, color: icon.color,
                lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {cat === 'plumbing' ? 'אינסטלציה' :
                 cat === 'electricity' ? 'חשמלאות' :
                 cat === 'handyman' ? 'הנדימן' :
                 cat === 'cleaning' ? 'ניקיון' :
                 cat === 'moving' ? 'הובלה' :
                 cat === 'heavy_lifting' ? 'עזרה פיזית' :
                 cat === 'painting' ? 'צביעה' :
                 cat === 'carpentry' ? 'נגרות' :
                 cat === 'ac' ? 'מזגנים' :
                 cat === 'locksmith' ? 'מנעולן' :
                 cat === 'gardening' ? 'גינון' :
                 cat === 'home_maintenance' ? 'תחזוקת בית' :
                 cat === 'transportation' ? 'הסעות' :
                 cat === 'delivery' ? 'משלוח' :
                 cat === 'shopping' ? 'קניות' :
                 cat === 'pets' ? 'בעלי חיים' :
                 cat === 'babysitting' ? 'בייביסיטר' :
                 cat === 'elderly_care' ? 'סיוע לקשישים' :
                 cat === 'tutoring' ? 'שיעורים פרטיים' :
                 cat === 'fitness' ? 'כושר וספורט' :
                 cat === 'photography' ? 'צילום ותוכן' :
                 cat === 'events' ? 'אירועים' :
                 cat === 'personal_help' ? 'עזרה אישית' :
                 cat === 'it_support' ? 'מחשבים' :
                 'אחר'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}