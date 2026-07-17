import { useNavigate } from 'react-router-dom';
import VerifiedBadge from '@/components/VerifiedBadge';
import GoldBadge from '@/components/GoldBadge';

/**
 * Unified user badge — consistent RTL order across the whole app.
 * Visual order (right → left in RTL): Avatar ➔ Name ➔ Verified ✓ ➔ Rating ★
 *
 * Props:
 *   name       — user's display name
 *   userId     — used for navigation to public profile
 *   verified   — boolean, show green verified badge
 *   gold       — boolean, show gold badge instead of green (social verified)
 *   rating     — number, show star badge if > 0
 *   dark       — boolean, white text mode (for blue banners)
 *   size       — 'sm' | 'md' (default 'sm')
 *   onClick    — optional click override
 */
export default function UserBadge({ name, userId, verified, gold, rating, dark = false, size = 'sm', onClick, photo }) {
  const navigate = useNavigate();
  if (!name) return null;

  const isMd = size === 'md';
  const avatarSize = isMd ? 30 : 24;
  const fontSize = isMd ? 13 : 11;
  const fontSizeRating = isMd ? 12 : 10;

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) { onClick(e); return; }
    if (userId) navigate(`/public-profile?id=${userId}`);
  };

  return (
    <span
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        cursor: userId ? 'pointer' : 'default',
        textDecoration: 'none',
        direction: 'rtl',
      }}
    >
      {/* Avatar — only show if photo provided */}
      {photo && (
        <img src={photo} alt="" style={{
          width: avatarSize, height: avatarSize, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
        }} />
      )}

      {/* Name */}
      <span style={{
        fontSize, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.92)' : '#64748b',
        maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {name}
      </span>

      {/* Verified badge — gold if social verified, else green */}
      {verified && (gold ? <GoldBadge size="sm" /> : <VerifiedBadge size="sm" />)}

      {/* Rating */}
      {rating > 0 && (
        <span style={{
          fontSize: fontSizeRating, fontWeight: 700,
          color: dark ? 'rgba(255,255,255,0.85)' : '#64748b',
          background: dark ? 'rgba(255,255,255,0.15)' : '#f1f5f9',
          borderRadius: 20, padding: '1px 6px',
          display: 'inline-flex', alignItems: 'center', gap: 2,
          flexShrink: 0,
        }}>
          <span style={{ color: '#f59e0b' }}>★</span> {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}