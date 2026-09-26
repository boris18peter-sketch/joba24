import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getDisplayName, validateDisplayName, NAME_MAX_LENGTH } from '@/lib/displayName';

/**
 * Bottom sheet for editing the profile display name.
 *
 * Writes the custom `display_name` field (the built-in `full_name` cannot be
 * changed — see lib/displayName.js), then refreshes the auth user so the new
 * name appears everywhere immediately.
 */
export default function EditNameSheet({ user, onClose, onSaved }) {
  const [value, setValue] = useState(getDisplayName(user));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const result = validateDisplayName(value);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.name === getDisplayName(user)) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await base44.auth.updateMe({ display_name: result.name });
      // Refresh the name already snapshotted on this user's still-open tasks, so
      // the feed and active chats show it immediately. Tasks that already ended
      // keep the name they were published under (invoices and history must not
      // change retroactively).
      try {
        await base44.entities.Task.updateMany(
          { client_id: user.id, status: 'OPEN' },
          { $set: { client_name: result.name } }
        );
        await base44.entities.Task.updateMany(
          { worker_id: user.id, status: 'OPEN' },
          { $set: { worker_name: result.name } }
        );
      } catch (backfillErr) {
        console.error('[EditNameSheet] task name refresh failed:', backfillErr?.message);
      }
      await onSaved?.();
      onClose();
    } catch (e) {
      setError('שמירת השם נכשלה, נסו שוב');
      setSaving(false);
    }
  };

  return createPortal(
    <div
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100001,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(5,15,40,0.65)', backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--sheet-bg)',
          borderRadius: '24px 24px 0 0',
          padding: '0 20px',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 18px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)' }}>עריכת שם</span>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} color="var(--text-2)" />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 16px' }}>
          השם הזה יוצג בכל מקום באפליקציה — בפוסטים שתפרסמו, בצ׳אטים ובפרופיל שלכם.
        </p>

        <input
          type="text"
          value={value}
          autoFocus
          maxLength={NAME_MAX_LENGTH}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          placeholder="השם שלכם"
          className="j-input"
          style={{
            height: 52, padding: '0 14px', fontWeight: 700,
            borderColor: error ? 'var(--color-danger)' : undefined,
          }}
        />

        {error && (
          <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 8, fontWeight: 600 }}>{error}</div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', height: 52, borderRadius: 16, marginTop: 18,
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            border: 'none', color: 'white', fontWeight: 900, fontSize: 15,
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(26,111,212,0.3)',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : 'שמירה'}
        </button>
      </div>
    </div>,
    document.body
  );
}