import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Coins, Gift, Sparkles, Zap, Star, TrendingUp, Save, RotateCcw, Loader2, UserPlus, Megaphone, Hammer, Rocket, Apple, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

// JobaSettings — single source of truth for all credit/bonus charges and the launch gate.
const FIELDS = [
  {
    key: 'signup_bonus',
    label: 'בונוס הצטרפות',
    desc: 'ג\'ובות שמקבל כל משתמש חדש עם ההרשמה',
    icon: <Gift size={15} color="#d97706" />,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    key: 'referral_signup_bonus',
    label: 'בונוס הפניה (סוכן)',
    desc: 'ג\'ובות נוספים שמקבל משתמש שהגיע דרך קישור סוכן (מתווסף לבונוס הבסיסי)',
    icon: <UserPlus size={15} color="#7c3aed" />,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  {
    key: 'profile_completion_bonus',
    label: 'בונוס מילוי פרופיל',
    desc: 'ג\'ובות שמקבל משתמש שמשלים את פרופיל העובד בהצטרפות. 0 = מבוטל.',
    icon: <Hammer size={15} color="#0891b2" />,
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
  },
  {
    key: 'application_fee_percent',
    label: 'עלות הגשת בקשה (%)',
    desc: 'אחוז ממחיר המשימה שנגבה מעובד על כל הגשת בקשה',
    icon: <TrendingUp size={15} color="#1a6fd4" />,
    color: '#1a6fd4',
    bg: '#eff6ff',
    border: '#bfdbfe',
    suffix: '%',
  },
  {
    key: 'application_fee_min',
    label: 'מינימום חיוב הגשה',
    desc: 'מינימום ג\'ובות לחיוב הגשת בקשה (גם אם האחוז יוצא פחות)',
    icon: <TrendingUp size={15} color="#0891b2" />,
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
  },
  {
    key: 'story_cost',
    label: 'עלות פרסום סטורי',
    desc: 'ג\'ובות שנגבות על פרסום משימה כסטורי',
    icon: <Megaphone size={15} color="#a855f7" />,
    color: '#a855f7',
    bg: '#fdf4ff',
    border: '#e9d5ff',
  },
  {
    key: 'boost_cost',
    label: 'עלות איתות (Boost)',
    desc: 'ג\'ובות שנגבות על איתות נוסף של משימה',
    icon: <Zap size={15} color="#f59e0b" />,
    color: '#f59e0b',
    bg: '#fff7ed',
    border: '#fed7aa',
  },
  {
    key: 'loyalty_reward_percent',
    label: 'בונוס לויאלטי (%)',
    desc: 'אחוז מהג\'ובות שחויבו שמוחזר כבונוס על דירוג 5 כוכבים',
    icon: <Star size={15} color="#d97706" />,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    suffix: '%',
  },
  {
    key: 'loyalty_reward_min',
    label: 'מינימום בונוס לויאלטי',
    desc: 'מינימום ג\'ובות שיוחזרו כבונוס לויאלטי (גם אם האחוז יוצא פחות)',
    icon: <Star size={15} color="#16a34a" />,
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
];

const DEFAULTS = {
  signup_bonus: 60,
  referral_signup_bonus: 40,
  profile_completion_bonus: 0,
  application_fee_percent: 5,
  application_fee_min: 1,
  story_cost: 10,
  boost_cost: 5,
  loyalty_reward_percent: 10,
  loyalty_reward_min: 1,
  pre_launch_gate_active: true,
  app_store_url: '',
  google_play_url: '',
  store_buttons_enabled: true,
};

function SettingRow({ field, value, onChange }) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);

  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: `1px solid ${field.border}`, padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: field.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {field.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{field.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1, lineHeight: 1.4 }}>{field.desc}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <input
          type="number"
          min={0}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            const n = Math.max(0, Number(local) || 0);
            setLocal(n);
            onChange(field.key, n);
          }}
          style={{
            width: 100, height: 40, borderRadius: 10, border: `1.5px solid ${field.border}`,
            background: 'var(--surface-3)', color: 'var(--text-1)',
            fontSize: 18, fontWeight: 800, textAlign: 'center', outline: 'none', boxSizing: 'border-box',
            padding: 0,
          }}
        />
        {field.suffix && <span style={{ fontSize: 16, fontWeight: 800, color: field.color }}>{field.suffix}</span>}
        <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 4 }}>ג'ובות</span>
      </div>
    </div>
  );
}

