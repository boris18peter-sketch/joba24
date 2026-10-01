import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Shared primitives for the Brand Manager (Admin → Brands → <Brand>).
 * Kept in one small module so every tab looks and behaves identically.
 */

export const card = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-1)',
  borderRadius: 16,
  padding: 16,
};

export const labelStyle = {
  fontSize: 11, fontWeight: 800, color: 'var(--text-3)',
  marginBottom: 5, display: 'block',
};

export const inputStyle = {
  width: '100%', height: 42, borderRadius: 11, border: '1px solid var(--border-1)',
  padding: '0 11px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  background: 'var(--surface-1)', color: 'var(--text-1)',
};

export const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };

export function Field({ label, hint, children, style }) {
  return (
    <div style={style}>
      <span style={labelStyle}>{label}</span>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

export function Section({ title, desc, actions, children }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-1)' }}>{title}</div>
          {desc && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, lineHeight: 1.55 }}>{desc}</div>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

const TONES = {
  green: { bg: '#dcfce7', color: '#166534' },
  amber: { bg: '#fef3c7', color: '#92400e' },
  red: { bg: '#fee2e2', color: '#991b1b' },
  blue: { bg: '#dbeafe', color: '#1d4ed8' },
  gray: { bg: 'var(--surface-3)', color: 'var(--text-2)' },
};

export function Pill({ tone = 'gray', children }) {
  const t = TONES[tone] || TONES.gray;
  return (
    <span style={{
      background: t.bg, color: t.color, fontSize: 11, fontWeight: 800,
      padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

export function Btn({ children, onClick, variant = 'primary', disabled, loading, style }) {
  const styles = {
    primary: { background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', border: 'none' },
    soft: { background: 'var(--surface-3)', color: 'var(--text-1)', border: '1px solid var(--border-1)' },
    danger: { background: '#fee2e2', color: '#991b1b', border: 'none' },
    success: { background: '#dcfce7', color: '#166534', border: 'none' },
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        height: 40, padding: '0 16px', borderRadius: 11, fontWeight: 800, fontSize: 13,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        opacity: disabled ? 0.5 : 1, ...styles, ...style,
      }}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : children}
    </button>
  );
}

/**
 * Invalidate everything a Brand edit can affect. BrandManager reads
 * `['adminBrand', id]`; the marketplace reads `['brandCategories', id]`.
 * Both must be refreshed or a save appears to do nothing.
 */
export function refreshBrand(queryClient, brandId) {
  queryClient.invalidateQueries({ queryKey: ['adminBrand', brandId] });
  queryClient.invalidateQueries({ queryKey: ['adminBrands'] });
  queryClient.invalidateQueries({ queryKey: ['adminBrandDependencies', brandId] });
  queryClient.invalidateQueries({ queryKey: ['brandCategories', brandId] });
  queryClient.invalidateQueries({ queryKey: ['brandDashboard', brandId] });
}

const SAVE_STATES = {
  idle: { text: '', tone: 'gray' },
  dirty: { text: 'שינויים שלא נשמרו', tone: 'amber' },
  saving: { text: 'שומר…', tone: 'blue' },
  saved: { text: 'נשמר', tone: 'green' },
  error: { text: 'שגיאה בשמירה', tone: 'red' },
};

/**
 * A persistent save bar. A Brand Studio section must always say where it
 * stands: unsaved, saving, saved or failed.
 */
export function SaveBar({ state = 'idle', onSave, onReset, label = 'שמור שינויים' }) {
  const meta = SAVE_STATES[state] || SAVE_STATES.idle;
  const busy = state === 'saving';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      position: 'sticky', bottom: 0, zIndex: 5,
      background: 'var(--surface-2)', border: '1px solid var(--border-1)',
      borderRadius: 14, padding: '10px 12px',
    }}>
      <span style={{ flex: 1, minWidth: 120 }}>
        {meta.text && <Pill tone={meta.tone}>{meta.text}</Pill>}
      </span>
      {onReset && state === 'dirty' && (
        <Btn variant="soft" onClick={onReset} style={{ height: 36, fontSize: 12 }}>בטל שינויים</Btn>
      )}
      <Btn onClick={onSave} loading={busy} disabled={state === 'idle' || state === 'saving'}
        style={{ height: 38, fontSize: 13 }}>
        {label}
      </Btn>
    </div>
  );
}

/** Colour picker + HEX value, kept in sync. */
export function ColorField({ label, value, onChange, fallback }) {
  const current = value || fallback || '#1a6fd4';
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(current) ? current : fallback || '#1a6fd4'}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 46, height: 42, borderRadius: 11, border: '1px solid var(--border-1)',
            background: 'var(--surface-1)', cursor: 'pointer', padding: 3, flexShrink: 0,
          }}
        />
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback || '#1a6fd4'}
          style={{ ...inputStyle, ...mono }}
        />
        {value && (
          <button onClick={() => onChange('')} title="נקה"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
            <X size={15} color="var(--text-3)" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Brand asset upload (logo / favicon).
 * Brand assets are shown to every visitor, so they are stored publicly — a
 * permanent public URL that never expires.
 */
export function BrandAssetUpload({ label, value, onChange, hint, height = 72 }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('יש לבחור קובץ תמונה'); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error('הקובץ גדול מדי (מקסימום 4MB)'); return; }
    setBusy(true);
    try {
      const res = await base44.integrations.Core.UploadPublicFile({ file });
      const url = res?.file_url || res?.data?.file_url;
      if (!url) throw new Error('no_url');
      onChange(url);
    } catch (e) {
      toast.error('העלאת הקובץ נכשלה');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{
          width: height, height, borderRadius: 12, flexShrink: 0,
          border: '1px dashed var(--border-2)', background: 'var(--surface-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          {value
            ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <Upload size={18} color="var(--text-3)" />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          <input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            style={{ ...inputStyle, fontSize: 12 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => pick(e.target.files?.[0])} />
            <Btn variant="soft" loading={busy} onClick={() => inputRef.current?.click()}
              style={{ height: 32, fontSize: 12 }}>
              <Upload size={13} /> העלה קובץ
            </Btn>
            {value && (
              <Btn variant="soft" onClick={() => onChange('')} style={{ height: 32, fontSize: 12 }}>
                <X size={13} /> הסר
              </Btn>
            )}
          </div>
        </div>
      </div>
      {hint && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}