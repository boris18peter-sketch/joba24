import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Star } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useNavigate } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/lib/LanguageContext';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['all-tasks-lb'],
    queryFn: () => base44.entities.Task.list('-created_date', 300),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['all-reviews'],
    queryFn: () => base44.entities.Review.list('-created_date', 300),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const usersMap = {};
  users.forEach(u => { usersMap[u.id] = u; });

  // Build leaderboard from completed tasks as worker
  const board = {};
  tasks.forEach(t => {
    if (t.status !== 'COMPLETED' || !t.worker_id) return;
    if (!board[t.worker_id]) {
      const userRecord = usersMap[t.worker_id];
      board[t.worker_id] = {
        user_id: t.worker_id,
        name: userRecord?.full_name || t.worker_name || t('anonymous'),
        avatar: userRecord?.full_name?.[0]?.toUpperCase() || '?',
        profile_photo: userRecord?.profile_photo || null,
        is_verified: userRecord?.is_verified || false,
        profession: userRecord?.profession || '',
        earnings: 0,
        count: 0,
        ratings: [],
      };
    }
    board[t.worker_id].earnings += t.price || 0;
    board[t.worker_id].count += 1;
  });

  reviews.forEach(r => {
    if (r.role === 'client' && board[r.reviewee_id]) {
      board[r.reviewee_id].ratings.push(r.rating);
    }
  });

  const sorted = Object.values(board)
    .map(u => ({ ...u, avg: u.ratings.length ? u.ratings.reduce((a, b) => a + b, 0) / u.ratings.length : 0 }))
    .sort((a, b) => b.count - a.count || b.earnings - a.earnings)
    .slice(0, 20);

  const medals = ['🥇', '🥈', '🥉'];
  const podiumColors = ['#1a6fd4', '#3b8fe8', '#0a52b0'];

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1)' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader title={t('leaderboard')} />

      {/* Top 3 Podium */}
      {sorted.length >= 3 && (
        <div className="px-4 pt-6 pb-2">
          <div className="rounded-3xl p-5" style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)' }}>
            <div className="text-center text-white/70 text-xs mb-4 font-semibold uppercase tracking-widest">⭐ {t('top_performers')}</div>
            <div className="flex items-end justify-center gap-3">
              {[1, 0, 2].map(i => {
                const user = sorted[i];
                if (!user) return null;
                const isFirst = i === 0;
                return (
                  <div key={user.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: isFirst ? 1.2 : 1 }}>
                    <div style={{ fontSize: 26, marginBottom: 6 }}>{medals[i]}</div>
                    <div style={{
                      width: isFirst ? 64 : 50, height: isFirst ? 64 : 50, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${podiumColors[i]}88, ${podiumColors[i]})`,
                      border: '2.5px solid rgba(255,255,255,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isFirst ? 22 : 18, fontWeight: 900, color: 'white', marginBottom: 6,
                      overflow: 'hidden', position: 'relative',
                    }}>
                      {user.profile_photo
                        ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : user.avatar}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', color: 'white', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 80, lineHeight: 1.3 }}>
                      <span style={{ wordBreak: 'break-word', textAlign: 'center' }}>{user.name}</span>
                      {user.is_verified && <VerifiedBadge size="sm" />}
                    </div>
                    {user.avg > 0 && (
                      <div style={{ fontSize: 10, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
                        {'★'.repeat(Math.round(user.avg))}<span style={{ color: '#93c5fd', marginRight: 2 }}>{user.avg.toFixed(1)}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 2 }}>{user.count} {t('tasks')}</div>
                    <div style={{
                      marginTop: 8, height: isFirst ? 72 : i === 1 ? 48 : 40, width: '100%',
                      background: `rgba(255,255,255,0.08)`,
                      borderTopLeftRadius: 8, borderTopRightRadius: 8,
                      border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
                    }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Full list */}
      <div className="px-4 py-3 space-y-2">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 animate-pulse h-16 border" style={{ borderColor: 'var(--border-1)' }} />
          ))
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 mx-auto mb-3" style={{ color: '#93c5fd' }} />
            <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{t('no_data_yet')}</p>
            <p className="text-sm mt-1" style={{ color: '#1a6fd4' }}>{t('complete_tasks_board')}</p>
          </div>
        ) : (
          sorted.map((user, idx) => (
            <div
              key={user.user_id}
              className="bg-card rounded-2xl p-4 flex items-center gap-3 shadow-sm"
              style={{ border: idx < 3 ? '1px solid #bfdbfe' : '1px solid var(--border-1)' }}
            >
              <div className="text-lg font-black w-7 text-center" style={{ color: idx < 3 ? '#1a6fd4' : '#9ca3af' }}>
                {idx < 3 ? medals[idx] : `${idx + 1}`}
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-base text-white shrink-0 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)' }}>
                {user.profile_photo
                  ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : user.avatar}
              </div>
              <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate flex items-center gap-1" style={{ color: 'var(--text-1)' }}>
                  {user.name}{user.is_verified && <VerifiedBadge size="sm" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {user.profession && <span className="text-xs" style={{ color: '#1a6fd4' }}>{user.profession}</span>}
                  <span className="text-xs text-gray-400">{user.count} {t('tasks')}</span>
                  {user.avg > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-yellow-600">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {user.avg.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-base" style={{ color: '#1a6fd4' }}>₪{user.earnings.toLocaleString()}</div>
                <div className="text-xs text-gray-400">{t('earnings')}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pb-8" />
    </div>
  );
}