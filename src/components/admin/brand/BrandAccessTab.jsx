import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, UserPlus, UserMinus, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Section, Btn, Pill, Field, inputStyle } from '@/components/admin/brand/brandUi';

/**
 * BrandAccessTab — who may open THIS Brand's dashboard.
 *
 * An explicit grant, deliberately separate from membership. Posting a task or
 * applying on a Brand makes someone a `member` automatically; that must never
 * hand them the Brand's numbers. Only a grant made here does, and revoking it
 * demotes the person back to member rather than erasing their real history.
 */
export default function BrandAccessTab({ brand }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['brandAccess', brand?.id],
    enabled: !!brand?.id,
    queryFn: async () => {
      const res = await base44.functions.invoke('adminManageBrandAccess', {
        action: 'list',
        brand_id: brand.id,
      });
      return res.data?.grants || [];
    },
  });

  const grants = data || [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['brandAccess', brand?.id] });

  const grant = async () => {
    const value = email.trim().toLowerCase();
    if (!value || busy) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke('adminManageBrandAccess', {
        action: 'grant',
        brand_id: brand.id,
        email: value,
      });
      if (res.data?.error) throw new Error(res.data.message || res.data.error);
      toast.success(`${res.data?.name || value} קיבל/ה גישה לדשבורד`);
      setEmail('');
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'הענקת הגישה נכשלה');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (grant) => {
    try {
      await base44.functions.invoke('adminManageBrandAccess', {
        action: 'revoke',
        brand_id: brand.id,
        membership_id: grant.id,
      });
      toast.success(`הגישה של ${grant.name || grant.email} בוטלה`);
      refresh();
    } catch {
      toast.error('ביטול הגישה נכשל');
    }
  };

  return (
    <Section
      title="גישה לדשבורד"
      desc="רק מי שמופיע כאן יכול לפתוח את הדשבורד של המותג. חברות רגילה (פרסום משימה או הגשה) אינה מעניקה גישה."
    >
      <Field label="הוספת משתמש לפי אימייל">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') grant(); }}
            placeholder="name@example.com"
            dir="ltr"
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          />
          <Btn onClick={grant} loading={busy} disabled={!email.trim()} style={{ height: 42 }}>
            <UserPlus size={15} /> הענק גישה
          </Btn>
        </div>
      </Field>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Loader2 size={20} className="animate-spin" color="var(--text-3)" />
        </div>
      ) : grants.length === 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--surface-1)', border: '1px dashed var(--border-2)',
          borderRadius: 12, padding: '14px 16px',
        }}>
          <KeyRound size={18} color="var(--text-3)" />
          <span style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.6 }}>
            אין עדיין מי שיש לו גישה לדשבורד של המותג הזה. מנהלי הפלטפורמה רואים אותו תמיד.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {grants.map((g) => (
            <div
              key={g.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--surface-1)', border: '1px solid var(--border-1)',
                borderRadius: 12, padding: '10px 12px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.name || '—'}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', direction: 'ltr', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.email}
                </div>
              </div>
              {g.status === 'suspended'
                ? <Pill tone="amber">מושהה</Pill>
                : <Pill tone="green">גישה פעילה</Pill>}
              <Btn variant="danger" onClick={() => revoke(g)} style={{ height: 34, fontSize: 12, padding: '0 12px' }}>
                <UserMinus size={14} /> בטל
              </Btn>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
        ביטול גישה מוריד את המשתמש בחזרה לחבר רגיל — ההיסטוריה והפעילות שלו במותג נשמרות.
      </p>
    </Section>
  );
}