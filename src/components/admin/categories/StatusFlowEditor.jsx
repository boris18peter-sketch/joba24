import { Field } from '@/components/admin/brand/brandUi';
import { GENERIC_STATUS_FLOW, STEP_ICONS, CANONICAL_STEPS, normalizeFlow } from '@/lib/taskStatusFlow';

/**
 * StatusFlowEditor — edits a GlobalCategory's `status_flow`.
 *
 * The three steps are the canonical backend states and are NOT reorderable or
 * renamable at the key level: only their presentation (label, owner label,
 * icon), the worker CTA copy and the proof copy are configurable. This keeps the
 * lifecycle safe while letting each service read naturally.
 *
 * Leaving a field empty inherits the generic fallback for that field.
 */

const STEP_TITLES = {
  on_the_way: 'שלב 1 — יציאה / התחלה',
  arrived: 'שלב 2 — הגעה / ביצוע',
  done: 'שלב 3 — סיום',
};

export default function StatusFlowEditor({ flow, onChange }) {
  const current = normalizeFlow(flow);

  const patchStep = (key, field, value) => {
    onChange({
      ...(flow || {}),
      steps: CANONICAL_STEPS.map((k) => {
        const base = (flow?.steps || []).find((s) => s?.key === k) || {};
        return k === key ? { ...base, key: k, [field]: value } : { ...base, key: k };
      }),
    });
  };

  const patchCta = (key, field, value) => {
    onChange({
      ...(flow || {}),
      cta: {
        ...(flow?.cta || {}),
        [key]: { ...((flow?.cta || {})[key] || {}), [field]: value },
      },
    });
  };

  const patchProof = (field, value) => {
    onChange({ ...(flow || {}), proof: { ...(flow?.proof || {}), [field]: value } });
  };

  const reset = () => onChange(null);

  return (
    <div className="space-y-4 rounded-lg border border-jborder-2 bg-surface-3 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-sm">מסלול סטטוסים וטקסטים</h4>
          <p className="text-xs text-jtext-2 mt-1">
            שלושת השלבים הם מצבי המערכת הקבועים. כאן מגדירים רק איך הם מוצגים — לכל סוג שירות
            בשפה שמתאימה לו. ריק = ברירת המחדל הגנרית.
          </p>
        </div>
        <button type="button" onClick={reset} className="j-btn j-btn-ghost px-3 py-2 text-xs whitespace-nowrap">
          אפס לגנרי
        </button>
      </div>

      {CANONICAL_STEPS.map((key) => {
        const step = current.steps.find((s) => s.key === key);
        const cta = current.cta[key];
        return (
          <div key={key} className="rounded-md border border-jborder-1 bg-surface-2 p-3 space-y-2">
            <div className="text-xs font-bold text-jtext-2">{STEP_TITLES[key]}</div>
            <div className="grid sm:grid-cols-3 gap-2">
              <Field label="שם השלב (לעובד)">
                <input className="j-input p-2" placeholder={GENERIC_STATUS_FLOW.steps.find((s) => s.key === key).label}
                  value={step.label} onChange={(e) => patchStep(key, 'label', e.target.value)} />
              </Field>
              <Field label="שם השלב (למפרסם)">
                <input className="j-input p-2" placeholder={GENERIC_STATUS_FLOW.steps.find((s) => s.key === key).owner_label}
                  value={step.owner_label} onChange={(e) => patchStep(key, 'owner_label', e.target.value)} />
              </Field>
              <Field label="אייקון">
                <select className="j-input p-2" value={step.icon} onChange={(e) => patchStep(key, 'icon', e.target.value)}>
                  {STEP_ICONS.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <Field label="טקסט הכפתור">
                <input className="j-input p-2" placeholder={GENERIC_STATUS_FLOW.cta[key].label}
                  value={cta.label} onChange={(e) => patchCta(key, 'label', e.target.value)} />
              </Field>
              <Field label="אימוג׳י">
                <input className="j-input p-2" dir="ltr" placeholder={GENERIC_STATUS_FLOW.cta[key].emoji}
                  value={cta.emoji} onChange={(e) => patchCta(key, 'emoji', e.target.value)} />
              </Field>
              <Field label="כותרת אישור">
                <input className="j-input p-2" placeholder={GENERIC_STATUS_FLOW.cta[key].confirm_title}
                  value={cta.confirm_title} onChange={(e) => patchCta(key, 'confirm_title', e.target.value)} />
              </Field>
              <Field label="הסבר באישור">
                <input className="j-input p-2" placeholder={GENERIC_STATUS_FLOW.cta[key].confirm_sub}
                  value={cta.confirm_sub} onChange={(e) => patchCta(key, 'confirm_sub', e.target.value)} />
              </Field>
              <Field label="הודעת הצלחה">
                <input className="j-input p-2" placeholder={GENERIC_STATUS_FLOW.cta[key].toast}
                  value={cta.toast} onChange={(e) => patchCta(key, 'toast', e.target.value)} />
              </Field>
            </div>
          </div>
        );
      })}

      <div className="rounded-md border border-jborder-1 bg-surface-2 p-3 space-y-2">
        <div className="text-xs font-bold text-jtext-2">הוכחת ביצוע</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <Field label="כותרת">
            <input className="j-input p-2" placeholder={GENERIC_STATUS_FLOW.proof.label}
              value={current.proof.label} onChange={(e) => patchProof('label', e.target.value)} />
          </Field>
          <Field label="הסבר">
            <input className="j-input p-2" placeholder={GENERIC_STATUS_FLOW.proof.sub}
              value={current.proof.sub} onChange={(e) => patchProof('sub', e.target.value)} />
          </Field>
        </div>
      </div>
    </div>
  );
}