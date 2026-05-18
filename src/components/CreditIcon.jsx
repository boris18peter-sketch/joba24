// אייקון מטבע קרדיט — מטבע כחול עם 'J' צהוב
export default function CreditIcon({ size = 16, style = {} }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
        border: '1.5px solid #fbbf24',
        color: '#fbbf24',
        fontWeight: 900,
        fontSize: size * 0.55,
        fontFamily: "'Inter', sans-serif",
        flexShrink: 0,
        lineHeight: 1,
        boxShadow: '0 1px 4px rgba(26,111,212,0.25)',
        ...style,
      }}
    >
      J
    </span>
  );
}