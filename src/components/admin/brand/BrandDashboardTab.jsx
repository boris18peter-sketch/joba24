import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Loader2, Users, ListChecks, FileCheck2, Star, Coins, TrendingUp, Info } from 'lucide-react';
import { Section, Pill, Btn, card, mono } from '@/components/admin/brand/brandUi';
import BrandCategoryAnalytics from '@/components/admin/brand/BrandCategoryAnalytics';

/**
 * Brand Dashboard — operational statistics attributable to THIS Brand.
 *
 * Every figure comes from a record that actually carries the Brand's id:
 *   Task.origin_brand_id · TaskApplication.surface_brand_id
 *   Review.surface_brand_id · CreditTransaction.brand_id · BrandMembership.brand_id
 *
 * Nothing is inferred. A metric that cannot be derived from trusted attribution
 * is shown as unavailable with the reason, never as a zero that looks real.
 */

const RANGES = [
  ['today', 'היום'],
  ['7d', '7 ימים'],
  ['30d', '30 ימים'],
  ['all', 'הכל'],
];

function Stat({ icon: Icon, label, value, sub, tone = 'gray' }) {
  return (
    <div style={{ ...card, padding: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={13} color="var(--text-3)" />
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub}</div>}
      {tone === 'warn' && <Pill tone="amber">חלקי</Pill>}
    </div>
  );
}

const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);
const num = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('he-IL'));

export default function BrandDashboardTab({ brand }) {
  const [range, setRange] = useState('30d');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['brandDashboard', brand.id, range],
    queryFn: async () => {
      const res = await base44.functions.invoke('getBrandDashboard', { brand_id: brand.id, range });
      return res?.data?.success ? res.data : null;
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={26} className="animate-spin" color="#1a6fd4" />
      </div>
    );
  }

  if (!data) {
    return (
      <Section title="דשבורד" desc="נתונים המשויכים למותג.">
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>לא ניתן לטעון את הנתונים.</div>
      </Section>
    );
  }

  const t = data.tasks;
  const a = data.applications;

  return (
    <>
      <Section
        title="דשבורד מותג"
        desc="כל המספרים מגיעים מרשומות שמשויכות למותג הזה בפועל."
        actions={
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {isFetching && <Loader2 size={14} className="animate-spin" color="var(--text-3)" />}
            {RANGES.map(([key, label]) => (
              <Btn
                key={key}
                variant={range === key ? 'primary' : 'soft'}
                onClick={() => setRange(key)}
                style={{ height: 34, fontSize: 12 }}
              >
                {label}
              </Btn>
            ))}
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: 8 }}>
          <Stat icon={Users} label="חברים" value={num(data.members.total)}
            sub={`${num(data.members.new_in_range)} חדשים בטווח`} />
          <Stat icon={Users} label="פעילים בטווח" value={num(data.members.active_in_range)}
            sub="חברים עם פעילות אמיתית" />
          <Stat icon={ListChecks} label="משימות שנוצרו" value={num(t.created_in_range)}
            sub={`${num(t.total)} סה״כ`} />
          <Stat icon={ListChecks} label="משימות פתוחות" value={num(t.open)} sub="מצב נוכחי" />
          <Stat icon={ListChecks} label="הושלמו בטווח" value={num(t.completed_in_range)} />
          <Stat icon={FileCheck2} label="בקשות בטווח" value={num(a.in_range)}
            sub={`${num(a.total)} סה״כ`} />
          <Stat icon={TrendingUp} label="שיעור המרה" value={pct(a.conversion_rate)}
            sub="בקשה → אישור" />
          <Stat icon={TrendingUp} label="שיעור השלמה" value={pct(data.completion_rate)}
            sub="משימה → הושלמה" />
          <Stat icon={Coins} label="צריכת ג׳ובות" value={num(data.credits.consumed_in_range)}
            sub={`${num(data.credits.attributed_transactions_in_range)} תנועות משויכות`} />
          <Stat icon={Coins} label="רכישות ג׳ובות" value={num(data.credits.purchased_in_range)}
            sub="רכישות בטווח"
            tone={data.credits.purchased_in_range === 0 ? 'warn' : 'gray'} />
          <Stat icon={Star} label="דירוגים בטווח" value={num(data.reviews.in_range)}
            sub={`${num(data.reviews.total)} סה״כ`} />
          <Stat icon={Star} label="דירוג ממוצע" value={data.reviews.avg_rating ? data.reviews.avg_rating.toFixed(2) : '—'}
            sub="בטווח הנבחר" />
        </div>

        {data.unavailable?.length > 0 && (
          <div style={{
            background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
            borderRadius: 12, padding: 12, display: 'flex', gap: 9, alignItems: 'flex-start',
          }}>
            <Info size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.65 }}>
              {data.unavailable.map((u) => (
                <div key={u.metric}>• {u.reason}</div>
              ))}
              {data.unattributed_credit_transactions > 0 && (
                <div>
                  • {num(data.unattributed_credit_transactions)} תנועות ג׳ובות ותיקות אינן משויכות למותג
                  ולכן אינן נספרות.
                </div>
              )}
            </div>
          </div>
        )}
      </Section>

      <Section title="פעילות לאורך זמן" desc="משימות, בקשות וחברים חדשים לפי יום.">
        {data.daily.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', padding: 16, textAlign: 'center' }}>
            אין פעילות משויכת בטווח הזה
          </div>
        ) : (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={data.daily} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--text-3)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--text-3)" allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--border-1)' }} />
                <Line type="monotone" dataKey="tasks" name="משימות" stroke="var(--brand-primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="applications" name="בקשות" stroke="var(--brand-accent)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="members" name="חברים" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      <BrandCategoryAnalytics data={data} />

      <Section title="משיכת נתונים" desc="הטווח המדויק שממנו נספרים הנתונים.">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Pill tone="gray">מ־{new Date(data.range.from).toLocaleDateString('he-IL')}</Pill>
          <Pill tone="gray">עד {new Date(data.range.to).toLocaleDateString('he-IL')}</Pill>
          <span style={{ fontSize: 11, color: 'var(--text-3)', ...mono }}>brand: {brand.slug}</span>
        </div>
      </Section>
    </>
  );
}