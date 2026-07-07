/**
 * VerifiedBadge — מוצג ליד שם משתמש מאומת
 * Props:
 *   level: 'gold' | 'green' (default 'green')
 *   size: 'sm' | 'md' (default 'sm')
 *
 * Gold  = KYC verified (אימות זהות)
 * Green = Profile complete (ביו + קטגוריות + מדיה + רשת חברתית)
 */
export default function VerifiedBadge({ level = 'green', size = 'sm' }) {
  const dim = size === 'md' ? 20 : 15;

  const isGold = level === 'gold';
  const bg = isGold
    ? 'linear-gradient(135deg,#fbbf24,#d97706)'
    : 'linear-gradient(135deg,#16a34a,#059669)';
  const title = isGold ? 'מאומר (KYC ✓)' : 'פרופיל מלא ✓';

  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: dim, height: dim, borderRadius: '50%',
      background: bg,
      flexShrink: 0,
      boxShadow: isGold ? '0 1px 4px rgba(217,119,6,0.35)' : '0 1px 4px rgba(22,163,74,0.2)',
    }}>
      <svg width={dim * 0.58} height={dim * 0.58} viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}