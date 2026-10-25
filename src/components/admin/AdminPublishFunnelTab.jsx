import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Loader2, TrendingDown, Megaphone, UserX, Users, CheckCircle2 } from 'lucide-react';
import FunnelSegmentTable from '@/components/admin/funnel/FunnelSegmentTable';
import TrackingHealth from '@/components/admin/funnel/TrackingHealth';

/**
 * Admin — where publishing attempts stop.
 *
 * The campaign reports "9 arrived, 0 published". That number is true and
 * useless: it says nobody finished but not one word about WHERE they gave up.
 * This tab answers the only question that leads to a fix — at which step the
 * attempts are dying — and separates the two populations the campaign mixes:
 * people who never signed in, and people who signed in and still walked away.
 *
 * One row in the entity is one ATTEMPT, and its furthest step never goes
 * backwards, so the counts below can only ever under-report progress, never
 * invent it.
 */
const STEPS = [
  { key: 'opened', label: 'פתחו את טופס הפרסום' },
  { key: 'category', label: 'בחרו קטגוריה' },
  { key: 'details', label: 'כתבו תיאור למשימה' },
  { key: 'location', label: 'אישרו כתובת' },
  { key: 'pricing', label: 'קבעו מחיר ואמצעי תשלום' },
  { key: 'contact', label: 'הזינו מספר טלפון' },
  { key: 'ready', label: 'השלימו את כל השדות' },
  { key: 'published', label: 'פרסמו את המשימה' },
];

const STEP_LABEL = Object.fromEntries(STEPS.map(s => [s.key, s.label]));

const RANGES = [
  { key: '7', label: '7 ימים' },
  { key: '30', label: '30 יום' },
  { key: '90', label: '90 יום' },
  { key: 'all', label: 'הכל' },
];

