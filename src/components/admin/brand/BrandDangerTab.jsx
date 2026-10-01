import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { AlertTriangle, Archive, PauseCircle, Trash2, Loader2, ShieldAlert } from 'lucide-react';
import { Section, Pill, Btn, card, mono } from '@/components/admin/brand/brandUi';

/**
 * Danger Zone — suspend / archive / delete.
 *
 * Deletion is guarded by REAL dependency inspection: a Brand that owns any
 * marketplace or financial history can only be archived, never hard-deleted.
 * Archive takes the Brand offline and preserves every record.
 */
export default function BrandDangerTab({ brand }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  const { data: deps, isLoading } = useQuery({
    queryKey: ['adminBrandDependencies', brand.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('adminBrandLifecycle', { brand_id: brand.id, action: 'dependencies' });
      return res?.data?.dependencies || null;
    },
    enabled: !brand.is_default,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['adminBrandDependencies', brand.id] });
    queryClient.invalidateQueries({ queryKey: ['adminBrand', brand.id] });
    queryClient.invalidateQueries({ queryKey: ['adminBrands'] });
  };

  const run = async (action, confirm) => {
    setBusy(action);
    try {
      const res = await base44.functions.invoke('adminBrandLifecycle', {
        brand_id: brand.id, action, confirm,
      });
      const data = res?.data;
      if (!data?.success) {
        toast.error(
          data?.error === 'protected_default_brand' ? 'לא ניתן לבצע פעולה על מותג הפלטפורמה'
            : data?.error === 'brand_has_history' ? 'למותג יש היסטוריית משימות/כספים — יש להשתמש בארכיון'
            : data?.error === 'confirmation_required' ? 'נדרש אישור מפורש'
            : 'הפעולה נכשלה'
        );
        return false;
      }
      return true;
    } catch (e) {
      toast.error('הפעולה נכשלה');
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (brand.is_default) {
    return (
      <Section title="אזור מסוכן" desc="פעולות בלתי הפיכות על המותג.">
        <div style={{
          background: 'var(--surface-1)', border: '1px solid var(--border-1)',
          borderRadius: 12, padding: 14, display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <ShieldAlert size={18} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
            זהו מותג הפלטפורמה (Joba24). לא ניתן להשהות, להעביר לארכיון או למחוק אותו.
          </div>
        </div>
      </Section>
    );
  }

  const historyTotal = deps?.history_total ?? 0;
  const safeToDelete = deps?.safe_to_delete === true;

  return (
    <>
      <Section
        title="תלויות"
        desc="מה המותג הזה מחזיק בפועל. הנתונים קובעים אם ניתן למחוק אותו."
        actions={isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          {(deps?.counts || []).map((c) => (
            <div key={c.entity} style={{
              ...card, padding: 10,
              borderColor: c.count > 0 && c.blocking ? 'var(--color-warning-border)' : 'var(--border-1)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700 }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: c.count > 0 ? 'var(--text-1)' : 'var(--text-3)' }}>
                {c.count}{c.capped ? '+' : ''}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill tone="gray">דומיינים: {deps?.domains ?? 0}</Pill>
          <Pill tone="gray">הגדרות: {deps?.configs ?? 0}</Pill>
          <Pill tone="gray">קטגוריות: {deps?.categories ?? 0}</Pill>
          <Pill tone={safeToDelete ? 'green' : 'amber'}>
            {safeToDelete ? 'בטוח למחיקה' : 'קיים היסטוריה — מחיקה חסומה'}
          </Pill>
        </div>

        {!safeToDelete && (
          <div style={{
            background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
            borderRadius: 12, padding: 12, display: 'flex', gap: 9, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.65 }}>
              למותג יש <b>{historyTotal}</b> רשומות היסטוריות (משימות, בקשות, ג׳ובות, צ׳אט, דירוגים או התראות).
              מחיקה קשיחה תפגע בשלמות ההיסטוריה — יש להשתמש ב<b>ארכיון</b>.
            </div>
          </div>
        )}
      </Section>

      <Section title="השהה / הפעל" desc="השהיה מוציאה את המותג מהאוויר בלי למחוק דבר.">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {brand.status !== 'suspended' ? (
            <Btn variant="soft" loading={busy === 'suspend'}
              onClick={async () => { if (await run('suspend')) { refresh(); toast.success('המותג הושהה'); } }}
              style={{ background: '#fef3c7', color: '#92400e', border: 'none' }}>
              <PauseCircle size={15} /> השהה מותג
            </Btn>
          ) : (
            <Btn variant="success" loading={busy === 'activate'}
              onClick={async () => { if (await run('activate')) { refresh(); toast.success('המותג הופעל'); } }}>
              הפעל מותג
            </Btn>
          )}
        </div>
      </Section>

      <Section
        title="ארכיון"
        desc="ארכיון הוא המחיקה הרכה: המותג מפסיק לפעול וכל ההיסטוריה נשמרת."
      >
        <Btn variant="soft" loading={busy === 'archive'}
          onClick={async () => {
            if (!window.confirm(`להעביר את "${brand.name}" לארכיון? המותג יפסיק לפעול.`)) return;
            if (await run('archive')) { refresh(); toast.success('המותג הועבר לארכיון'); }
          }}
          style={{ background: '#fee2e2', color: '#991b1b', border: 'none', alignSelf: 'flex-start' }}>
          <Archive size={15} /> העבר לארכיון
        </Btn>
      </Section>

      <Section
        title="מחיקה קשיחה"
        desc="זמינה רק למותג ריק לחלוטין, ללא היסטוריית משימות או כספים."
      >
        {!safeToDelete ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
            מחיקה חסומה. השתמש בארכיון כדי להפסיק את פעילות המותג תוך שמירת ההיסטוריה.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
              לאישור, הקלד את המזהה <b style={mono}>{brand.slug}</b> בשדה שלמטה.
              הפעולה תמחק את המותג, ההגדרות, הדומיינים והקטגוריות שלו — ואינה ניתנת לביטול.
            </div>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={brand.slug}
              style={{
                height: 42, borderRadius: 11, border: '1px solid var(--border-1)',
                padding: '0 11px', fontSize: 14, outline: 'none',
                background: 'var(--surface-1)', color: 'var(--text-1)', ...mono, maxWidth: 320,
              }}
            />
            <Btn
              variant="danger"
              loading={busy === 'delete'}
              disabled={confirmText !== brand.slug}
              onClick={async () => {
                if (await run('delete', confirmText)) {
                  toast.success('המותג נמחק');
                  navigate('/admin?tab=brands');
                }
              }}
              style={{ alignSelf: 'flex-start' }}
            >
              <Trash2 size={15} /> מחק מותג לצמיתות
            </Btn>
          </>
        )}
      </Section>
    </>
  );
}