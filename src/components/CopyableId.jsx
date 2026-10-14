import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';

/**
 * CopyableId — shows an ID and copies it when the element itself is clicked.
 *
 * The whole element is the tap target (not just the icon): an admin grabbing a
 * user/task ID for support should be able to click anywhere on it. Feedback is
 * inline — the icon flips to a check and a short "הועתק" label appears.
 */
export default function CopyableId({ id, label = 'ID', fontSize = 10, color = 'var(--text-3)', style }) {
  const [copied, setCopied] = useState(false);
  if (!id) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    e.preventDefault();
    copyToClipboard(id).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`העתק ${label || 'מזהה'}`}
      dir="ltr"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: copied ? 'var(--color-success-bg)' : 'transparent',
        border: `1px solid ${copied ? 'var(--color-success-border)' : 'transparent'}`,
        borderRadius: 6, padding: '1px 5px', cursor: 'pointer',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize, lineHeight: 1.5, maxWidth: '100%',
        color: copied ? 'var(--color-success)' : color,
        minHeight: 'unset', minWidth: 'unset',
        ...style,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label ? `${label}: ` : ''}{id}
      </span>
      {copied ? <Check size={11} style={{ flexShrink: 0 }} /> : <Copy size={11} style={{ flexShrink: 0 }} />}
      {copied && (
        <span style={{ fontFamily: 'inherit', fontWeight: 800, whiteSpace: 'nowrap' }}>הועתק</span>
      )}
    </button>
  );
}