import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { RotateCcw, Lock } from 'lucide-react';
import { Section, inputStyle, Pill, Btn, card } from '@/components/admin/brand/brandUi';

/**
 * Marketplace settings — the SMALL, safe subset of JobaSettings pricing a Brand
 * may override. Everything else (identity, KYC, credits, reputation) is global
 * and is deliberately not exposed here.
 *
 * Every key shown as overridable is read by the SERVER on the real money path
 * (apply / boost / story / loyalty) through the task's own Brand, so an override
 * here changes what is actually charged — it is not a decorative field.
 */

const OVERRIDABLE = [
  { key: 'application_fee_percent', label: 'אחוז דמי הגשה', unit: '%', desc: 'האחוז שנגבה ממחיר המשימה בעת הגשת בקשה.' },
  { key: 'application_fee_min', label: 'מינימום דמי הגשה', unit: 'ג׳ובות', desc: 'הסכום המינימלי שנגבה על הגשת בקשה.' },
  { key: 'story_cost', label: 'עלות פרסום סטורי', unit: 'ג׳ובות', desc: 'עלות פרסום משימה כסטורי.' },
  { key: 'boost_cost', label: 'עלות Boost', unit: 'ג׳ובות', desc: 'עלות איתות נוסף למשימה.' },
  { key: 'loyalty_reward_percent', label: 'אחוז בונוס נאמנות', unit: '%', desc: 'אחוז מהג׳ובות המוחזר כבונוס על דירוג 5 כוכבים.' },
  { key: 'loyalty_reward_min', label: 'מינימום בונוס נאמנות', unit: 'ג׳ובות', desc: 'הבונוס המינימלי שיוחזר.' },
];

const GLOBAL_ONLY = [
  ['signup_bonus', 'בונוס הצטרפות'],
  ['referral_signup_bonus', 'בונוס הצטרפות מופנית'],
  ['profile_completion_bonus', 'בונוס השלמת פרופיל'],
];

export default function BrandMarketplaceTab({ brand, config, onSaved }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({});

  const { data: globalSettings } = useQuery({
    queryKey: ['jobaSettings'],
    queryFn: async () => {
      const list = await base44.entities.JobaSettings.list('-updated_date', 1);
      return list[0] || null;
    },
    staleTime: 60000,
  });

  useEffect(() => {
    setValues(config?.marketplace || {});
  }, [config?.id, config?.marketplace]);

  const overrides = config?.marketplace || {};

  const save = async () => {
    setSaving(true);
    try {
      const payload = {};
      for (const o of OVERRIDABLE) {
        const v = values[o.key];
        payload[o.key] = v === '' || v === undefined || v === null ? '' : Number(v);
      }
      const res = await base44.functions.invoke('adminUpdateBrand', {
        brand_id: brand.id,
        marketplace: payload,
      });
      const data = res?.data;
      if (!data?.success) {
        toast.error(data?.error === 'marketplace_value_invalid' ? 'ערך לא תקין' : 'השמירה נכשלה');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['adminBrand', brand.id] });
      queryClient.invalidateQueries({ queryKey: ['jobaSettings'] });
      toast.success('הגדרות השוק נשמרו');
      onSaved?.(data);
    } catch (e) {
      toast.error('השמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  const clearOne = (key) => setValues((v) => {
    const next = { ...v };
    delete next[key];
    return next;
  });

  return (
    <>
      <Section
        title="הגדרות שוק"
        desc="ברירת המחדל מגיעה מ-Joba24. ערך שהוגדר כאן חל על המותג הזה בלבד ומשמש בפועל את השרת בחישובי הג׳ובות."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {OVERRIDABLE.map((o) => {
            const raw = values[o.key];
            const hasValue = raw !== '' && raw !== undefined && raw !== null;
            const inherited = globalSettings?.[o.key];
            return (
              <div key={o.key} style={{ ...card, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{o.label}</div>
                  <Pill tone={hasValue ? 'blue' : 'gray'}>
                    {hasValue ? 'מוגדר למותג' : `בירושה מ-Joba24 (${inherited ?? '—'})`}
                  </Pill>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.55 }}>{o.desc}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    style={{ ...inputStyle, maxWidth: 160 }}
                    value={raw ?? ''}
                    placeholder={inherited !== undefined ? String(inherited) : ''}
                    onChange={(e) => setValues((v) => ({ ...v, [o.key]: e.target.value }))}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{o.unit}</span>
                  {hasValue && (
                    <Btn variant="soft" onClick={() => clearOne(o.key)} style={{ height: 34, fontSize: 12 }}>
                      <RotateCcw size={13} /> חזור לבירושה
                    </Btn>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Btn onClick={save} loading={saving}>שמור הגדרות שוק</Btn>
      </Section>

      <Section
        title="הגדרות גלובליות"
        desc="הגדרות אלה נשארות ברמת הפלטפורמה ואינן ניתנות לשינוי למותג בודד."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {GLOBAL_ONLY.map(([key, label]) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 10, background: 'var(--surface-1)', borderRadius: 10, padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lock size={13} color="var(--text-3)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{label}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>
                {globalSettings?.[key] ?? '—'}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
          זהות, אימות (KYC), ארנק הג׳ובות והמוניטין נשארים גלובליים לכל הפלטפורמה ואינם מוגדרים למותג.
        </div>
      </Section>
    </>
  );
}