import { ChevronRight, Camera, Calendar, Banknote, Check } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';

const CHOSEN = 'handyman';
const SHOWN = ['cleaning', 'handyman', 'moving', 'pets', 'delivery', 'tutoring', 'electricity', 'gardening'];

/**
 * FRAME 04 — "פרסמו משימה בקלות"
 * The real publish flow: the app's own category list, its own input treatment
 * and its own photo step. One screen, three taps, no long form.
 */
export default function PostTaskScreen() {
  return (
    <>
      <div
        style={{
          height: 56,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          background: 'var(--surface-2)',
          boxShadow: '0 1px 0 var(--border-1)',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: 'var(--surface-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={18} color="var(--text-2)" />
        </div>
        <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text-1)' }}>פרסום משימה</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--surface-1)', padding: 14 }}>
        {/* What do you need */}
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-2)', marginBottom: 6 }}>
          מה צריך לעשות?
        </div>
        <div
          style={{
            background: 'var(--surface-2)',
            border: '1.5px solid var(--brand-primary)',
            borderRadius: 'var(--r-md)',
            padding: '12px 14px',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-1)',
            boxShadow: '0 0 0 3px rgba(26,111,212,0.10)',
          }}
        >
          הרכבת ארון בגדים חדש
        </div>

        {/* Category */}
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-2)', margin: '14px 0 6px' }}>
          קטגוריה
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SHOWN.map(value => {
            const cat = CATEGORIES.find(c => c.value === value);
            const on = value === CHOSEN;
            return (
              <span
                key={value}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '7px 11px',
                  borderRadius: 999,
                  background: on ? 'var(--brand-primary)' : 'var(--surface-2)',
                  color: on ? '#ffffff' : 'var(--text-2)',
                  border: `1px solid ${on ? 'var(--brand-primary)' : 'var(--border-1)'}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {cat?.label || value}
              </span>
            );
          })}
        </div>

        {/* Photo + when — two real steps side by side */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <div
            style={{
              flex: 1,
              height: 84,
              borderRadius: 'var(--r-md)',
              border: '1.5px dashed #bfdbfe',
              background: '#f8faff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Camera size={20} color="#1a6fd4" strokeWidth={1.9} />
            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#1a6fd4' }}>הוספת תמונה</span>
          </div>
          <div
            style={{
              flex: 1,
              height: 84,
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border-1)',
              background: 'var(--surface-2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Calendar size={20} color="var(--text-2)" strokeWidth={1.9} />
            <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text-2)' }}>מתי נוח?</span>
          </div>
        </div>

        {/* Price */}
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-2)', margin: '14px 0 6px' }}>
          המחיר שאתם מציעים
        </div>
        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-1)',
            borderRadius: 'var(--r-md)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-1)', letterSpacing: -0.5 }}>₪350</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>לתשלום במזומן</span>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 800,
              color: '#059669',
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 999,
              padding: '4px 9px',
            }}
          >
            <Banknote size={11} /> מחיר הוגן לאזור
          </span>
        </div>

        {/* Publish */}
        <div
          style={{
            marginTop: 16,
            height: 52,
            borderRadius: 'var(--r-md)',
            background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 6px 20px rgba(26,111,212,0.34)',
          }}
        >
          <Check size={18} strokeWidth={3} /> פרסום המשימה
        </div>

        <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>
          הפרסום בחינם. אנשים מתאימים באזור יגישו בקשה.
        </div>
      </div>
    </>
  );
}