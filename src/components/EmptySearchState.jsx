/**
 * EmptySearchState — shown when search/filter returns 0 tasks
 */
import { SearchX } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function EmptySearchState({ hasFilters, onReset }) {
  const { t } = useLanguage();

  return (
    <>
      <style>{`
        @keyframes emptyFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes emptyIconFloat {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-6px); }
        }
      `}</style>

      <div
        dir="rtl"
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '52px 24px 32px',
          animation: 'emptyFadeUp 0.4s ease-out both',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 76, height: 76, borderRadius: '50%',
          background: 'var(--surface-3)',
          border: '2px solid var(--border-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          animation: 'emptyIconFloat 3s ease-in-out infinite',
        }}>
          <SearchX size={30} color="var(--text-3)" strokeWidth={1.4} />
        </div>

        {/* Title */}
        <p style={{
          fontWeight: 900, fontSize: 18,
          color: 'var(--text-1)', margin: '0 0 8px', textAlign: 'center',
          lineHeight: 1.35,
        }}>
          {t('no_tasks')}
        </p>

        {/* Subtitle */}
        <p style={{
          fontSize: 13, color: 'var(--text-3)', margin: '0 0 24px',
          textAlign: 'center', lineHeight: 1.6, maxWidth: 260,
        }}>
          {t('no_tasks_sub')}
        </p>

        {/* Reset button — only if filter is active */}
        {hasFilters && (
          <button
            onClick={onReset}
            style={{
              padding: '11px 28px',
              borderRadius: 'var(--r-full)',
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              color: 'white', border: 'none',
              fontSize: 14, fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(26,111,212,0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,111,212,0.2)'; }}
            onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,111,212,0.35)'; }}
            onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,111,212,0.35)'; }}
          >
            {t('filter')}
          </button>
        )}
      </div>
    </>
  );
}