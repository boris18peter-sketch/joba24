/**
 * SectionCard — the one card every step of the publish form sits in.
 *
 * It lives in its own file because the form's sections were being extracted
 * one at a time; a card style copied into each of them would drift apart.
 */
export default function SectionCard({ children }) {
  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 20, padding: '18px 16px', border: '1px solid var(--border-1)', boxShadow: '0 2px 12px rgba(26,111,212,0.06)' }}>
      {children}
    </div>
  );
}