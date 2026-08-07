import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/lib/LanguageContext';
import { getFaqs } from '@/lib/faqContent';

function getCategories(t) {
  return [
    { id: 'general',   label: t('faq_cat_general') },
    { id: 'publish',   label: t('faq_cat_publish') },
    { id: 'worker',    label: t('faq_cat_worker') },
    { id: 'credits',   label: t('faq_cat_credits') },
    { id: 'payment',   label: t('faq_cat_payment') },
    { id: 'trust',     label: t('faq_cat_trust') },
    { id: 'features',  label: t('faq_cat_features') },
  ];
}

// Localized Q&A is now provided by getFaqs(lang) — see usage in the page component below.

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  const { isRTL } = useLanguage();
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 16, border: `1px solid ${open ? '#bfdbfe' : 'var(--border-1)'}` , overflow: 'hidden', boxShadow: open ? '0 4px 16px rgba(26,111,212,0.1)' : '0 1px 6px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: open ? 'var(--surface-3)' : 'none', border: 'none', cursor: 'pointer', textAlign: isRTL ? 'right' : 'left', gap: 12, transition: 'background 0.2s' }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: open ? '#1a6fd4' : 'var(--text-1)', flex: 1 }}>{q}</span>
        <ChevronDown size={18} color="#1a6fd4" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.85, whiteSpace: 'pre-line' }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState('general');
  const { t, isRTL, lang } = useLanguage();
  const categories = getCategories(t);
  const faqs = getFaqs(lang);
  const filtered = faqs.filter(f => f.cat === activeCategory);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-1)' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader title={t('faq_title')} />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '28px 20px 24px' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 900, marginBottom: 6 }}>{t('faq_title')}</h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{t('faq_sub')}</p>
      </div>

      {/* Category Tabs */}
      <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: activeCategory === c.id ? '#1a6fd4' : 'var(--surface-3)',
                color: activeCategory === c.id ? 'white' : 'var(--text-2)',
                boxShadow: activeCategory === c.id ? '0 2px 8px rgba(26,111,212,0.3)' : 'none',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} />
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '0 20px 40px', fontSize: 13, color: '#94a3b8' }}>
        {t('faq_contact')}
      </div>
    </div>
  );
}