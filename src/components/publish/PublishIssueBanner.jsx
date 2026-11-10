import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ONE place the publish form explains itself.
 *
 * Until now a blocked publish showed a single red line that always said fields
 * were missing — even when nothing was missing and the form had refused for a
 * different reason (a rejected photo, a category the server did not accept, a
 * network failure). The publisher was left pressing the button with no idea
 * what to change, which is exactly how "nothing happens" is reported.
 *
 * `message` is the real reason when there is one; only when there is none does
 * the generic "some required fields are missing" line show. `onRetry` appears
 * only when the failure came back from the server, so a network hiccup is one
 * tap away from a working publish instead of a re-typed form.
 */
export default function PublishIssueBanner({ message, onRetry, onDismiss }) {
  if (!message) return null;

  return (
    <div style={{
      background: 'var(--color-danger-bg)',
      border: '1px solid var(--color-danger-border)',
      borderRadius: 16,
      padding: '12px 14px',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
    }}>
      <AlertTriangle size={16} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0, lineHeight: 1.6, fontWeight: 700 }}>
          {message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: 12.5, fontWeight: 800, color: 'var(--color-danger)',
            }}
          >
            <RefreshCw size={13} /> נסה לפרסם שוב
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 12, fontWeight: 700, padding: 0 }}
        >
          סגור
        </button>
      )}
    </div>
  );
}