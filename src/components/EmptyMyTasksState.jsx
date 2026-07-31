import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/LanguageContext';
import { Plus, Sparkles } from 'lucide-react';

const EXAMPLES = [
  { emoji: '🎈', text: 'לנפח בלונים למסיבה' },
  { emoji: '🌹', text: 'להביא זר פרחים' },
  { emoji: '🚗', text: 'צריך טרמפ לאילת' },
  { emoji: '🔧', text: 'עזרה בהחלפת גלגל' },
  { emoji: '🔥', text: 'מנגליסט לשעתיים' },
  { emoji: '📦', text: 'עזרה בפינוי מחסן' },
  { emoji: '👶', text: 'בייביסיטר להערב' },
  { emoji: '🔋', text: 'הרכב לא מניע' },
  { emoji: '🐕', text: 'מישהו יוריד את הכלב' },
  { emoji: '🪑', text: 'הרכבת שידה מאיקאה' },
  { emoji: '🛒', text: 'קניות מהסופר' },
  { emoji: '🧹', text: 'ניקיון דירה 3 חדרים' },
  { emoji: '📺', text: 'תליית טלוויזיה' },
  { emoji: '🚚', text: 'הובלת ספה קטנה' },
  { emoji: '💻', text: 'עזרה בהתקנת מחשב' },
  { emoji: '📱', text: 'העברת מידע לטלפון' },
  { emoji: '🎂', text: 'איסוף עוגה דחוף' },
  { emoji: '🛠️', text: 'תיקון דלת' },
  { emoji: '🌿', text: 'גיזום גינה' },
  { emoji: '🎁', text: 'איסוף חבילה' },
  { emoji: '🏋️', text: 'מדריך כושר לבית' },
  { emoji: '📸', text: 'לצלם הצעת נישואין' },
  { emoji: '🚗', text: 'לקחת רכב לטסט' },
  { emoji: '🚗', text: 'שטיפת רכב' },
  { emoji: '💡', text: 'להחליף נברשת בתקרה' },
  { emoji: '🚪', text: 'לתקן ציר של דלת' },
  { emoji: '📺', text: 'לתלות טלוויזיה 65"' },
  { emoji: '📦', text: 'עזרה בפריקת ארגזים' },
  { emoji: '🧺', text: 'לעזור לקפל סל כביסה' },
  { emoji: '💧', text: 'לנקות חצר בלחץ מים' },
  { emoji: '🍕', text: 'איסוף פיצה דחוף' },
  { emoji: '🎸', text: 'להעביר שיעור גיטרה' },
  { emoji: '🧸', text: 'לתפור תיקון לצעצוע' },
  { emoji: '🎂', text: 'לאפות עוגה ליומהולדת' },
  { emoji: '🚲', text: 'תיקון אופניים' },
];

export default function EmptyMyTasksState() {
  const { t } = useLanguage();
  const scrollRef = useRef(null);

  // Gentle auto-scroll like the WhatsApp Meta AI suggestion strip
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf;
    let paused = false;

    const step = () => {
      if (!paused && el) {
        // RTL: scrollLeft is negative or we use scrollBy with positive dir
        // Reach end -> jump back to start for seamless loop
        const maxScroll = el.scrollWidth - el.clientWidth;
        // In RTL, scrollLeft starts at 0 and goes negative; normalize
        const current = Math.abs(el.scrollLeft);
        if (current >= maxScroll - 1) {
          el.scrollTo({ left: 0, behavior: 'auto' });
        } else {
          el.scrollBy({ left: -1.1, behavior: 'auto' }); // negative = forward in RTL
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('touchend', resume, { passive: true });
    el.addEventListener('pointerdown', pause);
    el.addEventListener('pointerup', resume);
    el.addEventListener('pointerleave', resume);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('touchend', resume);
      el.removeEventListener('pointerdown', pause);
      el.removeEventListener('pointerup', resume);
      el.removeEventListener('pointerleave', resume);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28 }}>
      {/* Hero — promoted subheadline as the large primary heading */}
      <div style={{ textAlign: 'center', padding: '0 20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(26,111,212,0.35)',
        }}>
          <Sparkles size={30} color="white" strokeWidth={2} />
        </div>
        <p style={{
          fontWeight: 900, color: '#0f1e40', margin: 0,
          fontSize: 24, lineHeight: 1.3, letterSpacing: -0.3,
          maxWidth: 320,
        }}>
          {t('no_active_tasks_sub')}
        </p>

        {/* Large, attractive Post Task button */}
        <Link to="/create-task" style={{ textDecoration: 'none', width: '100%', maxWidth: 340 }}>
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', height: 58, paddingInline: 28,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
            color: 'white', fontWeight: 800, fontSize: 17, border: 'none', cursor: 'pointer',
            boxShadow: '0 10px 28px rgba(26,111,212,0.4)',
            letterSpacing: 0.2,
          }}>
            <Plus size={22} strokeWidth={2.5} />
            {t('post_task_btn')}
          </button>
        </Link>
      </div>

      {/* Horizontally scrollable example chips — like WhatsApp Meta AI */}
      <div
        ref={scrollRef}
        dir="rtl"
        style={{
          width: '100%',
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          padding: '8px 16px 14px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {EXAMPLES.map((ex, i) => (
          <span
            key={i}
            style={{
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: '#ffffff',
              border: '1.5px solid #e2eaf5',
              borderRadius: 999,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 700,
              color: '#1e3a5f',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(26,111,212,0.08)',
            }}
          >
            <span style={{ fontSize: 16 }}>{ex.emoji}</span>
            {ex.text}
          </span>
        ))}
      </div>

      <p style={{ fontSize: 12, color: '#b0b8c8', marginTop: 2, fontWeight: 600, textAlign: 'center', padding: '0 24px' }}>
        {t('people_post_everything')}
      </p>
    </div>
  );
}