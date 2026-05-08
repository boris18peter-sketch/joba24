/**
 * VerifiedBadge — מוצג ליד שם משתמש מאומת
 * Props:
 *   size: 'sm' | 'md' (default 'sm')
 */
export default function VerifiedBadge({ size = 'sm' }) {
  const dim = size === 'md' ? 20 : 15;
  const font = size === 'md' ? 10 : 8;
  return (
    <span title="משתמש מאומת" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: dim, height: dim, borderRadius: '50%',
      background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
      flexShrink: 0,
    }}>
      <svg width={dim * 0.58} height={dim * 0.58} viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}