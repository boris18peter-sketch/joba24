/**
 * Lightweight message skeleton — keeps the chat shell, header and composer
 * perfectly stable while a conversation loads. No full-screen spinner.
 */
export default function ChatSkeleton() {
  const rows = [
    { me: false, w: '52%' },
    { me: false, w: '38%' },
    { me: true, w: '46%' },
    { me: false, w: '64%' },
    { me: true, w: '34%' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            alignSelf: r.me ? 'flex-end' : 'flex-start',
            width: r.w,
            height: r.w === '64%' ? 56 : 38,
            borderRadius: r.me ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
            background: 'var(--surface-3)',
            opacity: 0.9 - i * 0.14,
          }}
        />
      ))}
    </div>
  );
}