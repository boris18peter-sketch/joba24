import { useState } from 'react';

const SCREENSHOTS = {
  share: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/6309c5874_IMG_1114.jpg',
  addToHome: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d37ae4d92_IMG_1115.jpg',
  addDialog: 'https://media.base44.com/images/public/69e6bdb4986a04a256653a23/da1318c8f_IMG_1118.jpg',
};

export default function InstallGuide({ isIOS, isPWA }) {
  const [open, setOpen] = useState(false);

  if (isPWA) {
    return (
      <div style={{
        background: 'rgba(52,211,153,0.08)', border: '1.5px solid rgba(52,211,153,0.4)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: 'rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(52,211,153,0.4)',
        }}>
          <span style={{ fontSize: 18 }}>✅</span>
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399' }}>האפליקציה מותקנת!</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>האייקון נמצא במסך הבית שלך.</div>
        </div>
      </div>
    );
  }

  const iosSteps = [
    { num: 1, title: 'לחץ על כפתור השיתוף', desc: 'בתחתית Safari, לחץ על סמל השיתוף (ריבוע עם חץ)', img: SCREENSHOTS.share },
    { num: 2, title: 'בחר "הוספה למסך הבית"', desc: 'גלול בתפריט ובחר באפשרות "הוספה למסך הבית"', img: SCREENSHOTS.addToHome },
    { num: 3, title: 'לחץ "הוספה"', desc: 'אשר את הוספת האייקון למסך הבית', img: SCREENSHOTS.addDialog },
  ];

  const androidSteps = [
    { num: 1, title: 'לחץ על תפריט הדפדפן', desc: 'לחץ על סמל שלוש הנקודות (⋮) בדפדפן Chrome' },
    { num: 2, title: 'בחר "הוסף למסך הבית"', desc: 'מהתפריט, בחר "Add to Home screen"' },
    { num: 3, title: 'לחץ "הוסף"', desc: 'אשר את הוספת האייקון' },
  ];

  const steps = isIOS ? iosSteps : androidSteps;

  return (
    <div style={{ marginBottom: 10 }}>
      {/* Install card */}
      <div style={{
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        border: '1.5px solid rgba(255,255,255,0.12)',
        borderRadius: 14, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <span style={{ fontSize: 18 }}>📱</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'white', marginBottom: 2 }}>התקן את האפליקציה למסך הבית</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
            התקן כדי לקבל התראות push וחוויה מלאה
          </div>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            padding: '8px 14px', borderRadius: 10, flexShrink: 0,
            background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)',
            color: '#fbbf24', fontSize: 12, fontWeight: 800, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}
        >
          {open ? 'הסתר' : 'הצג'}
          <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Dropdown guide */}
      {open && (
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '14px', marginTop: 8,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
            {isIOS ? 'הוראות התקנה (iPhone):' : 'הוראות התקנה (Android):'}
          </div>
          {steps.map((step, i) => (
            <div key={i} style={{ marginBottom: i < steps.length - 1 ? 16 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: '#fbbf24',
                }}>{step.num}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{step.title}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{step.desc}</div>
                </div>
              </div>
              {step.img && (
                <div style={{
                  borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
                  marginBottom: 4, maxWidth: 220,
                }}>
                  <img src={step.img} alt={`שלב ${step.num}`} style={{ width: '100%', display: 'block' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}