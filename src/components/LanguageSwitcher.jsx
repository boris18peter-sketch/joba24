import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { LANGUAGES } from '@/lib/i18n';

export default function LanguageSwitcher({ onClose }) {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  const handleSelect = (code) => {
    setLang(code);
    setOpen(false);
    onClose?.();
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 16px',
          background: open ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          cursor: 'pointer',
          color: '#bfdbfe',
          fontWeight: 600,
          fontSize: 14,
          transition: 'background 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Globe size={16} color="#60a5fa" />
          <span style={{ color: '#93c5fd', fontSize: 13, fontWeight: 500 }}>{t('language')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{current.flag}</span>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{current.label}</span>
          <ChevronDown size={14} color="#60a5fa" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: 0, right: 0,
          background: 'linear-gradient(180deg, #0f2b6b, #0a1f4e)',
          border: '1px solid rgba(96,165,250,0.25)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.4)',
          zIndex: 10010,
          animation: 'langDropIn 0.18s cubic-bezier(0.34,1.4,0.64,1)',
        }}>
          {LANGUAGES.map((language) => {
            const active = lang === language.code;
            return (
              <button
                key={language.code}
                onClick={() => handleSelect(language.code)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: active ? 'rgba(96,165,250,0.15)' : 'transparent',
                  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  color: active ? '#60a5fa' : '#bfdbfe',
                  fontSize: 14, fontWeight: active ? 700 : 500,
                  transition: 'background 0.12s',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{language.flag}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{language.label}</div>
                    <div style={{ fontSize: 10, color: 'rgba(147,197,253,0.6)', fontWeight: 400 }}>
                      {language.rtl ? 'RTL' : 'LTR'}
                    </div>
                  </div>
                </div>
                {active && <Check size={16} color="#60a5fa" />}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes langDropIn {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}