export default function JobaSettingsTab() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [draft, setDraft] = useState({ ...DEFAULTS });

  const { data: settingsRecord, isLoading } = useQuery({
    queryKey: ['jobaSettings'],
    queryFn: async () => {
      const list = await base44.entities.JobaSettings.list('-updated_date', 5);
      return list[0] || null;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (settingsRecord) {
      const merged = { ...DEFAULTS };
      FIELDS.forEach(f => {
        const v = settingsRecord[f.key];
        if (v !== undefined && v !== null) merged[f.key] = Number(v);
      });
      merged.pre_launch_gate_active = settingsRecord.pre_launch_gate_active !== false;
      merged.app_store_url = settingsRecord.app_store_url || '';
      merged.google_play_url = settingsRecord.google_play_url || '';
      merged.store_buttons_enabled = settingsRecord.store_buttons_enabled !== false;
      setDraft(merged);
      setHasChanges(false);
    }
  }, [settingsRecord]);

  const handleChange = (key, val) => {
    setDraft(prev => ({ ...prev, [key]: val }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        signup_bonus: Number(draft.signup_bonus),
        referral_signup_bonus: Number(draft.referral_signup_bonus),
        profile_completion_bonus: Number(draft.profile_completion_bonus),
        application_fee_percent: Number(draft.application_fee_percent),
        application_fee_min: Number(draft.application_fee_min),
        story_cost: Number(draft.story_cost),
        boost_cost: Number(draft.boost_cost),
        loyalty_reward_percent: Number(draft.loyalty_reward_percent),
        loyalty_reward_min: Number(draft.loyalty_reward_min),
        pre_launch_gate_active: draft.pre_launch_gate_active !== false,
        app_store_url: String(draft.app_store_url || ''),
        google_play_url: String(draft.google_play_url || ''),
        store_buttons_enabled: draft.store_buttons_enabled !== false,
        updated_by: me?.full_name || 'admin',
      };
      if (settingsRecord?.id) {
        await base44.entities.JobaSettings.update(settingsRecord.id, payload);
      } else {
        await base44.entities.JobaSettings.create(payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['jobaSettings'] });
      setHasChanges(false);
      toast.success('הגדרות הג\'ובות נשמרו — בתוקף מיידי');
    } catch (e) {
      toast.error('שגיאה בשמירה: ' + (e.message || ''));
    }
    setSaving(false);
  };

  const handleReset = () => {
    setDraft({ ...DEFAULTS });
    setHasChanges(true);
    toast('אופס לברירות מחדל — לחץ שמור כדי להחיל');
  };

  return (
    <div>
      {/* Info banner */}
      <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1.5px solid #fde68a', borderRadius: 14, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Coins size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
          כל הערכים כאן הם <strong>המקור היחיד</strong> לחיובי הג'ובות במערכת. שינוי ושמירה משפיעים <strong>מיידית</strong> על כל הזרימות — בונוס הצטרפות, חיובי בקשות/סטורי/בוסט ובונוס לויאלטי.
        </div>
      </div>

      {/* Live preview — signup bonus */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Gift size={14} color="#d97706" /> תצוגת בונוס הצטרפות (חי)
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: '#fffbeb', borderRadius: 10, padding: '8px 10px', border: '1px solid #fde68a', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#b45309', fontWeight: 700 }}>משתמש רגיל</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#d97706', marginTop: 2 }}>{draft.signup_bonus}</div>
            <div style={{ fontSize: 9, color: '#b45309' }}>ג'ובות</div>
          </div>
          <div style={{ flex: 1, background: '#f5f3ff', borderRadius: 10, padding: '8px 10px', border: '1px solid #ddd6fe', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#6d28d9', fontWeight: 700 }}>דרך סוכן</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#7c3aed', marginTop: 2 }}>{Number(draft.signup_bonus) + Number(draft.referral_signup_bonus)}</div>
            <div style={{ fontSize: 9, color: '#6d28d9' }}>ג'ובות ({draft.signup_bonus}+{draft.referral_signup_bonus})</div>
          </div>
        </div>
      </div>

      {/* Launch mode toggle — controls the pre-launch waiting page gate */}
      <div style={{
        background: draft.pre_launch_gate_active ? '#fffbeb' : '#f0fdf4',
        border: `1.5px solid ${draft.pre_launch_gate_active ? '#fde68a' : '#bbf7d0'}`,
        borderRadius: 14, padding: '14px', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: draft.pre_launch_gate_active ? 'rgba(217,119,6,0.12)' : 'rgba(22,163,74,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Rocket size={18} color={draft.pre_launch_gate_active ? '#d97706' : '#16a34a'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)' }}>מצב השקה</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.45 }}>
            {draft.pre_launch_gate_active
              ? 'דלוק — משתמשים חדשים רואים דף המתנה עד לאישור (מצב קדם-השקה).'
              : 'כבוי — האפליקציה פתוחה לחלוקה ציבורית. כולם נכנסים ישר (לבדיקת App Store).'}
          </div>
        </div>
        <Switch
          checked={draft.pre_launch_gate_active}
          onCheckedChange={(checked) => handleChange('pre_launch_gate_active', checked)}
        />
      </div>

      {/* Store download buttons — server-driven links + visibility */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Apple size={15} color="#16a34a" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>כפתורי הורדה (App Store / Google Play)</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1, lineHeight: 1.4 }}>
              מתעדכן מרחוק — ללא build מחדש. ריק = הכפתור מוסתר.
            </div>
          </div>
        </div>

        {/* Visibility toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, background: draft.store_buttons_enabled ? '#f0fdf4' : 'var(--surface-3)', border: `1.5px solid ${draft.store_buttons_enabled ? '#bbf7b0' : 'var(--border-1)'}`, marginBottom: 10 }}>
          <Eye size={16} color={draft.store_buttons_enabled ? '#16a34a' : 'var(--text-3)'} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>
            {draft.store_buttons_enabled ? 'מציג כפתורים באפליקציה' : 'כפתורים מוסתרים'}
          </div>
          <Switch checked={draft.store_buttons_enabled} onCheckedChange={(c) => handleChange('store_buttons_enabled', c)} />
        </div>

        {/* App Store URL */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4 }}>קישור App Store</div>
          <input
            type="url"
            placeholder="https://apps.apple.com/.../id..."
            value={draft.app_store_url}
            onChange={(e) => handleChange('app_store_url', e.target.value)}
            style={{ width: '100%', height: 40, borderRadius: 10, border: '1.5px solid var(--border-1)', background: 'var(--surface-3)', color: 'var(--text-1)', fontSize: 13, padding: '0 12px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>
        {/* Google Play URL */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4 }}>קישור Google Play</div>
          <input
            type="url"
            placeholder="https://play.google.com/store/apps/details?id=..."
            value={draft.google_play_url}
            onChange={(e) => handleChange('google_play_url', e.target.value)}
            style={{ width: '100%', height: 40, borderRadius: 10, border: '1.5px solid var(--border-1)', background: 'var(--surface-3)', color: 'var(--text-1)', fontSize: 13, padding: '0 12px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Settings rows */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={24} className="animate-spin" color="#1a6fd4" />
        </div>
      ) : (
        FIELDS.map(field => (
          <SettingRow key={field.key} field={field} value={draft[field.key]} onChange={handleChange} />
        ))
      )}

      {/* Save / Reset */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, position: 'sticky', bottom: 0, background: 'var(--surface-1)', padding: '10px 0' }}>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          style={{
            flex: 1, height: 46, borderRadius: 12, border: 'none', cursor: (saving || !hasChanges) ? 'not-allowed' : 'pointer',
            background: hasChanges ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : '#c9d6e8', color: 'white',
            fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> שמור הגדרות</>}
        </button>
        <button
          onClick={handleReset}
          style={{
            height: 46, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border-1)',
            background: 'var(--surface-2)', color: 'var(--text-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <RotateCcw size={14} /> אפס
        </button>
      </div>
    </div>
  );
}