import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, Download, Wallet, Lock, ShoppingCart, TrendingDown } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import CreditUserRow from '@/components/admin/CreditUserRow';

/**
 * AdminCreditsTab — the credit (Joba) position of every user.
 *
 * Every money figure is a server-side aggregate per user, so the numbers are
 * exact rather than a sum over whatever page happened to be loaded:
 *   available → User.worker_credits
 *   locked    → TaskApplication.credits_charged where status = pending
 *   purchased → CreditTransaction type = Purchase (both card and Apple IAP)
 *   spent     → CreditTransaction type = Application_Fee | Story_Publication
 *   earned    → CreditTransaction bonuses / refunds
 * Purchase method comes from the ledger: Apple writes `payment_id = "apple:…"`.
 */
const SPEND_TYPES = ['Application_Fee', 'Story_Publication'];
const EARN_TYPES = ['Signup_Bonus', 'Loyalty_Reward', 'Refund_Rejection', 'Refund_Expiration'];

const SEGMENTS = [
  { key: 'all', label: 'הכל' },
  { key: 'with_balance', label: 'עם יתרה זמינה' },
  { key: 'zero', label: 'יתרה אפס' },
  { key: 'locked', label: 'עם ג׳ובות נעולות' },
  { key: 'buyers', label: 'רכשו ג׳ובות' },
  { key: 'never_bought', label: 'לא רכשו' },
  { key: 'spenders', label: 'ניצלו ג׳ובות' },
  { key: 'idle', label: 'מעולם לא ניצלו' },
];

const METHODS = [
  { key: '', label: 'כל אמצעי הרכישה' },
  { key: 'apple', label: 'Apple IAP' },
  { key: 'card', label: 'כרטיס אשראי' },
  { key: 'none', label: 'ללא רכישה' },
];

const SORTS = [
  { key: 'total', label: 'יתרה (גבוה → נמוך)' },
  { key: 'purchased', label: 'נרכש (גבוה → נמוך)' },
  { key: 'spent', label: 'נוצל (גבוה → נמוך)' },
  { key: 'recent', label: 'רכישה אחרונה' },
];

const selectStyle = {
  height: 36, borderRadius: 10, border: '1px solid var(--border-1)',
  padding: '0 10px', fontSize: 12, color: 'var(--text-1)',
  outline: 'none', background: 'var(--surface-2)', flexShrink: 0,
};

function Tile({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)' }}>{label}</div>
    </div>
  );
}

