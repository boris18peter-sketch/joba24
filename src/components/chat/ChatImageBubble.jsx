import { useState } from 'react';
import MediaLightbox from '@/components/MediaLightbox';

/**
 * ChatImageBubble — renders a chat image that opens in an in-app lightbox
 * (MediaLightbox) instead of launching an external browser tab.
 */
export default function ChatImageBubble({ url, isMe, alt = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={url}
        alt={alt}
        style={{
          maxWidth: 220,
          maxHeight: 200,
          borderRadius: 14,
          objectFit: 'cover',
          cursor: 'pointer',
          border: isMe ? 'none' : '1px solid #e2e8f0',
        }}
        onClick={() => setOpen(true)}
      />
      <MediaLightbox
        isOpen={open}
        items={[{ url, type: 'img' }]}
        onClose={() => setOpen(false)}
      />
    </>
  );
}