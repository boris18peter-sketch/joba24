import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Mobile-friendly bottom-sheet selector replacing native <select>.
 * Props:
 *   value       - current value
 *   options     - [{ value, label }]
 *   onChange    - (value) => void
 *   placeholder - string shown in trigger when nothing selected
 *   label       - optional label above trigger
 */
export default function SelectionSheet({ value, options, onChange, placeholder = 'בחר...', label }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => String(o.value) === String(value));

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>{label}</div>
      )}
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%', height: 48, borderRadius: 12,
          background: 'var(--input-bg)', border: '1.5px solid var(--border-1)',
          paddingRight: 14, paddingLeft: 12,
          fontSize: 14, fontFamily: 'inherit', color: selected ? 'var(--text-1)' : 'var(--text-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', direction: 'rtl', textAlign: 'right',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={16} color="var(--text-3)" />
      </button>

      {/* Sheet portal */}
      {open && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(5,15,40,0.60)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            dir="rtl"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--sheet-bg)',
              borderRadius: '28px 28px 0 0',
              width: '100%', maxWidth: 480,
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
              boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
              animation: 'sheetSlideUp 0.28s cubic-bezier(0.34,1.4,0.64,1) both',
              maxHeight: '75dvh', display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 12px', flexShrink: 0 }} />

            {/* Options list */}
            <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              {options.map((opt) => {
                const isActive = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      width: '100%', padding: '14px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 15, fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'hsl(var(--primary))' : 'var(--text-1)',
                      borderBottom: '1px solid var(--border-1)',
                      textAlign: 'right', direction: 'rtl',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <span>{opt.label}</span>
                    {isActive && <Check size={17} color="hsl(var(--primary))" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}