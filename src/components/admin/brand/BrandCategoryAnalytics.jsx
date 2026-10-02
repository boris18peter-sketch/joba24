import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Section, Btn } from '@/components/admin/brand/brandUi';
export default function BrandCategoryAnalytics({ data }) {
  const [group,setGroup] = useState('service');
  const rows = group === 'parent' ? data.by_parent || [] : data.by_category || [];
  return <Section title="משימות לפי שירות / תחום" desc="לפי מפתח השירות האמיתי במשימה; משימות ותיקות נשארות עם הקטגוריה המקורית." actions={<div className="flex gap-2"><Btn variant={group === 'service' ? 'primary' : 'soft'} onClick={() => setGroup('service')}>שירות</Btn><Btn variant={group === 'parent' ? 'primary' : 'soft'} onClick={() => setGroup('parent')}>קטגוריית אב</Btn></div>}>
    {!rows.length ? <p className="text-sm text-jtext-3">אין משימות בטווח</p> : <>
      <div className="w-full" style={{ height: Math.max(180,rows.length * 32) }}><ResponsiveContainer><BarChart data={rows} layout="vertical" margin={{ left:10,right:20 }}><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="label" width={145} tick={{ fontSize:11 }} /><Tooltip /><Bar dataKey="count" name="משימות" fill="var(--brand-primary)" /></BarChart></ResponsiveContainer></div>
      <ul className="space-y-2">{rows.map(r => <li key={r.key} className="flex justify-between text-sm text-jtext-2"><span>{r.icon} {r.label}</span><span>{r.count} · {r.percentage}%</span></li>)}</ul>
    </>}
  </Section>;
}