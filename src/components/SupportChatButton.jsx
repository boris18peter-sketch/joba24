import { Link } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function SupportChatButton() {
  const { user: me, isAuthenticated } = useAuth();
  if (!isAuthenticated || !me || me.role === 'admin') return null;

  return (
    <Link
      to="/support"
      style={{
        position: 'fixed',
        top: 54,
        left: 10,
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 12px',
        borderRadius: 99,
        background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
        color: 'white',
        fontSize: 12,
        fontWeight: 800,
        border: '2px solid white',
        boxShadow: '0 4px 16px rgba(26,111,212,0.4)',
        textDecoration: 'none',
        minHeight: 'unset',
        minWidth: 'unset',
      }}
    >
      <Headphones size={14} />
      תמיכה
    </Link>
  );
}