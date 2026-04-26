import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Star, ArrowRight, Leaf } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Leaderboard() {
  const navigate = useNavigate();

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
        name: userRecord?.full_name || t.worker_name || 'אנונימי',
        avatar: userRecord?.full_name?.[0]?.toUpperCase() || '?',
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
  const podiumColors = ['#16a34a', '#65a30d', '#15803d'];

  return (
    <div className="min-h-screen" style={{ background: 'hsl(120,20%,97%)' }} dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b px-4 pt-14 pb-4 flex items-center gap-3"
        style={{ background: 'rgba(240,253,244,0.97)', borderColor: '#bbf7d0', backdropFilter: 'blur(8px)' }}>
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: '#dcfce7' }}>
          <ArrowRight className="w-4 h-4 text-green-700" />
        </button>
        <div>
          <h1 className="text-xl font-black text-green-900">לוח מובילים 🏆</h1>
          <p className="text-xs text-green-600">גיבורי הסביבה שביצעו הכי הרבה משימות</p>
        </div>
      </div>

      {/* Top 3 Podium */}
      {sorted.length >= 3 && (
        <div className="px-4 pt-6 pb-2">
          <div className="rounded-3xl p-5" style={{ background: 'linear-gradient(135deg, #14532d, #166534)' }}>
            <div className="text-center text-white/70 text-xs mb-4 font-semibold uppercase tracking-widest">🌿 גיבורי החודש</div>
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
                    }}>
                      {user.avatar}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', maxWidth: 72, color: 'white' }} className="truncate">
                      {user.name}
                    </div>
                    {user.profession && (
                      <div style={{ fontSize: 10, color: '#86efac', textAlign: 'center', marginTop: 1 }}>{user.profession}</div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#4ade80', marginTop: 2 }}>₪{user.earnings.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#86efac' }}>{user.count} משימות</div>
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
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-16 border" style={{ borderColor: '#d1fae5' }} />
          ))
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <Leaf className="w-12 h-12 mx-auto text-green-300 mb-3" />
            <p className="text-green-700 font-semibold">אין נתונים עדיין</p>
            <p className="text-sm text-green-500 mt-1">בצע משימות כדי להופיע בלוח!</p>
          </div>
        ) : (
          sorted.map((user, idx) => (
            <div
              key={user.user_id}
              className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm"
              style={{ border: idx < 3 ? '1px solid #bbf7d0' : '1px solid #f0fdf4' }}
            >
              <div className="text-lg font-black w-7 text-center" style={{ color: idx < 3 ? '#16a34a' : '#9ca3af' }}>
                {idx < 3 ? medals[idx] : `${idx + 1}`}
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-base text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                {user.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate text-green-900">{user.name}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {user.profession && <span className="text-xs text-green-600">{user.profession}</span>}
                  <span className="text-xs text-gray-400">{user.count} משימות</span>
                  {user.avg > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-yellow-600">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {user.avg.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-base" style={{ color: '#16a34a' }}>₪{user.earnings.toLocaleString()}</div>
                <div className="text-xs text-gray-400">הכנסות</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pb-8" />
    </div>
  );
}