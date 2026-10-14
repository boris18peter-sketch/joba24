import { Eye, MousePointerClick, Users, Target } from 'lucide-react';

/**
 * TaskMetricsStrip — the at-a-glance demand numbers for one task.
 *
 * `applicantCount` is the authoritative total of every application ever made
 * (from an aggregate), not Task.applicants.length — that array only holds the
 * still-active ones, so a task whose applicants were all rejected would look
 * like it never had any.
 */
function Metric({ icon: Icon, value, label, color }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13, fontWeight: 900, color }}>
        <Icon size={12} /> {value}
      </span>
      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)' }}>{label}</span>
    </div>
  );
}

export default function TaskMetricsStrip({ task, applicantCount }) {
  const views = task.views_count || 0;
  const clicks = task.clicks_count || 0;
  const applicants = applicantCount ?? (task.applicants?.length || 0);
  const conversion = views > 0 ? Math.round((applicants / views) * 100) : 0;

  return (
    <div style={{ display: 'flex', gap: 4, padding: '8px 10px', background: 'var(--surface-3)', borderRadius: 10, marginTop: 8 }}>
      <Metric icon={Eye} value={views} label="צפיות" color="#1a6fd4" />
      <Metric icon={MousePointerClick} value={clicks} label="כניסות" color="#7c3aed" />
      <Metric icon={Users} value={applicants} label="מועמדים" color="#16a34a" />
      <Metric icon={Target} value={`${conversion}%`} label="המרה" color="#d97706" />
    </div>
  );
}