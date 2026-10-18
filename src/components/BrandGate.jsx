import { useBrand } from '@/lib/brand/BrandProvider';
import AppLoading from '@/components/AppLoading';

const shell = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f2f5fb',
  padding: 24,
};

/**
 * BrandGate — renders the app only on a surface that resolves to a live Brand.
 *
 * An unknown hostname gets a neutral notice and NO marketplace data; a
 * suspended or archived Brand gets its own notice. This is what stops an
 * unregistered production domain from silently serving Joba24.
 */
export default function BrandGate({ children }) {
  const { isLoading, isUnknown, isUnavailable, brand } = useBrand();

  if (isLoading) {
    return <AppLoading />;
  }

  if (isUnknown) {
    return (
      <div style={shell}>
        <div style={{ textAlign: 'center', maxWidth: 420 }} dir="rtl">
          <div style={{ fontSize: 44, marginBottom: 14 }}>🌐</div>
          <div style={{ fontSize: 19, fontWeight: 900, color: '#0f2b6b', marginBottom: 8 }}>
            הכתובת הזו אינה מזוהה
          </div>
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            הדומיין שאליו הגעת אינו משויך לאף מותג פעיל.
            <br />
            אם הגעת לכאן בטעות, נסה שוב מהקישור הרשמי.
          </div>
        </div>
      </div>
    );
  }

  if (isUnavailable) {
    return (
      <div style={shell}>
        <div style={{ textAlign: 'center', maxWidth: 420 }} dir="rtl">
          <div style={{ fontSize: 44, marginBottom: 14 }}>⏸️</div>
          <div style={{ fontSize: 19, fontWeight: 900, color: '#0f2b6b', marginBottom: 8 }}>
            {brand?.name || 'המותג'} אינו זמין כרגע
          </div>
          <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            המותג הזה מושהה או בארכיון.
          </div>
        </div>
      </div>
    );
  }

  return children;
}