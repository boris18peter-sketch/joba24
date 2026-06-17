import { Link, useLocation } from 'react-router-dom';
import { X, Home, Map, Plus, User, Trophy, Target, MessageCircle, Bell, ShieldCheck, TrendingUp, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useEffect } from 'react';
import LoginPromptModal from '@/components/LoginPromptModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/lib/LanguageContext';
import { requestNotificationPermission } from '@/lib/fcm';


// navItems built inside component using t()


export default function SideMenu({ open, onClose }) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const { t } = useLanguage();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const navItems = [
    { to: '/', icon: Home, label: t('nav_feed') },
    { to: '/map', icon: Map, label: t('nav_map') },
    { to: '/chats', icon: MessageCircle, label: t('nav_chats') },
    { to: '/notifications', icon: Bell, label: t('nav_notifications') },
    { to: '/daily-goal', icon: Target, label: t('nav_daily_goal') },
    { to: '/leaderboard', icon: Trophy, label: t('nav_leaderboard') },
  ];

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated
  });

  // Check permissions on mount
  useEffect(() => {
    const isLocEnabled = localStorage.getItem('joba24_location_enabled') === '1';
    setLocationEnabled(isLocEnabled);

    if (typeof Notification !== 'undefined') {
      const isNotifEnabled = Notification.permission === 'granted';
      setNotificationsEnabled(isNotifEnabled);
    }
  }, []);

  const handleLocationToggle = async () => {
    if (locationEnabled) {
      localStorage.removeItem('joba24_location_enabled');
      setLocationEnabled(false);
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            localStorage.setItem('joba24_location_enabled', '1');
            setLocationEnabled(true);
          },
          () => {
            alert(t('location_permission_denied'));
          }
        );
      }
    }
  };

  const handleNotificationsToggle = async () => {
    if (notificationsEnabled) {
      // User wants to disable — we can't truly disable, but can clear flag
      localStorage.setItem('joba24_notif_disabled', '1');
      setNotificationsEnabled(false);
    } else {
      const perm = await requestNotificationPermission();
      if (perm === 'granted') {
        localStorage.removeItem('joba24_notif_disabled');
        setNotificationsEnabled(true);
      }
    }
  };

  return (
    <>
      {open &&
      <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 10001, backdropFilter: 'blur(2px)' }} />

      }

      <div
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 270,
          background: 'linear-gradient(180deg, #0a1f4e 0%, #0f2b6b 40%, #1a3a80 100%)',
          zIndex: 10002,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '6px 0 32px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column'
        }}>
        
        {/* Header */}
        <div style={{
          padding: '52px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <img src="https://media.base44.com/images/public/69e6bdb4986a04a256653a23/d5824a161_IMG_0357.jpg" alt="Joba24" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8 }} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: 'white', letterSpacing: -0.5 }}>Joba<span style={{ color: '#fbbf24' }}>24</span></div>
              <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 500, marginTop: 1 }}>{t('nav_subtitle')}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="#93c5fd" />
          </button>
        </div>

        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {/* Profile / Login at top */}
          {isAuthenticated ?
          <Link to="/profile" onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
            background: location.pathname === '/profile' ? 'rgba(96,165,250,0.15)' : 'transparent',
            color: location.pathname === '/profile' ? '#60a5fa' : '#bfdbfe',
            fontWeight: location.pathname === '/profile' ? 700 : 500, fontSize: 15,
            textDecoration: 'none',
            borderLeft: location.pathname === '/profile' ? '3px solid #60a5fa' : '3px solid transparent',
            transition: 'all 0.15s'
          }}>
            
              <User size={18} style={{ opacity: location.pathname === '/profile' ? 1 : 0.7 }} />
              {t('nav_profile')}
            </Link> :

          <button
            onClick={() => {setShowLogin(true);onClose();}}
            style={{
              width: 'calc(100% - 24px)',
              margin: '8px 12px',
              padding: '13px 16px',
              background: '#fbbf24',
              color: '#0a1f5c',
              border: 'none',
              borderRadius: 14,
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}>
            
              <User size={16} />
              {t('login_now')}
            </button>
          }

          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
                background: active ? 'rgba(96,165,250,0.15)' : 'transparent',
                color: active ? '#60a5fa' : '#bfdbfe',
                fontWeight: active ? 700 : 500, fontSize: 15,
                textDecoration: 'none',
                borderLeft: active ? '3px solid #60a5fa' : '3px solid transparent',
                transition: 'all 0.15s'
              }}>
                
                <Icon size={18} style={{ opacity: active ? 1 : 0.7 }} />
                {label}
              </Link>);

          })}
          {/* Admin link — shown only to admins */}
          {isAuthenticated && me?.role === 'admin' &&
          <Link to="/admin" onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
            background: location.pathname === '/admin' ? 'rgba(251,191,36,0.15)' : 'transparent',
            color: '#fbbf24',
            fontWeight: 700, fontSize: 15, textDecoration: 'none',
            borderLeft: location.pathname === '/admin' ? '3px solid #fbbf24' : '3px solid transparent',
            opacity: 0.85
          }}>
              <ShieldCheck size={18} />
              {t('nav_admin')}
            </Link>
          }
          {/* Agent link — shown only to agents */}
          {isAuthenticated && me?.role === 'agent' &&
          <Link to="/agent-dashboard" onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px',
            background: location.pathname === '/agent-dashboard' ? 'rgba(168,85,247,0.15)' : 'transparent',
            color: '#a855f7',
            fontWeight: 700, fontSize: 15, textDecoration: 'none',
            borderLeft: location.pathname === '/agent-dashboard' ? '3px solid #a855f7' : '3px solid transparent',
          }}>
              <TrendingUp size={18} />
              {t('nav_agent')}
            </Link>
          }
        </nav>
        
        <div style={{ padding: '16px 20px 28px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Toggles for Location & Notifications */}
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Location Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin size={18} color="#60a5fa" />
                <span style={{ fontSize: 13, color: '#bfdbfe', fontWeight: 600 }}>{t('location')}</span>
              </div>
              <button
                onClick={handleLocationToggle}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: 'none',
                  background: locationEnabled ? '#10b981' : '#4b5563',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: 'white',
                    top: 2,
                    left: locationEnabled ? 22 : 2,
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>

            {/* Notifications Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bell size={18} color="#f59e0b" />
                <span style={{ fontSize: 13, color: '#bfdbfe', fontWeight: 600 }}>{t('notifications')}</span>
              </div>
              <button
                onClick={handleNotificationsToggle}
                disabled={typeof Notification === 'undefined'}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: 'none',
                  background: notificationsEnabled ? '#10b981' : '#4b5563',
                  cursor: typeof Notification === 'undefined' ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                  opacity: typeof Notification === 'undefined' ? 0.5 : 1,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: 'white',
                    top: 2,
                    left: notificationsEnabled ? 22 : 2,
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>
          </div>

          {/* Joba24 yellow CTA button — same as AppHeader */}
          <Link
            to="/create-task"
            onClick={() => { onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '13px 16px', borderRadius: 14,
              background: '#fbbf24', color: '#0a1f5c',
              border: 'none', fontWeight: 900, fontSize: 15,
              textDecoration: 'none', marginBottom: 14,
              boxShadow: '0 4px 16px rgba(251,191,36,0.4)'
            }}>
            
            
            {t('nav_create_task')}
          </Link>
          <div style={{ marginBottom: 12 }}>
            <LanguageSwitcher onClose={onClose} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, paddingTop: 2 }}>
            <Link to="/faq" onClick={onClose} style={{ fontSize: 12, color: '#93c5fd', textDecoration: 'none', fontWeight: 600 }}>{t('nav_faq')}</Link>
            <span style={{ color: 'rgba(147,197,253,0.3)', fontSize: 12 }}>|</span>
            <Link to="/terms" onClick={onClose} style={{ fontSize: 12, color: '#93c5fd', textDecoration: 'none', fontWeight: 600 }}>{t('nav_terms')}</Link>
          </div>
        </div>
      </div>
      {showLogin && <LoginPromptModal onClose={() => setShowLogin(false)} />}
    </>);

}