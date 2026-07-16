/**
 * GoldBadge — מוצג ליד שם משתמש שחיבר רשת חברתית וגם עבר אימות KYC.
 * אם המשתמש לא עבר אימות KYC — לא מקבל שום ווי.
 * Props:
 *   size: 'sm' | 'md' (default 'sm')
 */
export default function GoldBadge({ size = 'sm' }) {
  const dim = size === 'md' ? 20 : 15;
  return (
    <span title="רשת חברתית מאומתת" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: dim, height: dim, borderRadius: '50%',
      background: 'linear-gradient(135deg,#fbbf24,#d97706)',
      flexShrink: 0,
      boxShadow: '0 1px 3px rgba(217,119,6,0.3)',
    }}>
      <svg width={dim * 0.58} height={dim * 0.58} viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}