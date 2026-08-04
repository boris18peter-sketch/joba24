import { Megaphone, Wrench, ShieldCheck } from 'lucide-react';

/**
 * CommunityTrustStrip — compact, attractive social-proof strip shown at the top
 * of the available-tasks feed. Reassures new users that Joba24 is a large, safe,
 * active community that helps with everything.
 */
const STATS = [
  { icon: <Megaphone size={15} />, label: 'אלפי משימות מתפרסמות', color: '#1a6fd4', bg: '#eff6ff' },
  { icon: <Wrench size={15} />, label: 'אלפי עובדים מוכנים לעזור', color: '#059669', bg: '#f0fdf4' },
  { icon: <ShieldCheck size={15} />, label: 'מאומת ובטוח', color: '#7c3aed', bg: '#f5f3ff' },
];

export default function CommunityTrustStrip() {
  return (
    <div dir="rtl" style={{
      marginTop: 14,
      background: 'linear-gradient(135deg,#f8faff,#f0fdf9)',
      border: '1px solid var(--border-1)',
      borderRadius: 16,
      padding: '12px 14px',
      boxShadow: 'var(--shadow-xs)',
    }}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }} className="trust-strip-scroll">
        <style>{`.trust-strip-scroll::-webkit-scrollbar{display:none}`}</style>
        {STATS.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: s.bg, borderRadius: 99, padding: '6px 11px',
            flexShrink: 0, border: `1px solid ${s.color}22`,
          }}>
            <span style={{ color: s.color, display: 'flex' }}>{s.icon}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border-1)',
        fontSize: 12, fontWeight: 600, color: 'var(--text-2)', lineHeight: 1.55, textAlign: 'center',
      }}>
        אנחנו כאן בשבילך בכל דבר — מפרסום משימה ועד מציאת עבודה. פורסמים חינם, מקבלים עזרה, וכולם עוברים אימות זהות 💙
      </div>
    </div>
  );
}