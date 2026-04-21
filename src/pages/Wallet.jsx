import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowDownLeft, ArrowUpRight, Clock, TrendingUp, Wallet as WalletIcon } from 'lucide-react';
import { format } from 'date-fns';

const typeConfig = {
  earning: { label: 'הכנסה', color: 'text-green-600', bg: 'bg-green-100', icon: ArrowDownLeft, sign: '+' },
  payment: { label: 'תשלום', color: 'text-red-600', bg: 'bg-red-100', icon: ArrowUpRight, sign: '-' },
  withdrawal: { label: 'משיכה', color: 'text-orange-600', bg: 'bg-orange-100', icon: ArrowUpRight, sign: '-' },
};

export default function Wallet() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', me?.id],
    queryFn: () => base44.entities.Transaction.filter({ user_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
  });

  const balance = me?.wallet_balance || 0;
  const totalEarned = transactions.filter(t => t.type === 'earning').reduce((s, t) => s + t.amount, 0);
  const pending = transactions.filter(t => t.status === 'pending');

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Balance Hero */}
      <div className="bg-black text-white px-4 pt-14 pb-8">
        <div className="flex items-center gap-2 mb-6 opacity-80">
          <WalletIcon className="w-5 h-5" />
          <h1 className="text-lg font-bold">הארנק שלי</h1>
        </div>
        <div className="text-5xl font-bold mb-1">₪{balance.toLocaleString()}</div>
        <div className="text-sm opacity-70">יתרה זמינה</div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-white/15 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 opacity-70" />
              <span className="text-xs opacity-70">סה"כ הכנסות</span>
            </div>
            <div className="text-xl font-bold">₪{totalEarned.toLocaleString()}</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-4 h-4 opacity-70" />
              <span className="text-xs opacity-70">ממתין</span>
            </div>
            <div className="text-xl font-bold">{pending.length}</div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="px-4 py-5">
        <h2 className="font-bold text-base mb-3">היסטוריית עסקאות</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">💳</div>
            <p className="text-muted-foreground">אין עסקאות עדיין</p>
            <p className="text-sm text-muted-foreground mt-1">בצע משימה כדי להתחיל להרוויח</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
              const cfg = typeConfig[tx.type] || typeConfig.earning;
              const Icon = cfg.icon;
              return (
                <div key={tx.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{tx.task_title || cfg.label}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{cfg.label}</span>
                      {tx.status === 'pending' && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">ממתין</span>
                      )}
                    </div>
                    {tx.created_date && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(tx.created_date), 'dd/MM/yyyy HH:mm')}
                      </div>
                    )}
                  </div>
                  <div className={`text-base font-bold ${cfg.color}`}>
                    {cfg.sign}₪{tx.amount}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}