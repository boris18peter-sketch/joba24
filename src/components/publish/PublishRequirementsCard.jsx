import { useState } from 'react';
import { CheckSquare, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import SectionCard from '@/components/publish/SectionCard';

/**
 * PublishRequirementsCard — the optional "extra requirements" block of the
 * publish form (invoice, people needed, tools, certificates…).
 *
 * Extracted from the form page unchanged: same questions, same order, same
 * behaviour. It owns only the open/closed state of the list; every answer stays
 * on the form's own `requirements` object, so publishing reads exactly what it
 * read before.
 */
export default function PublishRequirementsCard({
  requirements = {},
  requiresInvoice = false,
  onToggleInvoice,
  onToggleRequirement,
  onSetCustom,
  categories = [],
  suggested = [],
  t,
}) {
  const [open, setOpen] = useState(false);

  const selected = Object.entries(requirements).filter(([k, v]) => k !== 'custom' && v === true).length
    + (requirements.custom ? 1 : 0)
    + (requiresInvoice ? 1 : 0);

  return (
    <SectionCard>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: open ? 14 : 0 }}>
        <div>
          <Label className="text-sm font-bold flex items-center gap-1" style={{ color: 'var(--text-1)', cursor: 'pointer', margin: 0 }}>
            <CheckSquare size={14} /> {t('ct_extra_req')}
          </Label>
          <div style={{ fontSize: 11, color: '#f97316', fontWeight: 600, marginTop: 2 }}>{t('ct_req_warn')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {selected > 0
            ? <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--brand-primary-light)', color: 'var(--brand-primary)', borderRadius: 20, padding: '2px 8px', border: '1px solid var(--border-2)' }}>{t('ct_selected', { count: selected })}</span>
            : <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('ct_click_add')}</span>}
          {open ? <ChevronUp size={16} color="var(--text-2)" /> : <ChevronDown size={16} color="var(--text-2)" />}
        </div>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Invoice — always first */}
          <button type="button" onClick={onToggleInvoice}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', background: requiresInvoice ? '#faf5ff' : 'var(--surface-3)', border: `1.5px solid ${requiresInvoice ? '#d8b4fe' : 'var(--border-1)'}`, transition: 'all 0.15s' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: requiresInvoice ? '#7c3aed18' : 'var(--input-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${requiresInvoice ? '#d8b4fe' : 'var(--border-1)'}`,
            }}>
              <FileText size={18} color={requiresInvoice ? '#7c3aed' : 'var(--text-3)'} />
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: requiresInvoice ? '#7c3aed' : 'var(--text-1)' }}>{t('ct_invoice')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1 }}>{t('ct_invoice_help')}</div>
            </div>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${requiresInvoice ? '#7c3aed' : 'var(--border-1)'}`, background: requiresInvoice ? '#7c3aed' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {requiresInvoice && <span style={{ color: 'var(--brand-btn-primary-text, white)', fontSize: 11 }}>✓</span>}
            </div>
          </button>

          {categories.map(cat => (
            <div key={cat.label}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-2)', marginBottom: 8, letterSpacing: 0.3 }}>{cat.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {cat.items.map(({ key, label }) => {
                  const isSuggested = suggested.includes(key);
                  const isActive = !!requirements[key];
                  return (
                    <button key={key} onClick={() => onToggleRequirement(key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 12, textAlign: 'right', cursor: 'pointer', position: 'relative',
                        background: isActive ? 'rgba(59,130,246,0.08)' : isSuggested ? '#fffbeb' : 'var(--surface-3)',
                        border: `1px solid ${isActive ? 'var(--border-2)' : isSuggested ? '#fde68a' : 'var(--border-1)'}`,
                        transition: 'all 0.15s' }}>
                      <div style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${isActive ? 'var(--brand-primary)' : isSuggested ? '#f59e0b' : 'var(--border-1)'}`, background: isActive ? 'var(--brand-primary)' : isSuggested ? '#fffbeb' : 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isActive && <span style={{ color: 'var(--brand-btn-primary-text, white)', fontSize: 9, lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: isSuggested ? 700 : 600, color: isActive ? 'var(--brand-primary-dark)' : isSuggested ? '#92400e' : 'var(--text-2)' }}>{label}</span>
                      {isSuggested && !isActive && (
                        <span style={{ position: 'absolute', top: -6, left: -6, fontSize: 8, fontWeight: 800, color: 'var(--brand-btn-primary-text, white)', background: '#f59e0b', borderRadius: 99, padding: '1px 5px', boxShadow: '0 1px 4px rgba(245,158,11,0.4)' }}>{t('ct_recommended')}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>{t('ct_custom_req')}</div>
            <input type="text" placeholder={t('ct_custom_req_ph')}
              value={requirements.custom || ''} onChange={e => onSetCustom(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--input-bg)', border: '1px solid var(--border-1)', fontSize: 16, outline: 'none', boxSizing: 'border-box', color: 'var(--text-1)' }} />
          </div>
        </div>
      )}
    </SectionCard>
  );
}