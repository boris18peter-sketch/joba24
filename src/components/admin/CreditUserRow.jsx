import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Wallet, Lock, ShoppingCart, TrendingDown, Gift } from 'lucide-react';
import CopyableId from '@/components/CopyableId';

const METHOD = {
  apple: { label: 'Apple IAP', bg: '#e2e8f0', color: '#0f172a' },
  card: { label: 'כרטיס אשראי', bg: '#dbeafe', color: '#1d4ed8' },
  none: { label: 'לא רכש', bg: '#f1f5f9', color: '#64748b' },
};

function Num({ icon: Icon, value, label, color }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13, fontWeight: 900, color }}>
        <Icon size={12} /> {value}
      </span>
      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)' }}>{label}</span>
    </div>
  );
}

function Detail({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '6px 10px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: color || 'var(--text-1)' }}>{value}</div>
    </div>
  );
}

export default function CreditUserRow({ row }) {
  const [open, setOpen] = useState(false);
  const { user, available, locked, total, purchasedTotal, purchaseCount, spentTotal, earnedTotal, lastPurchase, method } = row;
  const m = METHOD[method] || METHOD.none;

  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 14, marginBottom: 8, overflow: 'hidden' }}>
      <div onClick={() => setOpen((v) => !v)} style={{ padding: '11px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
          background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13,
        }}>
          {user.profile_photo
            ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : user.full_name?.[0] || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.full_name || 'ללא שם'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, background: m.bg, color: m.color, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
          {m.label}
        </span>
        {open ? <ChevronUp size={14} color="var(--text-3)" /> : <ChevronDown size={14} color="var(--text-3)" />}
      </div>

      <div style={{ padding: '0 14px 10px' }}>
        <div style={{ display: 'flex', gap: 4, padding: '8px 10px', background: 'var(--surface-3)', borderRadius: 10 }}>
          <Num icon={Wallet} value={available} label="זמין" color="#16a34a" />
          <Num icon={Lock} value={locked} label="נעול" color="#d97706" />
          <Num icon={ShoppingCart} value={purchasedTotal} label="נרכש" color="#1a6fd4" />
          <Num icon={TrendingDown} value={spentTotal} label="נוצל" color="#dc2626" />
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border-1)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Detail label="סה״כ ג'ובות (זמין + נעול)" value={total} color="#0f2b6b" />
            <Detail label="מספר רכישות" value={purchaseCount} />
            <Detail label="בונוסים שהתקבלו" value={earnedTotal} color="#16a34a" />
            <Detail label="אופן רכישה" value={m.label} />
            <Detail
              label="רכישה אחרונה"
              value={lastPurchase ? format(new Date(lastPurchase), 'dd/MM/yyyy HH:mm') : '—'}
            />
            <Detail
              label="נרשם"
              value={user.created_date ? format(new Date(user.created_date), 'dd/MM/yyyy') : '—'}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <CopyableId id={user.id} label="מזהה משתמש" fontSize={10} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-3)' }}>
              <Gift size={11} /> סה״כ נכנס: {purchasedTotal + earnedTotal} · סה״כ יצא: {spentTotal}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}