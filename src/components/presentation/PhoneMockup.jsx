/**
 * PhoneMockup — displays a screenshot inside a phone-style frame.
 */
export default function PhoneMockup({ src, label, width = 150 }) {
  return (
    <div style={{
      width, borderRadius: 18, overflow: 'hidden',
      border: '2.5px solid rgba(255,255,255,0.12)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      background: '#000', flexShrink: 0,
    }}>
      <img src={src} alt={label || ''} style={{ width: '100%', display: 'block' }} />
    </div>
  );
}