function StatCard({ icon, value, label, tone }) {
  return (
    <div style={{
      flex: '1 1 130px', minWidth: 130,
      background: 'var(--surface-2)', border: '1px solid var(--border-1)',
      borderRadius: 14, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tone || 'var(--text-3)', marginBottom: 6 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.6, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default function AdminPublishFunnelTab() {
  const [range, setRange] = useState('30');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['adminPublishFunnel', range],
    queryFn: async () => {
      const query = {};
      if (range !== 'all') {
        query.first_seen_at = { $gte: new Date(Date.now() - Number(range) * 86400000).toISOString() };
      }
      const page = await base44.entities.PublishFunnelEvent.filter(query, { sort: '-created_date', limit: 500 });
      return page?.items || [];
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // ── WHO is behind an attempt ─────────────────────────────────────────────
  // The name is stored on the row from now on. Rows written before that carry
  // only a user_id, so they are resolved here — otherwise the table would show
  // a raw id for exactly the attempts the admin is trying to identify.
  const missingNameIds = Array.from(new Set(
    events.filter(e => e.user_id && !e.user_name).map(e => e.user_id),
  ));
  const { data: nameById = {} } = useQuery({
    queryKey: ['adminPublishFunnelNames', missingNameIds.join(',')],
    enabled: missingNameIds.length > 0,
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: { $in: missingNameIds } });
      const list = Array.isArray(users) ? users : (users?.items || []);
      return Object.fromEntries(list.map(u => [u.id, u.full_name || u.email || '']));
    },
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });
  const nameOf = (e) => e.user_name || nameById[e.user_id] || '';

  // ── "NO ACTIVITY" OR "BROKEN COLLECTOR"? ─────────────────────────────────
  // These two questions look identical on a funnel that reads zero and demand
  // opposite responses, so the tab asks the entity directly: has it EVER
  // recorded anything, and when was the last time.
  const { data: ever } = useQuery({
    queryKey: ['adminPublishFunnelEver'],
    queryFn: async () => {
      const page = await base44.entities.PublishFunnelEvent.list({ sort: '-created_date', limit: 1 });
      const count = await base44.entities.PublishFunnelEvent.count({});
      const last = (page?.items || [])[0];
      return { count, lastAt: last?.first_seen_at || last?.created_date || null };
    },
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  // Where the visitor came from, in the order the ad platforms themselves use:
  // campaign name first, then source/medium, then the click id, then the link's
  // own track parameter. "אורגני" means none of the above was recorded.
  const sourceLabel = (e) => {
    if (e.utm_campaign) return e.utm_campaign;
    if (e.utm_source) return e.utm_medium ? `${e.utm_source} / ${e.utm_medium}` : e.utm_source;
    if (e.gclid) return 'Google Ads (gclid)';
    if (e.source_track) return e.source_track;
    return 'אורגני';
  };

  const total = events.length;
  const stepIndex = (e) => (typeof e.furthest_step_index === 'number' ? e.furthest_step_index : 0);

  // Reached-at-least-N. Because the stored step is the FURTHEST one, everyone
  // who got past a step is counted in it — which is what makes the bars a
  // funnel rather than eight unrelated totals.
  const reached = STEPS.map((_, i) => events.filter(e => stepIndex(e) >= i).length);
  const published = events.filter(e => e.furthest_step === 'published').length;
  const neverSignedIn = events.filter(e => !e.user_id && !e.has_account).length;
  const signedIn = events.filter(e => !!e.user_id || e.has_account).length;
  const fromCampaign = events.filter(e => !!e.source_track).length;

  const conversion = total ? Math.round((published / total) * 1000) / 10 : 0;

  // ── THE ONE NUMBER THAT LEADS TO A FIX ───────────────────────────────────
  // Every other figure on this screen describes the funnel; this one names the
  // step where it is leaking, which is the only thing that can be acted on.
  const biggestDrop = STEPS.slice(1).reduce((worst, step, i) => {
    const from = reached[i];
    const to = reached[i + 1];
    const lost = from - to;
    return lost > worst.lost ? { step, from, to, lost } : worst;
  }, { step: null, from: 0, to: 0, lost: 0 });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10, color: 'var(--text-3)' }}>
        <Loader2 size={20} className="animate-spin" />
        <span style={{ fontSize: 14, fontWeight: 600 }}>טוען נתוני פאנל…</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} dir="rtl">

      {/* Range */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            style={{
              height: 34, padding: '0 14px', borderRadius: 10, cursor: 'pointer',
              fontSize: 12.5, fontWeight: 700,
              background: range === r.key ? 'var(--brand-primary)' : 'var(--surface-2)',
              color: range === r.key ? '#fff' : 'var(--text-2)',
              border: `1px solid ${range === r.key ? 'var(--brand-primary)' : 'var(--border-1)'}`,
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Is the funnel empty, or is the instrument broken? Answered before any
          other number on this screen is worth reading. */}
      <TrackingHealth
        events={events}
        everCount={ever?.count ?? 0}
        lastEverAt={ever?.lastAt ? format(new Date(ever.lastAt), 'd בMMM, HH:mm', { locale: he }) : null}
        rangeLabel={RANGES.find(r => r.key === range)?.label || range}
      />

      {total === 0 ? (
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border-1)',
          borderRadius: 16, padding: '32px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>
            אין עדיין ניסיונות פרסום בטווח הזה
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            הנתונים יופיעו מכאן והלאה — המעקב נרשם מרגע שהשתחררה הגרסה הזו.
          </div>
        </div>
      ) : (
        <>
          {/* Headline */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatCard icon={<Megaphone size={13} />} label="ניסיונות פרסום" value={total} />
            <StatCard icon={<CheckCircle2 size={13} />} label="פורסמו בפועל" value={published} tone="var(--color-success)" />
            <StatCard icon={<TrendingDown size={13} />} label="אחוז השלמה" value={`${conversion}%`} tone="var(--brand-primary)" />
            <StatCard icon={<UserX size={13} />} label="לא התחברו בכלל" value={neverSignedIn} tone="var(--color-danger)" />
            <StatCard icon={<Users size={13} />} label="התחברו לחשבון" value={signedIn} tone="var(--color-success)" />
            <StatCard icon={<Megaphone size={13} />} label="מקמפיין (עם track)" value={fromCampaign} />
          </div>

          {/* The leak, named */}
          {biggestDrop.lost > 0 && (
            <div style={{
              background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)',
              borderRadius: 14, padding: '13px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <TrendingDown size={17} color="var(--color-danger)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-1)' }}>
                <strong style={{ fontWeight: 900 }}>הנשירה הגדולה: אחרי „{biggestDrop.step.label}”.</strong>{' '}
                {biggestDrop.lost} מתוך {biggestDrop.from} לא המשיכו
                {biggestDrop.from > 0 && ` (${Math.round((biggestDrop.to / biggestDrop.from) * 100)}% המשיכו)`}.
                שם כדאי לבדוק קודם.
              </div>
            </div>
          )}

          {/* Funnel */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 16, padding: '16px' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-1)', marginBottom: 4 }}>
              איפה כל ניסיון עצר
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
              כל שורה = כמה הגיעו לשלב הזה לפחות. הירידה מימין = כמה נשרו בדיוק כאן.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {STEPS.map((step, i) => {
                const count = reached[i];
                const prev = i === 0 ? count : reached[i - 1];
                const dropped = prev - count;
                const width = total ? (count / total) * 100 : 0;
                const isLast = i === STEPS.length - 1;
                return (
                  <div key={step.key}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5, gap: 10 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>{step.label}</span>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
                        {dropped > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-danger)' }}>
                            −{dropped} נשרו
                          </span>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-1)' }}>{count}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 38, textAlign: 'left' }}>
                          {total ? Math.round(width) : 0}%
                        </span>
                      </span>
                    </div>
                    <div style={{ height: 9, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${width}%`, borderRadius: 99,
                        background: isLast
                          ? 'linear-gradient(90deg, var(--color-success), #047857)'
                          : 'linear-gradient(90deg, var(--brand-primary), var(--brand-primary-dark))',
                        transition: 'width 0.35s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Which traffic does the drop-off belong to? */}
          <FunnelSegmentTable
            title="לפי מקור תנועה"
            subtitle="אותו פאנל, מפוצל לפי הקמפיין שהביא את המבקר. כך רואים איזה קישור מחזיר אנשים שמתחילים לכתוב — ואיזה מחזיר קליקים בלבד."
            rows={events}
            labelOf={sourceLabel}
            emptyLabel="לא נרשם מקור"
          />

          <FunnelSegmentTable
            title="לפי קטגוריה"
            subtitle="הקטגוריה שנבחרה בטופס. שתי הקטגוריות של הקמפיין — הנדימן והרכבות — מופיעות כאן בנפרד."
            rows={events}
            labelOf={(e) => e.category}
            emptyLabel="ללא קטגוריה"
          />

          {/* Recent attempts */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 10px', fontSize: 14, fontWeight: 900, color: 'var(--text-1)' }}>
              הניסיונות האחרונים
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-3)' }}>
                    {['מתי', 'שם', 'עצר בשלב', 'קטגוריה', 'עיר', 'חשבון', 'מקור'].map(h => (
                      <th key={h} style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 800, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 50).map(e => (
                    <tr key={e.id} style={{ borderTop: '1px solid var(--border-1)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                        {e.first_seen_at ? format(new Date(e.first_seen_at), 'd בMMM, HH:mm', { locale: he }) : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>
                        {nameOf(e) || <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>אורח</span>}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: e.furthest_step === 'published' ? 'var(--color-success)' : 'var(--text-1)' }}>
                        {STEP_LABEL[e.furthest_step] || e.furthest_step}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{e.category || '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{e.city || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {e.user_id || e.has_account
                          ? <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>כן</span>
                          : <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>לא</span>}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{e.source_track || 'אורגני'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {events.length > 50 && (
              <div style={{ padding: '10px 16px', fontSize: 11, color: 'var(--text-3)' }}>
                מוצגים 50 הניסיונות האחרונים מתוך {events.length} בטווח.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}