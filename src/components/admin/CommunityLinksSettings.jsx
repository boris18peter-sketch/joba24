import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Save, MessageCircle, Send, Facebook } from 'lucide-react';
import { toast } from 'sonner';

/**
 * CommunityLinksSettings — the addresses the app points to on the empty feed.
 *
 * A field left empty is simply not shown there, so nothing has to be filled in
 * for the app to work: filling one in is what publishes that link.
 */
const LINKS = [
  { key: 'whatsapp_url', label: 'קבוצת וואטסאפ', placeholder: 'https://chat.whatsapp.com/...', icon: MessageCircle },
  { key: 'telegram_url', label: 'ערוץ טלגרם', placeholder: 'https://t.me/...', icon: Send },
  { key: 'facebook_url', label: 'קבוצת פייסבוק', placeholder: 'https://facebook.com/groups/...', icon: Facebook },
];

export default function CommunityLinksSettings() {
  const { data: record, isLoading } = useQuery({
    queryKey: ['communityConfigAdmin'],
    queryFn: async () => {
      const list = await base44.entities.CommunityConfig.list('-updated_date', 1);
      return (list || [])[0] || null;
    },
    staleTime: 30000,
  });

  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const value = draft || {
    whatsapp_url: record?.whatsapp_url || '',
    telegram_url: record?.telegram_url || '',
    facebook_url: record?.facebook_url || '',
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        whatsapp_url: (value.whatsapp_url || '').trim(),
        telegram_url: (value.telegram_url || '').trim(),
        facebook_url: (value.facebook_url || '').trim(),
      };
      if (record?.id) await base44.entities.CommunityConfig.update(record.id, payload);
      else await base44.entities.CommunityConfig.create(payload);
      toast.success('קישורי הקהילה נשמרו');
      setDraft(null);
      window.dispatchEvent(new Event('community-config-updated'));
    } catch (e) {
      toast.error('שמירה נכשלה: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MessageCircle size={16} color="#1a6fd4" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>קישורי קהילה</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1, lineHeight: 1.4 }}>
            מוצגים בתחתית מסך "אין משימות". שדה ריק = הקישור לא מוצג.
          </div>
        </div>
      </div>

      {LINKS.map(({ key, label, placeholder, icon: Icon }) => (
        <div key={key} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon size={12} /> {label}
          </div>
          <input
            type="url"
            inputMode="url"
            dir="ltr"
            value={value[key]}
            placeholder={placeholder}
            onChange={(e) => setDraft({ ...value, [key]: e.target.value })}
            style={{
              width: '100%', height: 40, borderRadius: 10, boxSizing: 'border-box',
              border: '1px solid var(--border-1)', background: 'var(--surface-3)',
              color: 'var(--text-1)', padding: '0 10px', fontSize: 13,
            }}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        style={{
          width: '100%', height: 42, borderRadius: 11, border: 'none',
          background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white',
          fontWeight: 800, fontSize: 13.5, cursor: saving ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        שמור קישורים
      </button>
    </div>
  );
}