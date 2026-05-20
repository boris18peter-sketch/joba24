import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function AppHeader({ onOpenMenu }) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div
      dir="rtl"
      style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(248,249,252,0.97)',
        borderBottom: '1px solid #eaeef5',
        backdropFilter: 'blur(14px)',
        height: 56,
        display: 'flex', alignItems: 'center',
        paddingRight: 16, paddingLeft: 16,
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      {/* Right: Logo + Joba24 — only on Home */}
      {isHomePage ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <img
            src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg"
            alt="Joba24"
            style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 10 }}
          />
          <span style={{ fontWeight: 900, fontSize: 17, color: '#0f2b6b', letterSpacing: -0.5 }}>
            Joba<span style={{ color: '#fbbf24' }}>24</span>
          </span>
        </div>
      ) : (
        <div />
      )}

      {/* Left: Menu button */}
      <button
        onClick={onOpenMenu}
        style={{
          width: 40, height: 40, borderRadius: 12,
          background: '#1a6fd4', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Menu size={20} color="white" strokeWidth={2.5} />
      </button>
    </div>
  );
}