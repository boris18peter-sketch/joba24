import GlobalFieldEditor from '@/components/admin/categories/GlobalFieldEditor';
import { Btn } from '@/components/admin/brand/brandUi';
export default function GlobalFormEditor({ fields = [], onChange }) {
  const update = (i, patch) => onChange(fields.map((f,j) => j === i ? { ...f, ...patch } : f));
  const move = (i, dir) => {
    const next = [...fields], j = i + dir;
    if (j < 0 || j >= fields.length) return;
    [next[i],next[j]] = [next[j],next[i]];
    onChange(next.map((f,k) => ({ ...f, order: k })));
  };
  return <div className="space-y-3">
    <h4 className="font-bold">טופס השירות הגלובלי</h4>
    <p className="text-sm text-jtext-3">הגדרה אחת לכל המותגים. שינויים נשמרים כאן בלבד, ללא עותק במותג.</p>
    {!fields.length && <p className="text-sm text-jtext-2">כרגע משתמש בטופס הבסיסי ובשדות הפלטפורמה הקיימים.</p>}
    {fields.map((f,i) => <GlobalFieldEditor key={i} field={f} onChange={patch => update(i,patch)} onMove={dir => move(i,dir)} onRemove={() => onChange(fields.filter((_,j) => j !== i))} />)}
    <Btn variant="soft" onClick={() => onChange([...fields,{ key: `field_${Date.now()}`, label: '', description: '', type: 'text', required: false, enabled: true, order: fields.length, options: [] }])}>הוסף שדה</Btn>
  </div>;
}