export default function AdminCreditsTab({ allUsers = [], loadingUsers = false }) {
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [method, setMethod] = useState('');
  const [sortKey, setSortKey] = useState('total');

  const purchasesQ = useQuery({
    queryKey: ['creditAggPurchases'],
    queryFn: () => base44.entities.CreditTransaction.aggregate({
      query: { type: 'Purchase' }, groupBy: 'user_id', sum: 'amount', max: 'created_date', count: true,
    }),
    staleTime: 60000, refetchOnWindowFocus: false,
  });

  const spendQ = useQuery({
    queryKey: ['creditAggSpend'],
    queryFn: () => base44.entities.CreditTransaction.aggregate({
      query: { type: { $in: SPEND_TYPES } }, groupBy: 'user_id', sum: 'amount',
    }),
    staleTime: 60000, refetchOnWindowFocus: false,
  });

  const earnQ = useQuery({
    queryKey: ['creditAggEarn'],
    queryFn: () => base44.entities.CreditTransaction.aggregate({
      query: { type: { $in: EARN_TYPES } }, groupBy: 'user_id', sum: 'amount',
    }),
    staleTime: 60000, refetchOnWindowFocus: false,
  });

  const lockedQ = useQuery({
    queryKey: ['creditAggLocked'],
    queryFn: () => base44.entities.TaskApplication.aggregate({
      query: { status: 'pending' }, groupBy: 'worker_id', sum: 'credits_charged',
    }),
    staleTime: 30000, refetchOnWindowFocus: false,
  });

  const appleQ = useQuery({
    queryKey: ['creditAggApple'],
    queryFn: () => base44.entities.CreditTransaction.aggregate({
      query: { type: 'Purchase', payment_id: { $regex: '^apple:' } }, groupBy: 'user_id', count: true,
    }),
    staleTime: 60000, refetchOnWindowFocus: false,
  });

  // The user page must be in before the aggregate rows mean anything — otherwise
  // the tab flashes an empty list while the users query is still in flight.
  const loading = loadingUsers || purchasesQ.isLoading || spendQ.isLoading || earnQ.isLoading || lockedQ.isLoading;

  const rows = useMemo(() => {
    const bought = new Map(
      (purchasesQ.data?.rows || []).map(r => [r.user_id, { sum: r.sum_amount || 0, last: r.max_created_date || null, count: r.count || 0 }]),
    );
    const spent = new Map((spendQ.data?.rows || []).map(r => [r.user_id, Math.abs(r.sum_amount || 0)]));
    const earned = new Map((earnQ.data?.rows || []).map(r => [r.user_id, r.sum_amount || 0]));
    const locked = new Map((lockedQ.data?.rows || []).map(r => [r.worker_id, r.sum_credits_charged || 0]));
    const appleUsers = new Set((appleQ.data?.rows || []).map(r => r.user_id));

    return allUsers.map((u) => {
      const b = bought.get(u.id);
      const available = u.worker_credits ?? 0;
      const lockedAmt = locked.get(u.id) || 0;
      const purchaseCount = b?.count || 0;
      return {
        user: u,
        available,
        locked: lockedAmt,
        total: available + lockedAmt,
        purchasedTotal: b?.sum || 0,
        purchaseCount,
        spentTotal: spent.get(u.id) || 0,
        earnedTotal: earned.get(u.id) || 0,
        lastPurchase: b?.last || null,
        method: purchaseCount === 0 ? 'none' : (appleUsers.has(u.id) ? 'apple' : 'card'),
      };
    });
  }, [allUsers, purchasesQ.data, spendQ.data, earnQ.data, lockedQ.data, appleQ.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) => {
      const u = r.user;
      if (q) {
        const hit = u.full_name?.toLowerCase().includes(q)
          || u.email?.toLowerCase().includes(q)
          || u.id?.toLowerCase().includes(q)
          || (u.phone && u.phone.includes(q));
        if (!hit) return false;
      }
      if (segment === 'with_balance' && r.available <= 0) return false;
      if (segment === 'zero' && r.available > 0) return false;
      if (segment === 'locked' && r.locked <= 0) return false;
      if (segment === 'buyers' && r.purchaseCount === 0) return false;
      if (segment === 'never_bought' && r.purchaseCount > 0) return false;
      if (segment === 'spenders' && r.spentTotal <= 0) return false;
      if (segment === 'idle' && r.spentTotal > 0) return false;
      if (method && r.method !== method) return false;
      return true;
    });

    const cmp = {
      total: (a, b) => b.total - a.total,
      purchased: (a, b) => b.purchasedTotal - a.purchasedTotal,
      spent: (a, b) => b.spentTotal - a.spentTotal,
      recent: (a, b) => String(b.lastPurchase || '').localeCompare(String(a.lastPurchase || '')),
    }[sortKey];

    return [...list].sort(cmp);
  }, [rows, search, segment, method, sortKey]);

  const totals = useMemo(() => filtered.reduce((acc, r) => ({
    available: acc.available + r.available,
    locked: acc.locked + r.locked,
    purchased: acc.purchased + r.purchasedTotal,
    spent: acc.spent + r.spentTotal,
  }), { available: 0, locked: 0, purchased: 0, spent: 0 }), [filtered]);

  const handleExport = () => {
    exportToCSV(filtered.map((r) => ({
      id: r.user.id,
      full_name: r.user.full_name,
      email: r.user.email,
      phone: r.user.phone,
      available: r.available,
      locked: r.locked,
      total: r.total,
      purchased_total: r.purchasedTotal,
      purchase_count: r.purchaseCount,
      spent_total: r.spentTotal,
      earned_total: r.earnedTotal,
      method: r.method,
      last_purchase: r.lastPurchase,
      created_date: r.user.created_date,
    })), [
      { key: 'id', label: 'מזהה משתמש' },
      { key: 'full_name', label: 'שם' },
      { key: 'email', label: 'אימייל' },
      { key: 'phone', label: 'טלפון' },
      { key: 'available', label: 'זמין' },
      { key: 'locked', label: 'נעול' },
      { key: 'total', label: 'סה״כ ג׳ובות' },
      { key: 'purchased_total', label: 'נרכש' },
      { key: 'purchase_count', label: 'מספר רכישות' },
      { key: 'spent_total', label: 'נוצל' },
      { key: 'earned_total', label: 'בונוסים' },
      { key: 'method', label: 'אופן רכישה' },
      { key: 'last_purchase', label: 'רכישה אחרונה' },
      { key: 'created_date', label: 'נרשם' },
    ], 'joba24_credits');
  };

  const hasFilters = !!search || segment !== 'all' || !!method || sortKey !== 'total';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        <Tile label="זמין" value={totals.available} color="#16a34a" bg="#f0fdf4" />
        <Tile label="נעול" value={totals.locked} color="#d97706" bg="#fffbeb" />
        <Tile label="נרכש" value={totals.purchased} color="#1a6fd4" bg="#eff6ff" />
        <Tile label="נוצל" value={totals.spent} color="#dc2626" bg="#fef2f2" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, אימייל, טלפון או מזהה משתמש..."
            style={{ width: '100%', height: 36, borderRadius: 10, border: '1px solid var(--border-1)', paddingRight: 30, paddingLeft: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-2)', color: 'var(--text-1)' }}
          />
        </div>
        <button
          onClick={handleExport}
          style={{ height: 36, padding: '0 12px', borderRadius: 10, background: '#059669', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Download size={13} /> ייצא
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <select value={segment} onChange={e => setSegment(e.target.value)} style={selectStyle}>
          {SEGMENTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={method} onChange={e => setMethod(e.target.value)} style={selectStyle}>
          {METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <select value={sortKey} onChange={e => setSortKey(e.target.value)} style={selectStyle}>
          {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setSegment('all'); setMethod(''); setSortKey('total'); }}
            style={{ padding: '0 12px', height: 36, borderRadius: 10, fontSize: 12, fontWeight: 700, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer' }}
          >
            נקה
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={24} className="animate-spin" color="#1a6fd4" />
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wallet size={12} /> {filtered.length} משתמשים · סה״כ {totals.available + totals.locked} ג׳ובות בחשבונות
          </div>
          {filtered.map(row => <CreditUserRow key={row.user.id} row={row} />)}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <Lock size={30} color="var(--text-3)" />
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginTop: 10 }}>אין משתמשים תואמים</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}