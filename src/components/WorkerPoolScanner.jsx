import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const CATEGORY_EMOJI = {
  plumbing: '🔧', electricity: '⚡', gardening: '🌿', cleaning: '🧹',
  moving: '🚚', painting: '🎨', carpentry: '🪚', ac: '❄️',
  locksmith: '🔐', shopping: '🛍️', delivery: '📦', babysitting: '👶',
  tutoring: '📚', it_support: '💻', other: '👷'
};

const CATEGORY_NAME_PLURAL = {
  plumbing: 'אינסטלטורים', electricity: 'חשמלאים', gardening: 'גנניםׁ',
  cleaning: 'מנקים', moving: 'עוזרי הובלה', painting: 'צבעים',
  carpentry: 'נגרים', ac: 'טכנאי מזגנים', locksmith: 'מנעולנים',
  shopping: 'שליחים', delivery: 'שליחים', babysitting: 'מטפלים',
  tutoring: 'מורים פרטיים', it_support: 'תומכי IT', other: 'עובדים'
};

// Professional = city-wide. Others = nearby/local
const PROFESSIONAL_CATS = new Set(['plumbing', 'electricity', 'carpentry', 'painting', 'ac', 'locksmith', 'it_support', 'babysitting', 'tutoring']);

function useWorkerCount(category, city) {
  const { data: allUsers = [] } = useQuery({
    queryKey: ['workerPool'],
    queryFn: () => base44.entities.User.list('-last_active_at', 500),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (!category || !city || !allUsers.length) return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const cityNorm = city.split(',')[0].trim().toLowerCase();

  const count = allUsers.filter(u => {
    if (!u.preferred_categories?.length) return false;
    if (!u.preferred_categories.includes(category)) return false;
    const activeAt = u.last_active_at ? new Date(u.last_active_at) : null;
    if (!activeAt || activeAt < sevenDaysAgo) return false;
    const uCity = (u.city || '').toLowerCase();
    const uCities = (u.preferred_cities || []).map(c => c.toLowerCase());
    return uCity.includes(cityNorm) || cityNorm.includes(uCity) ||
      uCities.some(c => c.includes(cityNorm) || cityNorm.includes(c));
  }).length;

  return count;
}

// ── Full banner variant — for CreateTask ─────────────────────────────────────
export function WorkerPoolBanner({ category, city }) {
  const count = useWorkerCount(category, city);
  if (!count) return null;

  const emoji = CATEGORY_EMOJI[category] || '👷';
  const name = CATEGORY_NAME_PLURAL[category] || 'עובדים';
  const isPro = PROFESSIONAL_CATS.has(category);
  const cityShort = city.split(',')[0].trim();
  const locationLabel = isPro ? `ב${cityShort}` : `ליד ${cityShort}`;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
      border: '1.5px solid #86efac',
      borderRadius: 16, padding: '14px 16px',
      display: 'flex', gap: 12, alignItems: 'center',
      animation: 'scannerPulse 2.5s ease-in-out infinite',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #16a34a, #15803d)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
        boxShadow: '0 0 0 4px rgba(22,163,74,0.15)',
      }}>
        {emoji}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#14532d', lineHeight: 1.3, marginBottom: 2 }}>
          {count} {name} פעילים {locationLabel}
        </div>
        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'liveDot 1.3s ease-in-out infinite' }} />
          זמינים לקבל את המשימה שלך
        </div>
      </div>
    </div>
  );
}

// ── Compact inline variant — for MyTasks / HomeFeed ──────────────────────────
export function WorkerPoolPill({ category, city }) {
  const count = useWorkerCount(category, city);
  if (!count) return null;

  const emoji = CATEGORY_EMOJI[category] || '👷';
  const name = CATEGORY_NAME_PLURAL[category] || 'עובדים';
  const cityShort = (city || '').split(',')[0].trim();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      background: '#f0fdf4', border: '1px solid #bbf7d0',
      borderRadius: 12, padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#15803d' }}>
        <span style={{ fontSize: 14 }}>{emoji}</span>
        {count} {name} רלוונטיים זמינים באזור {cityShort}
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', flexShrink: 0, animation: 'liveDot 1.3s ease-in-out infinite' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
          📡 המשימה נחשפת לעובדים תואמים
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
          ⚡ השוק פעיל ומחפש
        </div>
      </div>
    </div>
  );
}

// ── Category-only hint — shown right after category selection ────────────────
export function CategoryWorkerHint({ category }) {
  const { data: allUsers = [] } = useQuery({
    queryKey: ['workerPool'],
    queryFn: () => base44.entities.User.list('-last_active_at', 500),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (!category || !allUsers.length) return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const count = allUsers.filter(u =>
    u.preferred_categories?.includes(category) &&
    u.last_active_at &&
    new Date(u.last_active_at) >= sevenDaysAgo
  ).length;

  if (!count) return null;

  const emoji = CATEGORY_EMOJI[category] || '👷';
  const name = CATEGORY_NAME_PLURAL[category] || 'עובדים';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: '#f0fdf4', border: '1px solid #bbf7d0',
      borderRadius: 10, padding: '8px 12px', marginTop: 10,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', flexShrink: 0, animation: 'liveDot 1.3s ease-in-out infinite', display: 'inline-block' }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
        הערכה: {count} {name} יכולים להגיש בקשה {emoji}
      </span>
    </div>
  );
}

export default WorkerPoolBanner;