import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Trophy, Zap, CreditCard, CircleDollarSign, Lock } from 'lucide-react';
import { format } from 'date-fns';

const typeConfig = {
  earning: { label: 'הכנסה', color: '#16a34a', bg: '#f0fdf4', icon: ArrowDownLeft, sign: '+' },
  payment: { label: 'תשלום', color: '#dc2626', bg: '#fef2f2', icon: ArrowUpRight, sign: '-' },
  withdrawal: { label: 'משיכה', color: '#d97706', bg: '#fffbeb', icon: ArrowUpRight, sign: '-' },
};

export default function Wallet() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', me?.id],
    queryFn: () => base44.entities.Transaction.filter({ user_id: me.id }, '-created_date', 50),
    enabled: !!me?.id,
  });

  const balance = me?.wallet_balance || 0;
  const escrow = me?.escrow_balance || 0;
  const totalEarned = transactions.filter(t => t.type === 'earning').reduce((s, t) => s + t.amount, 0);
  const totalSpent = transactions.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
  const taskCount = transactions.filter(t => t.type === 'earning').length;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Hero Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4, #0a52b0)',
        padding: '56px 20px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', top:-40, left:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
        <div style={{ position:'absolute', bottom:-20, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
          <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:12, width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <CreditCard size={20} color="white" />
          </div>
          <div>
            <div style={{ color:'rgba(255,255,255,0.6)', fontSize:12, fontWeight:500 }}>הארנק שלי</div>
            <div style={{ color:'white', fontSize:13, fontWeight:600 }}>{me?.full_name || 'משתמש'}</div>
          </div>
        </div>

        <div style={{ marginBottom:4 }}>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, marginBottom:4 }}>יתרה זמינה</div>
          <div style={{ color:'white', fontSize:48, fontWeight:900, letterSpacing:-2 }}>
            ₪{balance.toLocaleString()}
          </div>
          {escrow > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, background:'rgba(255,255,255,0.1)', borderRadius:10, padding:'6px 12px', width:'fit-content' }}>
              <Lock size={12} color="#fbbf24" />
              <span style={{ color:'#fbbf24', fontSize:12, fontWeight:700 }}>₪{escrow.toLocaleString()} בהחזקת ביניים (Escrow)</span>
            </div>
          )}
        </div>

        {/* Chip design element */}
        <div style={{ display:'flex', gap:3, marginTop:8, marginBottom:20 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width:28, height:4, borderRadius:2, background:'rgba(255,255,255,0.2)' }} />
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {[
            { icon: TrendingUp, label:'הכנסות', value:`₪${totalEarned.toLocaleString()}` },
            { icon: ArrowUpRight, label:'הוצאות', value:`₪${totalSpent.toLocaleString()}` },
            { icon: Trophy, label:'ג\'ובות', value:taskCount },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ background:'rgba(255,255,255,0.1)', borderRadius:14, padding:'12px 10px', backdropFilter:'blur(4px)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <Icon size={14} color="rgba(255,255,255,0.7)" style={{ marginBottom:6 }} />
              <div style={{ color:'white', fontSize:16, fontWeight:800 }}>{value}</div>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:11 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Escrow explanation */}
      <div style={{ padding:'16px 16px 0' }}>
        <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:16, padding:'14px', display:'flex', gap:10, alignItems:'flex-start' }}>
        <Lock size={16} color="#64748b" style={{ flexShrink:0, marginTop:1 }} />
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#111' }}>איך עובדים הכספים?</div>
          <div style={{ fontSize:12, color:'#666', marginTop:3, lineHeight:1.8 }}>
            <div>📤 <strong>לקוח משלם</strong> → הכסף נעול ב-Escrow</div>
            <div>✅ <strong>לאחר אישור ביצוע</strong> → הכסף מועבר לעובד כ"יתרה זמינה"</div>
            <div>🏦 <strong>משיכה</strong> → מהיתרה הזמינה לחשבון בנק</div>
          </div>
        </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding:'16px 16px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { icon: Zap, label:'משיכת כסף', desc:'לחשבון בנק' },
            { icon: CircleDollarSign, label:'טעינת יתרה', desc:'קנה מטבעות' },
          ].map(({ icon: Icon, label, desc }) => (
            <button key={label} style={{
              background:'white',
              borderRadius:16,
              padding:'14px 12px',
              border:'1px solid #e8edf2',
              cursor:'pointer',
              textAlign:'right',
              display:'flex',
              alignItems:'center',
              gap:10,
              boxShadow:'0 1px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={18} color="#1a6fd4" />
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#111' }}>{label}</div>
                <div style={{ fontSize:11, color:'#999' }}>{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div style={{ padding:'20px 16px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <h2 style={{ fontWeight:800, fontSize:16, color:'#111' }}>היסטוריית עסקאות</h2>
          <span style={{ fontSize:12, color:'#999' }}>{transactions.length} עסקאות</span>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>💳</div>
            <p style={{ color:'#666', fontWeight:600 }}>אין עסקאות עדיין</p>
            <p style={{ color:'#999', fontSize:13, marginTop:4 }}>בצע ג'ובה כדי להתחיל להרוויח</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {transactions.map(tx => {
              const cfg = typeConfig[tx.type] || typeConfig.earning;
              const Icon = cfg.icon;
              return (
                <div key={tx.id} style={{
                  background:'white',
                  borderRadius:16,
                  padding:'14px',
                  display:'flex',
                  alignItems:'center',
                  gap:12,
                  boxShadow:'0 1px 8px rgba(0,0,0,0.05)',
                  border:'1px solid #f5f5f5',
                }}>
                  <div style={{
                    width:42, height:42, borderRadius:14, background:cfg.bg,
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  }}>
                    <Icon size={18} color={cfg.color} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:'#111', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {tx.task_title || cfg.label}
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:2, alignItems:'center' }}>
                      <span style={{ fontSize:12, color:'#999' }}>{cfg.label}</span>
                      {tx.status === 'pending' && (
                        <span style={{ fontSize:11, background:'#fef3c7', color:'#d97706', padding:'1px 7px', borderRadius:20, fontWeight:600 }}>ממתין</span>
                      )}
                    </div>
                    {tx.created_date && (
                      <div style={{ fontSize:11, color:'#bbb', marginTop:2 }}>
                        {format(new Date(tx.created_date), 'dd/MM/yy HH:mm')}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize:17, fontWeight:900, color:cfg.color, flexShrink:0 }}>
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