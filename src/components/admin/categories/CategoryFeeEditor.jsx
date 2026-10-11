import { Coins } from 'lucide-react';
import { Field } from '@/components/admin/brand/brandUi';

/**
 * CategoryFeeEditor — the application-fee rules for ONE category.
 *
 * An EMPTY field means "use the platform default" — 5% with no cap. There is NO
 * inheritance: a category never reads a parent's numbers, so editing one
 * category can never move another.
 *
 * The cap is the one that matters in practice. At 5%, a ₪5,000 job charges 250
 * Jobas; a cap of 100 turns the same job into 100 — the fee stops scaling with
 * the price, which is what makes a big job postable at all.
 */
export default function CategoryFeeEditor({ fee, onChange }) {
  const f = fee || {};
  const set = (key, value) => {
    const next = { ...f };
    if (value === '' || value === null || Number.isNaN(value)) delete next[key];
    else next[key] = Number(value);
    onChange(Object.keys(next).length ? next : null);
  };

  const percent = f.application_fee_percent;
  const max = f.application_fee_max;
  const preview =
    Number.isFinite(Number(percent)) && Number(percent) > 0
      ? Math.min(
          Math.max(1, Math.round((5000 * Number(percent)) / 100)),
          Number(max) > 0 ? Number(max) : Infinity
        )
      : null;

  return (
    <div className="rounded-lg border border-jborder-2 bg-surface-2 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Coins size={15} color="#1a6fd4" />
        <h3 className="font-bold text-sm">עמלת הגשה לקטגוריה זו</h3>
      </div>

      <p className="text-xs text-jtext-3 leading-relaxed">
        ריק = ברירת המחדל — 5% וללא תקרה. כל קטגוריה עומדת בפני עצמה: שינוי כאן
        חל על הקטגוריה הזו בלבד ואינו משפיע על שום קטגוריה אחרת. 0 באחוזים = פטור
        מלא מהגשת בקשה בקטגוריה הזו.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="אחוז עמלה (%)">
          <input
            className="j-input p-2"
            type="number"
            min="0"
            step="0.5"
            dir="ltr"
            placeholder="ברירת מחדל"
            value={percent ?? ''}
            onChange={(e) => set('application_fee_percent', e.target.value)}
          />
        </Field>

        <Field label="תקרת עמלה (ג'ובות)">
          <input
            className="j-input p-2"
            type="number"
            min="0"
            dir="ltr"
            placeholder="ללא תקרה"
            value={max ?? ''}
            onChange={(e) => set('application_fee_max', e.target.value)}
          />
        </Field>
      </div>

      {preview !== null && (
        <div className="text-xs text-jtext-2 bg-blue-50 border border-blue-200 rounded-md p-2 leading-relaxed">
          עבודה ב-₪5,000 בקטגוריה זו תחייב <b>{preview} ג'ובות</b> להגשה
          {Number(max) > 0 ? ` (נעצרת בתקרה של ${max})` : ' (ללא תקרה)'}.
        </div>
      )}
    </div>
  );
}