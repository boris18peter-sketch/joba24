import { useEffect, useState } from 'react';
import { resolveFileUrl } from '@/lib/privateFile';

/**
 * PrivateImage — renders an image stored either privately (a `file_uri`) or
 * publicly (a legacy https URL).
 *
 * A private uri is signed first and the picture appears once the signature
 * arrives; until then the box keeps its own background, so nothing jumps. The
 * resolved URL is handed to `onOpen` so a lightbox opens the signed picture and
 * not the unusable uri.
 */
export default function PrivateImage({ value, alt = '', style, onClick, onOpen }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    setUrl('');
    resolveFileUrl(value).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [value]);

  return (
    <img
      src={url || undefined}
      alt={alt}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(url); } : undefined}
      style={{ ...style, opacity: url ? 1 : 0, transition: 'opacity 0.15s' }}
    />
  );
}