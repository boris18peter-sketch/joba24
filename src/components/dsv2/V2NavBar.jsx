import { Home, Map, Plus, MessageCircle, User } from 'lucide-react';

/**
 * Design System V2 — bottom navigation.
 * Quiet by default. The centre action earns its weight from size, placement and
 * colour alone — no glow, no gradient, no shadow bloom.
 */
export default function V2NavBar({ active = 'home' }) {
  const items = [
    { key: 'home', icon: Home, label: 'משימות' },
    { key: 'map', icon: Map, label: 'מפה' },
    { key: 'chats', icon: MessageCircle, label: 'צ׳אטים' },
    { key: 'profile', icon: User, label: 'פרופיל' },
  ];

  const renderItem = (item) => {
    const Icon = item.icon;
    const on = active === item.key;
    return (
      <div key={item.key} className={`v2-nav-item${on ? ' on' : ''}`}>
        <Icon size={21} strokeWidth={on ? 2.2 : 1.8} />
        <span>{item.label}</span>
      </div>
    );
  };

  return (
    <div className="v2-nav" dir="rtl">
      {renderItem(items[0])}
      {renderItem(items[1])}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -20 }}>
        <div className="v2-fab">
          <Plus size={24} color="#fff" strokeWidth={2.4} />
        </div>
      </div>
      {renderItem(items[2])}
      {renderItem(items[3])}
    </div>
  );
}