/**
 * FunnelSegmentTable — one segment of the publishing funnel, by any label.
 *
 * The funnel tab answers "where do attempts stop". This answers the question
 * that follows it: "and WHICH traffic does that". The same three numbers are
 * computed per segment — unique attempts, attempts that started writing the
 * description, attempts that published — because those are the three the
 * campaign is judged on.
 *
 * "Started typing" is furthest_step_index >= 2, i.e. the 'details' step or
 * beyond. That step is the description; it is the first thing the form asks for
 * after the category and the field that takes the most effort, so it is the
 * honest measure of a visitor who actually engaged rather than bounced.
 */
export default function FunnelSegmentTable({ title, subtitle, rows, labelOf, emptyLabel }) {
  const groups = new Map();

  for (const e of rows) {
    const label = labelOf(e) || emptyLabel;
    if (!groups.has(label)) groups.set(label, { label, visitors: 0, typed: 0, published: 0 });
    const g = groups.get(label);
    g.visitors += 1;
    const index = typeof e.furthest_step_index === 'number' ? e.furthest_step_index : 0;
    if (index >= 2) g.typed += 1;
    if (e.furthest_step === 'published') g.published += 1;
  }

  const list = [...groups.values()].sort((a, b) => b.visitors - a.visitors);
  if (!list.length) return null;

  const HEAD = ['מקור', 'ביקרו בטופס', 'התחילו לכתוב', 'פרסמו', 'השלמה'];

  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-1)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, lineHeight: 1.5 }}>{subtitle}</div>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--surface-3)' }}>
              {HEAD.map(h => (
                <th key={h} style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 800, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(g => {
              const rate = g.visitors ? Math.round((g.published / g.visitors) * 1000) / 10 : 0;
              return (
                <tr key={g.label} style={{ borderTop: '1px solid var(--border-1)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 800, color: 'var(--text-1)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.label}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 800, color: 'var(--text-1)' }}>{g.visitors}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 800, color: g.typed ? 'var(--brand-primary)' : 'var(--text-3)' }}>{g.typed}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 800, color: g.published ? 'var(--color-success)' : 'var(--text-3)' }}>{g.published}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: rate > 0 ? 'var(--color-success)' : 'var(--text-3)' }}>{rate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}