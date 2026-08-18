import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';

/**
 * CopyableId — displays an entity ID (or any string) with a one-tap copy button.
 * Used in the admin dashboard so user/task IDs can be copied for support/debug.
 */
export default function CopyableId({ id, label = 'ID', fontSize = 10, color = '#cbd5e1' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!id) return;
    copyToClipboard(id).then((ok) => {
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize, color }}>
      <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{label}: {id}</span>
      <button
        onClick={handleCopy}
        title="העתק"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', color: copied ? '#16a34a' : color,
          minHeight: 'unset', minWidth: 'unset',
        }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}