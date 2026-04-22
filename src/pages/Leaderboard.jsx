import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Star, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Leaderboard() {
  const navigate = useNavigate();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 200),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['all-reviews'],
    queryFn: () => base44.entities.Review.list('-created_date', 200),
  });

  // Build leaderboard from transactions
  const board = {};
  transactions.forEach(tx => {
    if (tx.type !== 'earning') return;
    if (!board[tx.user_id]) {
      board[tx.user_id] = { user_id: tx.user_id, name: tx.user_name || 'אנונימי', earnings: 0, count: 0, ratings: [] };
    }
    board[tx.user_id].earnings += tx.amount || 0;
    board[tx.user_id].count += 1;
  });

  reviews.forEach(r => {
    if (board[r.reviewee_id]) {
      board[r.reviewee_id].ratings.push(r.rating);
    }
  });

  const sorted = Object.values(board)
    .map(u => ({ ...u, avg: u.ratings.length ? u.ratings.reduce((a, b) => a + b, 0) / u.ratings.length : 0 }))
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 20);

  const medals = ['🥇', '🥈', '🥉'];
  const podiumColors = ['#f59e0b', '#94a3b8', '#cd7c32'];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-black">לוח מובילים 🏆</h1>
          <p className="text-xs text-muted-foreground">מי הרוויח הכי הרבה</p>
        </div>
      </div>

      {/* Top 3 Podium */}
      {sorted.length >= 3 && (
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-end justify-center gap-3">
            {[1, 0, 2].map(i => {
              const user = sorted[i];
              if (!user) return null;
              const isFirst = i === 0;
              return (
                <div
                  key={user.user_id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: isFirst ? 1.2 : 1,
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{medals[i]}</div>
                  <div
                    style={{
                      width: isFirst ? 64 : 52,
                      height: isFirst ? 64 : 52,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${podiumColors[i]}33, ${podiumColors[i]}88)`,
                      border: `2px solid ${podiumColors[i]}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isFirst ? 22 : 18,
                      fontWeight: 900,
                      color: '#333',
                      marginBottom: 6,
                    }}
                  >
                    {user.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', maxWidth: 80 }} className="truncate">{user.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#16a34a', marginTop: 2 }}>₪{user.earnings.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{user.count} משימות</div>
                  <div
                    style={{
                      marginTop: 6,
                      height: isFirst ? 80 : i === 1 ? 56 : 48,
                      width: '100%',
                      background: `linear-gradient(to top, ${podiumColors[i]}44, ${podiumColors[i]}22)`,
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                      border: `1px solid ${podiumColors[i]}44`,
                      borderBottom: 'none',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full list */}
      <div className="px-4 py-3 space-y-2">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-16 border border-gray-100" />
          ))
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-muted-foreground">אין נתונים עדיין</p>
            <p className="text-sm text-muted-foreground mt-1">בצע משימות כדי להופיע בלוח</p>
          </div>
        ) : (
          sorted.map((user, idx) => (
            <div
              key={user.user_id}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm"
            >
              <div className="text-lg font-black w-6 text-center text-muted-foreground">
                {idx < 3 ? medals[idx] : `${idx + 1}`}
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-black text-base text-gray-600 shrink-0">
                {user.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{user.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{user.count} משימות</span>
                  {user.avg > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-yellow-600">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {user.avg.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-green-600 text-base">₪{user.earnings.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">הכנסות</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}