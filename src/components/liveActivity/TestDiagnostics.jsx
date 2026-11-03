import { useState } from 'react';
import { ChevronDown, Copy, Check } from 'lucide-react';

/** Never show a raw token: first and last six characters only. */
function maskToken(token) {
  if (!token) return '';
  if (token.length <= 14) return '•'.repeat(token.length);
  return `${token.slice(0, 6)}…${token.slice(-6)}`;
}

const LABEL = { fontSize: 11.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.2, marginBottom: 6 };

/**
 * The technical half of the test screen: push-token and the operation log.
 * Collapsed by default and never in the main flow — the screen is a tool, not a
 * developer console.
 */
export default function TestDiagnostics({ log = [], token = '' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (insecure context / permissions): the masked value
      // still tells the operator whether a token arrived.
    }
  };

  return (
    <div className="j-card" style={{ padding: 14 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--text-1)', fontSize: 14, fontWeight: 800,
        }}
      >
        <span>אבחון מתקדם</span>
        <ChevronDown
          size={16}
          style={{ color: 'var(--text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        />
      </button>

      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={LABEL}>טוקן דחיפה של הפעילות</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{
                flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--text-2)',
                background: 'var(--surface-3)', border: '1px solid var(--border-1)',
                borderRadius: 10, padding: '9px 10px', direction: 'ltr', textAlign: 'left',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {token ? maskToken(token) : 'טרם התקבל'}
              </code>
              {token && (
                <button
                  onClick={copyToken}
                  aria-label="העתק טוקן"
                  className="j-btn j-btn-secondary"
                  style={{ height: 40, width: 44, flexShrink: 0, borderRadius: 10 }}
                >
                  {copied ? <Check size={15} color="var(--color-success)" /> : <Copy size={15} />}
                </button>
              )}
            </div>
          </div>

          <div>
            <div style={LABEL}>יומן פעולות</div>
            <div style={{
              background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 12,
              padding: '10px 12px', maxHeight: 190, overflowY: 'auto',
            }}>
              {log.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>אין רשומות עדיין</div>
              ) : log.map((line, index) => (
                <div key={`${index}-${line.slice(0, 12)}`} style={{
                  fontSize: 11, color: 'var(--text-2)', padding: '3px 0',
                  wordBreak: 'break-word', direction: 'rtl', textAlign: 'right',
                }}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}